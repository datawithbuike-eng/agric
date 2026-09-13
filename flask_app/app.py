"""
AquaVest investor portal — Flask backend.

Real replacement for the static site's localStorage prototype
(assets/dashboard/*.js in the parent site). Same behavior, same
approval workflow, same demo accounts — now backed by a real database
and real server-side session auth instead of client-side JavaScript
anyone could call from the browser console.
"""
import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from functools import wraps

from flask import Flask, abort, flash, redirect, render_template, request, url_for
from flask_login import (
    LoginManager,
    current_user,
    login_required,
    login_user,
    logout_user,
)

from mail import send_email
from models import ADMIN_NOTIFICATION_EMAIL, CRYPTO_WALLETS, FUNDS, EmailLog, Investment, Transaction, User, db, now

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# On Hostinger (or any real host) set these two as real environment
# variables in hPanel's Python App config — never commit real values.
# DATABASE_URL there should be the MySQL database hPanel creates for you,
# e.g. mysql+pymysql://db_user:db_pass@localhost/db_name
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-change-me")
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///" + os.path.join(BASE_DIR, "aquavest.db"))
if DATABASE_URL.startswith("mysql://"):
    DATABASE_URL = DATABASE_URL.replace("mysql://", "mysql+pymysql://", 1)

IS_PRODUCTION = os.environ.get("FLASK_ENV") == "production"
if IS_PRODUCTION and SECRET_KEY == "dev-only-change-me":
    raise RuntimeError("Set a real SECRET_KEY environment variable before running in production.")

app = Flask(__name__)
app.config["SECRET_KEY"] = SECRET_KEY
app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

login_manager = LoginManager(app)
login_manager.login_view = "login"


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated:
            return redirect(url_for("login"))
        if not current_user.is_admin():
            abort(403)
        return fn(*args, **kwargs)
    return wrapper


def investor_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated or current_user.is_admin():
            return redirect(url_for("login"))
        return fn(*args, **kwargs)
    return wrapper


def fmt(amount):
    return f"{Decimal(amount):,.2f}"


app.jinja_env.filters["money"] = fmt


# ---- Portfolio math (simulated — same illustrative yields as the prototype) --

def get_portfolio(user):
    investments = user.investments.filter_by(status="active").all()
    total_invested = sum((float(i.amount) for i in investments), 0.0)
    total_current_value = sum((i.current_value() for i in investments), 0.0)
    by_fund = {}
    for inv in investments:
        entry = by_fund.setdefault(inv.fund, {"fund": inv.fund, "label": FUNDS[inv.fund]["label"], "invested": 0.0, "current_value": 0.0})
        entry["invested"] += float(inv.amount)
        entry["current_value"] += inv.current_value()

    pending = Transaction.query.filter_by(user_id=user.id, status="pending_approval").order_by(Transaction.date.asc()).all()

    total_return = total_current_value - total_invested
    return {
        "cash_balance": float(user.cash_balance),
        "total_invested": total_invested,
        "total_current_value": total_current_value,
        "total_return": total_return,
        "total_return_pct": (total_return / total_invested * 100) if total_invested > 0 else 0.0,
        "holdings": list(by_fund.values()),
        "pending": pending,
    }


def get_growth_series(user):
    investments = user.investments.filter_by(status="active").order_by(Investment.start_date.asc()).all()
    if not investments:
        return []
    earliest = min(i.start_date for i in investments).replace(day=1, tzinfo=timezone.utc)
    points = []
    cursor = earliest
    end = now()
    while cursor <= end:
        value = 0.0
        for inv in investments:
            inv_start = inv.start_date.replace(tzinfo=timezone.utc)
            if inv_start <= cursor:
                years_held = max(0.0, (cursor - inv_start).total_seconds() / (365 * 24 * 3600))
                value += float(inv.amount) * (1 + FUNDS[inv.fund]["annual_yield"] * years_held)
        points.append({"date": cursor, "value": value})
        # advance one month
        month = cursor.month + 1
        year = cursor.year + (1 if month > 12 else 0)
        month = 1 if month > 12 else month
        cursor = cursor.replace(year=year, month=month)
    points.append({"date": end, "value": get_portfolio(user)["total_current_value"]})
    return points


