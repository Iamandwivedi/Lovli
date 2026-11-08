"""
backend/email_service.py — transactional email over Resend's HTTPS API.

One provider, one plain httpx call, no SDK. Two messages live here today, both
for the password reset flow:

- send_password_reset_email: the 6 digit code the user types into the app.
- send_google_account_notice: told to someone who asked to reset the password
  of an account that signs in with Google and has no password at all.

Local development: when RESEND_API_KEY is empty and ENVIRONMENT is not
production, nothing is sent. The reset code is written to the server log with
a [DEV ONLY] prefix so the flow can be exercised end to end. That is the ONLY
place the raw code is ever logged. In production the server refuses to boot
without RESEND_API_KEY (guard lives in server.py next to ALLOW_TEST_LOGIN).

Failures raise. Callers decide what to do with them; the auth routes log and
swallow, because an email problem must never tell a client whether an account
exists.
"""
from __future__ import annotations

import html
import logging
import os

import httpx

logger = logging.getLogger("lovli.email")

RESEND_ENDPOINT = "https://api.resend.com/emails"
RESEND_TIMEOUT_SECONDS = 10.0
DEFAULT_EMAIL_FROM = "Lovli <hello@lovli.in>"

RESET_CODE_SUBJECT = "Your Lovli reset code"
GOOGLE_NOTICE_SUBJECT = "About your Lovli sign in"


def _is_production() -> bool:
    return (os.environ.get("ENVIRONMENT", "development") or "").strip().lower() == "production"


def _api_key() -> str:
    return (os.environ.get("RESEND_API_KEY") or "").strip()


def _email_from() -> str:
    return (os.environ.get("EMAIL_FROM") or "").strip() or DEFAULT_EMAIL_FROM


def _dev_mode() -> bool:
    """True when sending is skipped in favour of a log line (local dev only)."""
    return not _api_key() and not _is_production()


def _greeting_name(name: str | None) -> str:
    cleaned = (name or "").strip()
    return cleaned or "there"


def _as_html(paragraphs: list[str]) -> str:
    """Minimal HTML: the same words as the text body, one <p> per paragraph."""
    body = "".join(f"<p>{html.escape(p)}</p>" for p in paragraphs)
    return (
        "<!doctype html><html><body style=\"font-family:-apple-system,Helvetica,Arial,sans-serif;"
        "font-size:16px;line-height:1.5;color:#1b1b1f\">"
        f"{body}</body></html>"
    )


async def _deliver(to_email: str, subject: str, paragraphs: list[str]) -> None:
    payload = {
        "from": _email_from(),
        "to": [to_email],
        "subject": subject,
        "text": "\n\n".join(paragraphs),
        "html": _as_html(paragraphs),
    }
    headers = {"Authorization": f"Bearer {_api_key()}"}
    async with httpx.AsyncClient(timeout=RESEND_TIMEOUT_SECONDS) as client:
        response = await client.post(RESEND_ENDPOINT, json=payload, headers=headers)
        response.raise_for_status()
    logger.info("email sent | subject=%r", subject)


async def send_password_reset_email(to_email: str, name: str, code: str) -> None:
    """Email the 6 digit reset code. Raises on any delivery failure."""
    paragraphs = [
        f"Hi {_greeting_name(name)},",
        f"Here is your code to reset your Lovli password: {code}",
        "It works for 15 minutes. If you did not ask for this, ignore this email "
        "and your password stays the same.",
        "Lovli",
    ]
    if _dev_mode():
        # The one and only place the raw code may appear in a log.
        logger.info("[DEV ONLY] password reset code for %s is %s", to_email, code)
        return
    await _deliver(to_email, RESET_CODE_SUBJECT, paragraphs)


async def send_google_account_notice(to_email: str, name: str) -> None:
    """Tell a Google only account holder there is no password to reset."""
    paragraphs = [
        f"Hi {_greeting_name(name)},",
        "Someone asked me to reset the password for this email. This email signs "
        "in to Lovli with Google, so there is no password to reset. Open the app "
        "and tap Continue with Google.",
        "If that was not you, you can ignore this email. Nothing about your "
        "account has changed.",
        "Lovli",
    ]
    if _dev_mode():
        logger.info("[DEV ONLY] google account notice would go to %s", to_email)
        return
    await _deliver(to_email, GOOGLE_NOTICE_SUBJECT, paragraphs)
