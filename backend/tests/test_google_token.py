"""POST /auth/google/token: native Google Sign-In id_token verification.

Fully offline: the db is the in-memory stub and google-auth's verifier is
monkeypatched, so no network and no real Google keys are involved.
"""
from __future__ import annotations

import asyncio

import pytest
from fastapi.testclient import TestClient

import server as srv
from tests._memstub import MemDb

WEB_ID = "web-client.apps.googleusercontent.com"
IOS_ID = "ios-client.apps.googleusercontent.com"


def _run(coro):
    return asyncio.get_event_loop_policy().new_event_loop().run_until_complete(coro)


def _claims(**over):
    base = {
        "iss": "https://accounts.google.com",
        "aud": WEB_ID,
        "sub": "google-sub-123",
        "email": "Priya@Example.com",
        "email_verified": True,
        "name": "Priya",
        "picture": "https://lh3.example/p.jpg",
    }
    base.update(over)
    return base


@pytest.fixture()
def db(monkeypatch):
    stub = MemDb()
    monkeypatch.setattr(srv, "db", stub)
    return stub


@pytest.fixture()
def client(db, monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", WEB_ID)
    monkeypatch.setenv("GOOGLE_IOS_CLIENT_ID", IOS_ID)
    monkeypatch.setenv("JWT_SECRET", "test-secret")
    return TestClient(srv.app)


def _stub_verifier(monkeypatch, claims):
    import google.oauth2.id_token as gid

    def fake_verify(token, request, audience=None, **kw):
        assert token == "tok"
        return claims

    monkeypatch.setattr(gid, "verify_oauth2_token", fake_verify)


def _post(client, token="tok"):
    return client.post("/api/auth/google/token", json={"id_token": token})


class TestNotConfigured:
    def test_503_when_client_id_missing(self, db, monkeypatch):
        monkeypatch.delenv("GOOGLE_CLIENT_ID", raising=False)
        monkeypatch.delenv("GOOGLE_IOS_CLIENT_ID", raising=False)
        r = TestClient(srv.app).post("/api/auth/google/token", json={"id_token": "tok"})
        assert r.status_code == 503
        assert r.json()["detail"] == "Google sign-in is not configured."


class TestVerification:
    def test_success_creates_google_user(self, client, db, monkeypatch):
        _stub_verifier(monkeypatch, _claims())
        r = _post(client)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["access_token"]
        assert body["user"]["email"] == "priya@example.com"
        doc = _run(db.users.find_one({"email": "priya@example.com"}))
        assert doc["auth_provider"] == "google"
        assert doc["google_sub"] == "google-sub-123"
        assert doc["google_picture"] == "https://lh3.example/p.jpg"
        assert doc.get("hashed_password") is None

    def test_ios_audience_accepted(self, client, monkeypatch):
        _stub_verifier(monkeypatch, _claims(aud=IOS_ID))
        assert _post(client).status_code == 200

    def test_bad_audience_is_401(self, client, db, monkeypatch):
        _stub_verifier(monkeypatch, _claims(aud="someone-else.apps.googleusercontent.com"))
        r = _post(client)
        assert r.status_code == 401
        assert r.json()["detail"] == "Sign-in failed. Try again."
        assert _run(db.users.find_one({"email": "priya@example.com"})) is None

    def test_bad_issuer_is_401(self, client, monkeypatch):
        _stub_verifier(monkeypatch, _claims(iss="https://evil.example"))
        assert _post(client).status_code == 401

    def test_unverified_email_is_401(self, client, db, monkeypatch):
        _stub_verifier(monkeypatch, _claims(email_verified=False))
        assert _post(client).status_code == 401
        assert _run(db.users.find_one({"email": "priya@example.com"})) is None

    def test_verifier_exception_is_401_with_generic_detail(self, client, monkeypatch):
        import google.oauth2.id_token as gid

        def boom(*a, **k):
            raise ValueError("Token expired, 1699999999 < 1700000000")

        monkeypatch.setattr(gid, "verify_oauth2_token", boom)
        r = _post(client)
        assert r.status_code == 401
        assert "expired" not in r.json()["detail"].lower()

    def test_empty_token_is_422(self, client):
        assert _post(client, token="").status_code == 422


class TestUpsertMatchesCodeFlow:
    def test_existing_password_user_becomes_both(self, client, db, monkeypatch):
        _run(
            srv._create_user_doc(
                name="Priya",
                email="priya@example.com",
                hashed_password="x",
                auth_provider="password",
            )
        )
        _stub_verifier(monkeypatch, _claims())
        r = _post(client)
        assert r.status_code == 200
        doc = _run(db.users.find_one({"email": "priya@example.com"}))
        assert doc["auth_provider"] == "both"
        assert doc["google_sub"] == "google-sub-123"
        assert doc["hashed_password"] == "x"
        assert _run(db.users.count_documents({})) == 1

    def test_matches_by_google_sub_before_email(self, client, db, monkeypatch):
        _run(
            srv._create_user_doc(
                name="Priya",
                email="old@example.com",
                google_sub="google-sub-123",
                auth_provider="google",
            )
        )
        _stub_verifier(monkeypatch, _claims(email="new@example.com"))
        r = _post(client)
        assert r.status_code == 200
        # Same account, email on our side is never overwritten.
        assert r.json()["user"]["email"] == "old@example.com"
        assert _run(db.users.count_documents({})) == 1

    def test_both_routes_share_the_finish_helper(self):
        import inspect

        assert "_finish_google_login(info)" in inspect.getsource(srv.google_code_exchange)
        assert "_finish_google_login(info)" in inspect.getsource(srv.google_token_exchange)