# ---- Auth ---------------------------------------------------------------

@app.route("/")
def index():
    if current_user.is_authenticated:
        return redirect(url_for("admin_portal") if current_user.is_admin() else url_for("dashboard"))
    return redirect(url_for("login"))


@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        if not name or not email or not password:
            flash("All fields are required.", "signup_error")
        elif len(password) < 8:
            flash("Password must be at least 8 characters.", "signup_error")
        elif User.query.filter_by(email=email).first():
            flash("An account with this email already exists.", "signup_error")
        else:
            user = User(name=name, email=email, role="investor", status="active", cash_balance=0)
            user.set_password(password)
            db.session.add(user)
            db.session.commit()

            send_email(
                to=user.email,
                subject="Welcome to AquaVest Capital",
                body=f"Hi {user.name},\n\nYour AquaVest investor account has been created. You can now log in to your dashboard to deposit funds and start investing in sustainable aquaculture.\n\n— AquaVest Capital",
            )
            send_email(
                to=ADMIN_NOTIFICATION_EMAIL,
                subject="New investor account created",
                body=f"A new investor account was created:\n\nName: {user.name}\nEmail: {user.email}\nCreated: {user.created_at:%Y-%m-%d %H:%M}",
            )

            login_user(user)
            return redirect(url_for("dashboard"))

    return render_template("auth.html", default_panel="signup")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        user = User.query.filter_by(email=email).first()

        if not user or not user.check_password(password):
            flash("Incorrect email or password.", "login_error")
        elif user.status == "suspended":
            flash("This account has been suspended. Contact support.", "login_error")
        else:
            login_user(user)
            return redirect(url_for("admin_portal") if user.is_admin() else url_for("dashboard"))

    return render_template("auth.html", default_panel="login")


@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("login"))


# ---- Investor dashboard --------------------------------------------------

@app.route("/dashboard")
@investor_required
def dashboard():
    portfolio = get_portfolio(current_user)
    series = get_growth_series(current_user)
    transactions = Transaction.query.filter_by(user_id=current_user.id).order_by(Transaction.date.desc()).all()
    notifications = EmailLog.query.order_by(EmailLog.sent_at.desc()).limit(20).all()

    return render_template(
        "dashboard.html",
        portfolio=portfolio,
        chart_labels=[p["date"].strftime("%b %y") for p in series],
        chart_data=[round(p["value"], 2) for p in series],
        transactions=transactions,
        notifications=notifications,
        funds=FUNDS,
        crypto_wallets=CRYPTO_WALLETS,
    )


@app.route("/dashboard/profile", methods=["GET", "POST"])
@investor_required
def profile():
    if request.method == "POST":
        form = request.form.get("form")
        if form == "profile":
            new_email = request.form.get("email", "").strip().lower()
            clash = User.query.filter(User.id != current_user.id, User.email == new_email).first()
            if clash:
                flash("Another account already uses this email.", "profile_error")
            else:
                current_user.name = request.form.get("name", "").strip()
                current_user.email = new_email
                current_user.phone = request.form.get("phone", "").strip()
                db.session.commit()
                flash("Profile updated.", "profile_success")
        elif form == "password":
            current_password = request.form.get("current_password", "")
            new_password = request.form.get("new_password", "")
            if not current_user.check_password(current_password):
                flash("Current password is incorrect.", "password_error")
            elif len(new_password) < 8:
                flash("New password must be at least 8 characters.", "password_error")
            else:
                current_user.set_password(new_password)
                db.session.commit()
                flash("Password updated.", "password_success")
        return redirect(url_for("profile"))

    return render_template("profile.html")


