"""POST /auth/forgot-password and POST /auth/reset-password.

Fully offline: the db is the in-memory stub and both email senders are
monkeypatched, so no Resend call and no real mail is involved.
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

import email_service
import server as srv
from auth import verify_password
from tests._memstub import MemDb

EMAIL = "priya@example.com"
GOOGLE_EMAIL = "gauri@example.com"
SECRET = "test-secret"


def _run(coro):
    return asyncio.get_event_loop_policy().new_event_loop().run_until_complete(coro)


class _Mailbox:
    """Captures what the routes hand to the email senders."""

    def __init__(self):
        self.reset_calls: list[tuple[str, str, str]] = []
        self.notice_calls: list[tuple[str, str]] = []

    async def reset(self, to_email, name, code):
        self.reset_calls.append((to_email, name, code))

    async def notice(self, to_email, name):
        self.notice_calls.append((to_email, name))

    @property
    def last_code(self) -> str:
        return self.reset_calls[-1][2]


@pytest.fixture()
def db(monkeypatch):
    stub = MemDb()
    monkeypatch.setattr(srv, "db", stub)
    _run(
        srv._create_user_doc(
            name="Priya",
            email=EMAIL,
            hashed_password=srv.hash_password("old-password"),
            auth_provider="password",
        )
    )
    _run(
        srv._create_user_doc(
            name="Gauri",
            email=GOOGLE_EMAIL,
            google_sub="google-sub-1",
            auth_provider="google",
        )
    )
    return stub


@pytest.fixture()
def mailbox(monkeypatch):
    box = _Mailbox()
    monkeypatch.setattr(srv, "send_password_reset_email", box.reset)
    monkeypatch.setattr(srv, "send_google_account_notice", box.notice)
    return box


@pytest.fixture()
def client(db, mailbox, monkeypatch):
    monkeypatch.setenv("JWT_SECRET", SECRET)
    monkeypatch.setenv("ENVIRONMENT", "development")
    return TestClient(srv.app)


def _forgot(client, email=EMAIL):
    return client.post("/api/auth/forgot-password", json={"email": email})


def _reset(client, code, new_password="brand-new-pass", email=EMAIL):
    return client.post(
        "/api/auth/reset-password",
        json={"email": email, "code": code, "new_password": new_password},
    )


def _resets(db):
    return db.password_resets.docs


def _backdate(doc: dict, seconds: int) -> None:
    """Move a reset document into the past as if it were issued earlier."""
    then = datetime.now(timezone.utc) - timedelta(seconds=seconds)
    doc["created_at"] = then.isoformat()
    doc["expires_at"] = then + timedelta(minutes=srv.RESET_CODE_TTL_MINUTES)


class TestForgotPassword:
    def test_unknown_email_is_ok_and_inserts_nothing(self, client, db, mailbox):
        r = _forgot(client, "nobody@example.com")
        assert r.status_code == 200
        assert r.json() == {"ok": True}
        assert _resets(db) == []
        assert mailbox.reset_calls == [] and mailbox.notice_calls == []

    def test_password_user_gets_one_hashed_document_and_an_email(self, client, db, mailbox):
        r = _forgot(client)
        assert r.status_code == 200 and r.json() == {"ok": True}

        assert len(mailbox.reset_calls) == 1
        to_email, name, code = mailbox.reset_calls[0]
        assert to_email == EMAIL and name == "Priya"
        assert len(code) == 6 and code.isdigit()

        docs = _resets(db)
        assert len(docs) == 1
        doc = docs[0]
        expected = hashlib.sha256((code + SECRET).encode()).hexdigest()
        assert doc["code_hash"] == expected
        assert code not in str({k: v for k, v in doc.items() if k != "code_hash"})
        assert doc["email"] == EMAIL
        assert doc["kind"] == "code"
        assert doc["used"] is False and doc["attempts"] == 0
        assert isinstance(doc["expires_at"], datetime)
        ttl = doc["expires_at"] - datetime.fromisoformat(doc["created_at"])
        assert ttl == timedelta(minutes=15)
        assert mailbox.notice_calls == []

    def test_mixed_case_email_is_lower_cased(self, client, db, mailbox):
        assert _forgot(client, "Priya@Example.com").status_code == 200
        assert _resets(db)[0]["email"] == EMAIL
        assert mailbox.reset_calls[0][0] == EMAIL

    def test_google_only_user_gets_notice_and_a_marker_document(self, client, db, mailbox):
        r = _forgot(client, GOOGLE_EMAIL)
        assert r.status_code == 200 and r.json() == {"ok": True}
        assert mailbox.notice_calls == [(GOOGLE_EMAIL, "Gauri")]
        assert mailbox.reset_calls == []
        docs = _resets(db)
        assert len(docs) == 1
        marker = docs[0]
        assert marker["kind"] == "google_notice"
        assert marker["used"] is True
        assert "code_hash" not in marker
        assert marker["email"] == GOOGLE_EMAIL
        assert isinstance(marker["expires_at"], datetime)

    def test_google_notice_is_rate_limited_like_a_code(self, client, db, mailbox):
        _forgot(client, GOOGLE_EMAIL)
        _forgot(client, GOOGLE_EMAIL)  # within 60 seconds: nothing happens
        assert len(mailbox.notice_calls) == 1
        assert len(_resets(db)) == 1
        for i in range(2):
            _backdate(_resets(db)[-1], seconds=(2 - i) * 300)
            _forgot(client, GOOGLE_EMAIL)
        assert len(mailbox.notice_calls) == 3
        assert len(_resets(db)) == 3
        _backdate(_resets(db)[-1], seconds=120)
        _forgot(client, GOOGLE_EMAIL)  # fourth in the hour: nothing happens
        assert len(mailbox.notice_calls) == 3
        assert len(_resets(db)) == 3

    def test_marker_document_cannot_be_redeemed(self, client, db, mailbox):
        _forgot(client, GOOGLE_EMAIL)
        r = _reset(client, "123456", email=GOOGLE_EMAIL)
        assert r.status_code == 400
        assert r.json()["detail"] == srv.RESET_CODE_REJECTED
        assert _resets(db)[0]["attempts"] == 0

    def test_second_request_within_60_seconds_inserts_nothing(self, client, db, mailbox):
        _forgot(client)
        r = _forgot(client)
        assert r.status_code == 200 and r.json() == {"ok": True}
        assert len(_resets(db)) == 1
        assert len(mailbox.reset_calls) == 1

    def test_fourth_request_within_an_hour_inserts_nothing(self, client, db, mailbox):
        for i in range(3):
            _forgot(client)
            # Space the three out so the 60 second gap rule is not what stops us.
            _backdate(_resets(db)[-1], seconds=(3 - i) * 300)
        assert len(_resets(db)) == 3
        r = _forgot(client)
        assert r.status_code == 200 and r.json() == {"ok": True}
        assert len(_resets(db)) == 3
        assert len(mailbox.reset_calls) == 3

    def test_requests_older_than_an_hour_do_not_count(self, client, db, mailbox):
        for _ in range(3):
            _forgot(client)
            _backdate(_resets(db)[-1], seconds=2 * 3600)
        _forgot(client)
        assert len(_resets(db)) == 4

    def test_new_code_burns_earlier_unused_codes(self, client, db, mailbox):
        _forgot(client)
        _backdate(_resets(db)[0], seconds=120)
        _forgot(client)
        docs = _resets(db)
        assert len(docs) == 2
        assert docs[0]["used"] is True
        assert docs[1]["used"] is False

    def test_email_failure_is_swallowed(self, client, db, monkeypatch):
        async def boom(*a, **k):
            raise RuntimeError("resend is down")

        monkeypatch.setattr(srv, "send_password_reset_email", boom)
        r = _forgot(client)
        assert r.status_code == 200 and r.json() == {"ok": True}
        assert len(_resets(db)) == 1

    def test_route_never_logs_the_raw_code(self, client, db, mailbox, caplog):
        with caplog.at_level(logging.DEBUG):
            _forgot(client)
        assert mailbox.last_code not in caplog.text


class TestResetPassword:
    def test_right_code_sets_password_and_signs_in(self, client, db, mailbox):
        _forgot(client)
        code = mailbox.last_code
        r = _reset(client, code, "brand-new-pass")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["access_token"]
        assert body["token_type"] == "bearer"
        assert body["user"]["email"] == EMAIL
        assert "hashed_password" not in body["user"]

        user = _run(db.users.find_one({"email": EMAIL}))
        assert verify_password("brand-new-pass", user["hashed_password"])
        assert not verify_password("old-password", user["hashed_password"])
        assert user["last_login_at"]

        doc = _resets(db)[0]
        assert doc["used"] is True
        assert doc["attempts"] == 1

    def test_used_code_cannot_be_replayed(self, client, db, mailbox):
        _forgot(client)
        code = mailbox.last_code
        assert _reset(client, code).status_code == 200
        r = _reset(client, code, "another-pass")
        assert r.status_code == 400
        assert r.json()["detail"] == srv.RESET_CODE_REJECTED

    def test_wrong_code_is_400_with_the_single_message(self, client, db, mailbox):
        _forgot(client)
        wrong = "000000" if mailbox.last_code != "000000" else "111111"
        r = _reset(client, wrong)
        assert r.status_code == 400
        assert r.json()["detail"] == srv.RESET_CODE_REJECTED
        assert _resets(db)[0]["attempts"] == 1
        assert _resets(db)[0]["used"] is False

    def test_five_wrong_tries_burn_the_code(self, client, db, mailbox):
        _forgot(client)
        code = mailbox.last_code
        wrong = "000000" if code != "000000" else "111111"
        for _ in range(5):
            assert _reset(client, wrong).status_code == 400
        assert _resets(db)[0]["attempts"] == 5
        # Sixth attempt with the RIGHT code still fails, and the code is marked used.
        r = _reset(client, code)
        assert r.status_code == 400
        assert r.json()["detail"] == srv.RESET_CODE_REJECTED
        assert _resets(db)[0]["used"] is True
        user = _run(db.users.find_one({"email": EMAIL}))
        assert verify_password("old-password", user["hashed_password"])

    def test_expired_code_fails_and_is_marked_used(self, client, db, mailbox):
        _forgot(client)
        code = mailbox.last_code
        _resets(db)[0]["expires_at"] = datetime.now(timezone.utc) - timedelta(seconds=1)
        r = _reset(client, code)
        assert r.status_code == 400
        assert r.json()["detail"] == srv.RESET_CODE_REJECTED
        assert _resets(db)[0]["used"] is True

    def test_naive_bson_date_from_mongo_is_handled(self, client, db, mailbox):
        """Motor returns naive UTC datetimes; the route must not crash on them."""
        _forgot(client)
        code = mailbox.last_code
        doc = _resets(db)[0]
        doc["expires_at"] = doc["expires_at"].replace(tzinfo=None)
        assert _reset(client, code).status_code == 200

    def test_no_code_requested_is_400(self, client):
        r = _reset(client, "123456")
        assert r.status_code == 400
        assert r.json()["detail"] == srv.RESET_CODE_REJECTED

    def test_code_for_another_email_does_not_work(self, client, db, mailbox):
        _forgot(client)
        r = _reset(client, mailbox.last_code, email="nobody@example.com")
        assert r.status_code == 400

    @pytest.mark.parametrize("code", ["12345", "1234567", "12345a", "abcdef", ""])
    def test_malformed_code_is_422(self, client, code):
        assert _reset(client, code).status_code == 422

    @pytest.mark.parametrize("password", ["short", "x" * 129])
    def test_password_rule_matches_signup(self, client, password):
        assert _reset(client, "123456", password).status_code == 422


class TestEmailService:
    def test_dev_mode_logs_code_and_skips_resend(self, monkeypatch, caplog):
        monkeypatch.delenv("RESEND_API_KEY", raising=False)
        monkeypatch.setenv("ENVIRONMENT", "development")

        def no_http(*a, **k):
            raise AssertionError("Resend must not be called in dev mode")

        monkeypatch.setattr(email_service.httpx, "AsyncClient", no_http)
        with caplog.at_level(logging.INFO, logger="lovli.email"):
            _run(email_service.send_password_reset_email("x@example.com", "X", "424242"))
        assert "[DEV ONLY]" in caplog.text
        assert "424242" in caplog.text

    def test_with_api_key_posts_to_resend_and_never_logs_the_code(self, monkeypatch, caplog):
        monkeypatch.setenv("RESEND_API_KEY", "re_test")
        monkeypatch.setenv("ENVIRONMENT", "development")
        monkeypatch.delenv("EMAIL_FROM", raising=False)
        sent: dict = {}

        class _Resp:
            def raise_for_status(self):
                pass

        class _Client:
            def __init__(self, timeout):
                sent["timeout"] = timeout

            async def __aenter__(self):
                return self

            async def __aexit__(self, *a):
                return False

            async def post(self, url, json, headers):
                sent.update(url=url, json=json, headers=headers)
                return _Resp()

        monkeypatch.setattr(email_service.httpx, "AsyncClient", _Client)
        with caplog.at_level(logging.DEBUG):
            _run(email_service.send_password_reset_email("x@example.com", "Priya", "424242"))

        assert sent["url"] == "https://api.resend.com/emails"
        assert sent["timeout"] == 10.0
        assert sent["headers"] == {"Authorization": "Bearer re_test"}
        body = sent["json"]
        assert body["from"] == "Lovli <hello@lovli.in>"
        assert body["to"] == ["x@example.com"]
        assert body["subject"] == "Your Lovli reset code"
        assert "424242" in body["text"] and "424242" in body["html"]
        assert "Hi Priya," in body["text"]
        assert "15 minutes" in body["text"]
        for dash in ("—", "–", " - "):
            assert dash not in body["text"]
        assert "424242" not in caplog.text

    def test_google_notice_copy(self, monkeypatch):
        monkeypatch.setenv("RESEND_API_KEY", "re_test")
        monkeypatch.setenv("ENVIRONMENT", "development")
        sent: dict = {}

        class _Resp:
            def raise_for_status(self):
                pass

        class _Client:
            def __init__(self, timeout):
                pass

            async def __aenter__(self):
                return self

            async def __aexit__(self, *a):
                return False

            async def post(self, url, json, headers):
                sent.update(json=json)
                return _Resp()

        monkeypatch.setattr(email_service.httpx, "AsyncClient", _Client)
        _run(email_service.send_google_account_notice("x@example.com", ""))
        body = sent["json"]
        assert body["subject"] == "About your Lovli sign in"
        assert "Hi there," in body["text"]
        assert "Continue with Google" in body["text"]
        assert "no password to reset" in body["text"]

    def test_resend_failure_raises_for_the_caller(self, monkeypatch):
        monkeypatch.setenv("RESEND_API_KEY", "re_test")
        monkeypatch.setenv("ENVIRONMENT", "development")

        class _Client:
            def __init__(self, timeout):
                pass

            async def __aenter__(self):
                return self

            async def __aexit__(self, *a):
                return False

            async def post(self, *a, **k):
                raise email_service.httpx.ConnectError("boom")

        monkeypatch.setattr(email_service.httpx, "AsyncClient", _Client)
        with pytest.raises(Exception):
            _run(email_service.send_password_reset_email("x@example.com", "X", "424242"))


class TestBootGuard:
    def test_production_without_resend_key_refuses_to_boot(self):
        """Run in a subprocess so the failed import cannot disturb this session."""
        import os
        import subprocess
        import sys

        env = {
            **os.environ,
            "ENVIRONMENT": "production",
            "RESEND_API_KEY": "",
            "ALLOW_TEST_LOGIN": "",
            "MONGO_URL": "mongodb://localhost:27017",
        }
        proc = subprocess.run(
            [sys.executable, "-c", "import server"],
            cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            env=env,
            capture_output=True,
            text=True,
        )
        assert proc.returncode != 0
        assert "RESEND_API_KEY is required when ENVIRONMENT=production" in proc.stderr

    def test_production_with_resend_key_boots(self):
        import os
        import subprocess
        import sys

        env = {
            **os.environ,
            "ENVIRONMENT": "production",
            "RESEND_API_KEY": "re_test",
            "ALLOW_TEST_LOGIN": "",
            "MONGO_URL": "mongodb://localhost:27017",
        }
        proc = subprocess.run(
            [sys.executable, "-c", "import server"],
            cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            env=env,
            capture_output=True,
            text=True,
        )
        assert proc.returncode == 0, proc.stderr
