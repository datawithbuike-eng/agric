"""
AquaVest investor portal — database models.

This replaces the browser-localStorage prototype (assets/dashboard/store.js
in the static site) with a real server-side database. The shape mirrors
that prototype closely on purpose, so the approval workflow (deposits held
until an admin approves them; withdrawals/investments reserved out of cash
on request and refunded on rejection) behaves identically.
"""
from datetime import datetime, timezone

from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash

db = SQLAlchemy()

FUNDS = {
    "tilapia": {"label": "Tilapia Farming Shares", "annual_yield": 0.08},
    "seaweed": {"label": "Seaweed Cultivation Shares", "annual_yield": 0.06},
    "shrimp": {"label": "Shrimp & Prawn Farming Shares", "annual_yield": 0.10},
}

# DEMO / NON-FUNCTIONAL addresses — see README.md "Crypto payments" section.
# Replace with real receiving addresses from a real custody/payment
# provider, plus a real way to detect that a payment actually arrived,
# before ever pointing real users at this flow.
CRYPTO_WALLETS = {
    "BTC": {"label": "Bitcoin", "network": "Bitcoin (BTC)", "address": "DEMO-BTC-NOT-A-REAL-ADDRESS-0000000000"},
    "ETH": {"label": "Ethereum", "network": "Ethereum (ERC-20)", "address": "0xDEMO0000NOTAREALETHADDRESS0000000000"},
    "USDT": {"label": "Tether (USDT)", "network": "Ethereum (ERC-20)", "address": "0xDEMO0000NOTAREALUSDTADDRESS000000000"},
    "USDC": {"label": "USD Coin (USDC)", "network": "Ethereum (ERC-20)", "address": "0xDEMO0000NOTAREALUSDCADDRESS000000000"},
}

ADMIN_NOTIFICATION_EMAIL = "admin@aquavest.com"


def now():
    return datetime.now(timezone.utc)


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="investor")  # investor | admin
    status = db.Column(db.String(20), nullable=False, default="active")  # active | suspended
    phone = db.Column(db.String(40), default="")
    cash_balance = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=now)

    investments = db.relationship("Investment", backref="user", lazy="dynamic")
    transactions = db.relationship("Transaction", backref="user", lazy="dynamic")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def is_admin(self):
        return self.role == "admin"


class Investment(db.Model):
    __tablename__ = "investments"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    fund = db.Column(db.String(20), nullable=False)  # key into FUNDS
    amount = db.Column(db.Numeric(14, 2), nullable=False)
    start_date = db.Column(db.DateTime(timezone=True), nullable=False, default=now)
    status = db.Column(db.String(20), nullable=False, default="active")

    def current_value(self):
        fund = FUNDS[self.fund]
        years_held = max(0.0, (now() - self.start_date.replace(tzinfo=timezone.utc)).total_seconds() / (365 * 24 * 3600))
        return float(self.amount) * (1 + fund["annual_yield"] * years_held)


class Transaction(db.Model):
    __tablename__ = "transactions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    type = db.Column(db.String(20), nullable=False)  # deposit | withdrawal | investment_start
    method = db.Column(db.String(20))  # bank | crypto (deposits only)
    crypto = db.Column(db.String(10))  # BTC | ETH | USDT | USDC (crypto deposits only)
    fund = db.Column(db.String(20))  # investment_start only
    amount = db.Column(db.Numeric(14, 2), nullable=False)
    date = db.Column(db.DateTime(timezone=True), nullable=False, default=now)
    status = db.Column(db.String(20), nullable=False, default="pending_approval")
    reviewed_at = db.Column(db.DateTime(timezone=True))
    reviewed_by = db.Column(db.String(255))
    rejection_reason = db.Column(db.String(500))


class EmailLog(db.Model):
    __tablename__ = "email_log"

    id = db.Column(db.Integer, primary_key=True)
    to = db.Column(db.String(255), nullable=False)
    subject = db.Column(db.String(255), nullable=False)
    body = db.Column(db.Text, nullable=False)
    sent_at = db.Column(db.DateTime(timezone=True), nullable=False, default=now)