@app.route("/dashboard/deposit", methods=["POST"])
@investor_required
def request_deposit():
    try:
        amount = Decimal(request.form.get("amount", "0"))
    except Exception:
        amount = Decimal(0)
    method = request.form.get("method", "bank")
    crypto = request.form.get("crypto") if method == "crypto" else None

    if amount <= 0:
        flash("Enter an amount greater than 0.", "deposit_error")
        return redirect(url_for("dashboard"))
    if method == "crypto" and crypto not in CRYPTO_WALLETS:
        flash("Select a cryptocurrency.", "deposit_error")
        return redirect(url_for("dashboard"))

    txn = Transaction(user_id=current_user.id, type="deposit", method=method, crypto=crypto, amount=amount, status="pending_approval")
    db.session.add(txn)
    db.session.commit()

    method_label = f"{CRYPTO_WALLETS[crypto]['label']} deposit" if method == "crypto" else "bank deposit"
    send_email(
        to=current_user.email,
        subject=f"Deposit request received — ${fmt(amount)}",
        body=f"Hi {current_user.name},\n\nWe've received your {method_label} request for ${fmt(amount)}. It will be credited to your account once our team verifies the funds.\n\n— AquaVest Capital",
    )
    send_email(
        to=ADMIN_NOTIFICATION_EMAIL,
        subject=f"Deposit awaiting approval — {current_user.name}",
        body=f"{current_user.name} ({current_user.email}) requested a ${fmt(amount)} {method_label}. Review it in the admin portal.",
    )
    flash("Deposit request submitted — pending approval.", "success")
    return redirect(url_for("dashboard"))


@app.route("/dashboard/withdraw", methods=["POST"])
@investor_required
def request_withdrawal():
    try:
        amount = Decimal(request.form.get("amount", "0"))
    except Exception:
        amount = Decimal(0)

    if amount <= 0:
        flash("Enter an amount greater than 0.", "withdraw_error")
    elif amount > current_user.cash_balance:
        flash("Withdrawal exceeds your available cash balance.", "withdraw_error")
    else:
        current_user.cash_balance -= amount  # reserved pending admin decision
        txn = Transaction(user_id=current_user.id, type="withdrawal", amount=amount, status="pending_approval")
        db.session.add(txn)
        db.session.commit()

        send_email(
            to=current_user.email,
            subject=f"Withdrawal request received — ${fmt(amount)}",
            body=f"Hi {current_user.name},\n\nYour withdrawal request for ${fmt(amount)} has been submitted and is awaiting approval. The amount has been reserved from your available cash balance.\n\n— AquaVest Capital",
        )
        send_email(
            to=ADMIN_NOTIFICATION_EMAIL,
            subject=f"Withdrawal awaiting approval — {current_user.name}",
            body=f"{current_user.name} ({current_user.email}) requested a ${fmt(amount)} withdrawal. Review it in the admin portal.",
        )
        flash("Withdrawal request submitted — pending approval.", "success")
    return redirect(url_for("dashboard"))


@app.route("/dashboard/invest", methods=["POST"])
@investor_required
def request_investment():
    fund = request.form.get("fund")
    try:
        amount = Decimal(request.form.get("amount", "0"))
    except Exception:
        amount = Decimal(0)

    if fund not in FUNDS:
        flash("Select a fund.", "invest_error")
    elif amount <= 0:
        flash("Enter an amount greater than 0.", "invest_error")
    elif amount > current_user.cash_balance:
        flash("Amount exceeds your available cash balance. Deposit funds first.", "invest_error")
    else:
        current_user.cash_balance -= amount  # reserved pending admin decision
        txn = Transaction(user_id=current_user.id, type="investment_start", fund=fund, amount=amount, status="pending_approval")
        db.session.add(txn)
        db.session.commit()

        fund_label = FUNDS[fund]["label"]
        send_email(
            to=current_user.email,
            subject=f"Investment request received — {fund_label}",
            body=f"Hi {current_user.name},\n\nYour request to invest ${fmt(amount)} in {fund_label} has been submitted and is awaiting approval.\n\n— AquaVest Capital",
        )
        send_email(
            to=ADMIN_NOTIFICATION_EMAIL,
            subject=f"Investment awaiting approval — {current_user.name}",
            body=f"{current_user.name} ({current_user.email}) requested a ${fmt(amount)} investment in {fund_label}. Review it in the admin portal.",
        )
        flash("Investment request submitted — pending approval.", "success")
    return redirect(url_for("dashboard"))


