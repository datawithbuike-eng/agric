"""
AquaVest investor portal — email layer.

No real SMTP is configured yet, so every "email" is written to the
EmailLog table (visible on the admin/investor Notifications panel) and
printed to the console — exactly like the localStorage prototype's mock
email.js, so the notification flow can be tested end to end.

TO SEND REAL EMAIL: set these environment variables and flip
USE_REAL_SMTP to True below, or swap the body of send_email() for a
call to a transactional provider (Postmark, SendGrid, etc). Every
call site already passes the same (to, subject, body) shape either
approach needs — nothing else in the app has to change.

    SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_ADDRESS
"""
import os
import smtplib
from email.message import EmailMessage

from models import EmailLog, db

USE_REAL_SMTP = False  # flip to True once the SMTP_* env vars below are set


def send_email(to, subject, body):
    db.session.add(EmailLog(to=to, subject=subject, body=body))
    db.session.commit()
    print(f"[AquaVest mock email] to={to} subject={subject}")

    if USE_REAL_SMTP:
        _send_via_smtp(to, subject, body)


def _send_via_smtp(to, subject, body):
    host = os.environ.get("SMTP_HOST")
    port = int(os.environ.get("SMTP_PORT", "587"))
    username = os.environ.get("SMTP_USERNAME")
    password = os.environ.get("SMTP_PASSWORD")
    from_addr = os.environ.get("SMTP_FROM_ADDRESS", username)

    if not host or not username or not password:
        print("[AquaVest email] USE_REAL_SMTP is True but SMTP_* env vars are missing — skipping real send.")
        return

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to
    msg.set_content(body)

    with smtplib.SMTP(host, port) as server:
        server.starttls()
        server.login(username, password)
        server.send_message(msg)
