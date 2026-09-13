# AquaVest Investor Portal — Flask backend

A real server backend for the investor dashboard, admin approval workflow,
and crypto deposit flow: sessions, password hashing, and a real database
(SQLite by default) instead of the earlier browser-only prototype
(`assets/dashboard/*.js` in the parent site).

## Run it locally

```bash
cd flask_app
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
python app.py
```

Open http://127.0.0.1:5057 — the database (`aquavest.db`) and demo accounts
are created automatically on first run:

- Demo investor: `demo@aquavest.com` / `demo1234`
- Demo admin: `admin@aquavest.com` / `admin1234`

To wipe and reseed at any time: `flask --app app.py seed-demo`.

## What's real now vs. still a placeholder

**Real:**
- Server-side sessions (Flask-Login) — the browser only ever holds a
  session cookie, never account data or balances.
- Passwords hashed with Werkzeug (PBKDF2), never stored in plain text.
- A real database (SQLAlchemy models in `models.py`) shared across every
  device/browser, not per-browser `localStorage`.
- Every approval/rejection check happens server-side — a user can't just
  open dev tools and grant themselves admin rights or a bigger balance the
  way they could with the old JS prototype.

**Still placeholders — do this before real users or real money touch it:**
- **Email** (`mail.py`): every notification is logged to the `EmailLog`
  table and printed to the console, not actually sent. Set the `SMTP_HOST`
  / `SMTP_PORT` / `SMTP_USERNAME` / `SMTP_PASSWORD` / `SMTP_FROM_ADDRESS`
  environment variables and flip `USE_REAL_SMTP = True` in `mail.py` to
  send for real, or swap `_send_via_smtp` for a provider SDK (Postmark,
  SendGrid, etc).
- **Crypto wallets** (`models.py` `CRYPTO_WALLETS`): the four addresses are
  deliberately fake/non-functional placeholders, clearly labeled in the UI.
  Replace them with real receiving addresses from a real custody or
  payment-processor account, and add a real way to confirm a payment
  actually arrived (on-chain monitoring, or a processor like Coinbase
  Commerce/BitPay) — right now "I've Sent It" is only the investor's
  unverified claim, which is exactly why every crypto deposit still lands
  in the admin queue rather than crediting automatically.
- **Hosting**: the built-in `app.run()` dev server is not for production —
  see "Deploying to Hostinger" below.
- **CSRF protection**: forms are plain HTML POSTs with no CSRF token yet.
  Add `Flask-WTF` or a manual CSRF token before going live.

## Deploying to Hostinger (Business/shared hosting)

The dashboard runs on its own subdomain (e.g. `portal.yourdomain.com`),
separate from the static marketing site on the main domain — they're two
independent deployments that happen to share a DNS zone.

Hostinger's Business plan runs Python apps through hPanel's **Setup Python
App** feature (Phusion Passenger), not a container or VPS shell you fully
control. That shapes a few things already handled in this codebase:

- `passenger_wsgi.py` is the required entry point — Passenger imports the
  `application` object from that exact file/name; it never runs `app.py`
  directly.
- Shared hosting only gives you **MySQL**, not Postgres or a persistent
  SQLite file. Set the `DATABASE_URL` environment variable Hostinger's
  Python App panel provides for (it's `mysql+pymysql://user:pass@host/dbname`
  once you create a MySQL database in hPanel) — `PyMySQL` is already in
  `requirements.txt` for this.
- Secrets come from environment variables, never hardcoded: set
  `SECRET_KEY` (any long random string) and `FLASK_ENV=production` in the
  Python App's environment variable settings.

### Steps in hPanel

1. **Create the subdomain** (Domains → Subdomains) — e.g. `portal`, pointing
   at a new empty folder such as `domains/yourdomain.com/portal/`.
2. **Create a MySQL database** (Databases → MySQL Databases) — note the
   database name, username, password, and host it gives you.
3. **Set up the Python App** (Advanced → Python App, or search "Python" in
   hPanel): point it at the subdomain's folder, pick a Python version
   (3.10+), and set the application startup file to `passenger_wsgi.py`.
4. **Upload the code** — everything in this `flask_app/` folder (via Git if
   hPanel's Git deploy is available, otherwise the File Manager or FTP)
   into that subdomain's folder. Do **not** upload the local `venv/` or
   `aquavest.db` — hPanel creates its own virtual environment.
5. **Install dependencies** — hPanel's Python App page has a button/field to
   run `pip install -r requirements.txt` inside the venv it manages.
6. **Set environment variables** in the same Python App panel:
   `SECRET_KEY`, `FLASK_ENV=production`, `DATABASE_URL` (from step 2).
7. **Restart the app** from hPanel. Visit `https://portal.yourdomain.com` —
   the database tables and demo accounts are created automatically on
   first request (change/remove the demo accounts once real ones exist).
8. **Real email**: Hostinger Business plans include real mailboxes — create
   one (e.g. `notifications@yourdomain.com`) under Emails in hPanel, then
   set the `SMTP_*` environment variables in `mail.py`'s "TO SEND REAL
   EMAIL" section to that mailbox's SMTP details and flip `USE_REAL_SMTP`.

## Project layout

```
flask_app/
  app.py              routes, auth, business logic
  passenger_wsgi.py   Hostinger/Passenger entry point
  models.py           SQLAlchemy models + fund/crypto config
  mail.py             pluggable email sending (mock by default)
  templates/          Jinja2 templates (reuses the static site's CSS)
  static/             dashboard.css + logo, copied from the main site
  requirements.txt
```