# ---- Admin portal ---------------------------------------------------------

@app.route("/admin")
@admin_required
def admin_portal():
    pending = Transaction.query.filter_by(status="pending_approval").order_by(Transaction.date.asc()).all()
    users = User.query.filter(User.role != "admin").order_by(User.created_at.desc()).all()
    all_txns = Transaction.query.order_by(Transaction.date.desc()).all()

    total_cash = sum((float(u.cash_balance) for u in users), 0.0)
    total_invested = sum((get_portfolio(u)["total_invested"] for u in users), 0.0)

    return render_template(
        "admin.html",
        pending=pending,
        users=users,
        all_txns=all_txns,
        funds=FUNDS,
        crypto_wallets=CRYPTO_WALLETS,
        stat_pending=len(pending),
        stat_users=len(users),
        stat_cash=total_cash,
        stat_invested=total_invested,
    )


@app.route("/admin/approve/<int:txn_id>", methods=["POST"])
@admin_required
def admin_approve(txn_id):
    txn = db.session.get(Transaction, txn_id)
    if not txn or txn.status != "pending_approval":
        flash("Transaction not found or already reviewed.", "error")
        return redirect(url_for("admin_portal"))

    user = db.session.get(User, txn.user_id)

    if txn.type == "deposit":
        user.cash_balance += txn.amount
        subject = f"Deposit approved — ${fmt(txn.amount)}"
        body = f"Hi {user.name},\n\nYour deposit of ${fmt(txn.amount)} has been approved and credited to your account. Your available cash balance is now ${fmt(user.cash_balance)}.\n\n— AquaVest Capital"
    elif txn.type == "withdrawal":
        subject = f"Withdrawal approved — ${fmt(txn.amount)}"
        body = f"Hi {user.name},\n\nYour withdrawal of ${fmt(txn.amount)} has been approved and sent.\n\n— AquaVest Capital"
    else:
        db.session.add(Investment(user_id=user.id, fund=txn.fund, amount=txn.amount, start_date=now(), status="active"))
        fund_label = FUNDS[txn.fund]["label"]
        subject = f"Investment approved — {fund_label}"
        body = f"Hi {user.name},\n\nYour investment of ${fmt(txn.amount)} in {fund_label} has been approved and is now active.\n\n— AquaVest Capital"

    txn.status = "approved"
    txn.reviewed_at = now()
    txn.reviewed_by = current_user.email
    db.session.commit()

    send_email(to=user.email, subject=subject, body=body)
    flash("Approved.", "success")
    return redirect(url_for("admin_portal"))


@app.route("/admin/reject/<int:txn_id>", methods=["POST"])
@admin_required
def admin_reject(txn_id):
    txn = db.session.get(Transaction, txn_id)
    if not txn or txn.status != "pending_approval":
        flash("Transaction not found or already reviewed.", "error")
        return redirect(url_for("admin_portal"))

    user = db.session.get(User, txn.user_id)
    reason = request.form.get("reason", "").strip()

    if txn.type in ("withdrawal", "investment_start"):
        user.cash_balance += txn.amount  # refund the reservation

    txn.status = "rejected"
    txn.reviewed_at = now()
    txn.reviewed_by = current_user.email
    txn.rejection_reason = reason or None
    db.session.commit()

    type_label = {"deposit": "deposit", "withdrawal": "withdrawal", "investment_start": "investment request"}[txn.type]
    refund_note = " The reserved amount has been returned to your available cash balance." if txn.type != "deposit" else ""
    reason_note = f" ({reason})" if reason else ""
    send_email(
        to=user.email,
        subject=f"Your {type_label} was not approved",
        body=f"Hi {user.name},\n\nYour {type_label} of ${fmt(txn.amount)} could not be approved{reason_note}.{refund_note} Contact us if you have questions.\n\n— AquaVest Capital",
    )
    flash("Rejected.", "success")
    return redirect(url_for("admin_portal"))


@app.route("/admin/user/<int:user_id>", methods=["POST"])
@admin_required
def admin_update_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        abort(404)

    user.name = request.form.get("name", user.name).strip()
    new_email = request.form.get("email", user.email).strip().lower()
    if new_email != user.email and User.query.filter(User.id != user.id, User.email == new_email).first():
        flash("Another account already uses this email.", "error")
        return redirect(url_for("admin_portal"))
    user.email = new_email
    user.phone = request.form.get("phone", "").strip()
    user.status = request.form.get("status", user.status)
    try:
        user.cash_balance = Decimal(request.form.get("cash_balance", str(user.cash_balance)))
    except Exception:
        pass
    db.session.commit()

    send_email(
        to=user.email,
        subject="Your AquaVest account was updated",
        body=f"Hi {user.name},\n\nAn administrator updated your account settings. If this wasn't expected, contact support immediately.\n\n— AquaVest Capital",
    )
    flash("Account updated.", "success")
    return redirect(url_for("admin_portal"))


# ---- Demo data -------------------------------------------------------

def seed_demo_data():
    if User.query.first():
        return

    admin = User(name="AquaVest Admin", email="admin@aquavest.com", role="admin", status="active", cash_balance=0)
    admin.set_password("admin1234")

    demo = User(name="Jordan Ellis", email="demo@aquavest.com", role="investor", status="active",
                phone="+1 (555) 010-2938", cash_balance=5000, created_at=datetime(2026, 1, 15, 9, 0, tzinfo=timezone.utc))
    demo.set_password("demo1234")

    db.session.add_all([admin, demo])
    db.session.commit()

    db.session.add_all([
        Investment(user_id=demo.id, fund="tilapia", amount=8000, start_date=datetime(2026, 2, 1, tzinfo=timezone.utc), status="active"),
        Investment(user_id=demo.id, fund="shrimp", amount=4000, start_date=datetime(2026, 4, 15, tzinfo=timezone.utc), status="active"),
    ])
    db.session.add_all([
        Transaction(user_id=demo.id, type="deposit", method="bank", amount=12000,
                    date=datetime(2026, 1, 16, 10, 0, tzinfo=timezone.utc), status="approved",
                    reviewed_at=datetime(2026, 1, 16, 14, 0, tzinfo=timezone.utc)),
        Transaction(user_id=demo.id, type="investment_start", fund="tilapia", amount=8000,
                    date=datetime(2026, 2, 1, 0, 0, tzinfo=timezone.utc), status="approved",
                    reviewed_at=datetime(2026, 2, 1, 12, 0, tzinfo=timezone.utc)),
        Transaction(user_id=demo.id, type="investment_start", fund="shrimp", amount=4000,
                    date=datetime(2026, 4, 15, 0, 0, tzinfo=timezone.utc), status="approved",
                    reviewed_at=datetime(2026, 4, 15, 12, 0, tzinfo=timezone.utc)),
        Transaction(user_id=demo.id, type="deposit", method="bank", amount=1000,
                    date=datetime(2026, 6, 1, 10, 0, tzinfo=timezone.utc), status="approved",
                    reviewed_at=datetime(2026, 6, 1, 15, 0, tzinfo=timezone.utc)),
        Transaction(user_id=demo.id, type="deposit", method="crypto", crypto="USDT", amount=750,
                    date=now(), status="pending_approval"),
    ])
    db.session.commit()


@app.cli.command("seed-demo")
def seed_demo_command():
    """Reset the database and load the same demo accounts as the prototype."""
    db.drop_all()
    db.create_all()
    seed_demo_data()
    print("Seeded demo data: admin@aquavest.com / admin1234, demo@aquavest.com / demo1234")


with app.app_context():
    db.create_all()
    seed_demo_data()


if __name__ == "__main__":
    # Local development only. On Hostinger, Passenger imports `application`
    # from passenger_wsgi.py directly and never runs this block.
    app.run(debug=not IS_PRODUCTION, host="0.0.0.0", port=int(os.environ.get("PORT", 5057)))
