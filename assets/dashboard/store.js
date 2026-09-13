/**
 * AquaVest investor portal — PROTOTYPE data layer.
 *
 * Everything here lives in the browser's localStorage. There is no
 * server, no real password hashing, no real payment processing, and
 * no real email delivery. This is intentional for now: it lets the
 * signup/login/dashboard/admin-approval/crypto-payment flows be built
 * and tested end to end before a real backend exists.
 *
 * BEFORE THIS GOES LIVE WITH REAL MONEY OR REAL USERS, REPLACE:
 *   - AquaVestStore.* (this file)        -> real authenticated API calls,
 *                                            with every approval/rejection
 *                                            check re-verified server-side
 *                                            (a client can call these
 *                                            functions directly from the
 *                                            console right now — there is
 *                                            no real access control)
 *   - AquaVestEmail.send() (email.js)    -> a real transactional email
 *                                            provider
 *   - Plaintext password storage below   -> server-side hashing
 *     (bcrypt/argon2) — a password must never be stored or compared
 *     in client-side JS for a real deployment
 *   - CRYPTO_WALLETS addresses below     -> real receiving addresses from
 *     a real custody/payment provider, PLUS a real way to detect that a
 *     payment actually arrived (on-chain monitoring or a processor like
 *     Coinbase Commerce/BitPay) — right now "I've sent it" is just a
 *     user's unverified claim that lands in the admin queue
 *
 * The function signatures below are written so that swapping the body
 * of each for a `fetch()` call to a real API is a small, contained
 * change — callers (the page JS) do not need to change.
 */
(function (global) {
  "use strict";

  const STORAGE_KEY = "aquavest_prototype_db_v2";
  const SESSION_KEY = "aquavest_prototype_session_v2";

  const FUNDS = {
    tilapia: { label: "Tilapia Farming Shares", annualYield: 0.08 },
    seaweed: { label: "Seaweed Cultivation Shares", annualYield: 0.06 },
    shrimp: { label: "Shrimp & Prawn Farming Shares", annualYield: 0.10 },
  };

  // DEMO / NON-FUNCTIONAL addresses. Deliberately not valid, checksummed
  // real-world addresses — see the note above. Swap for real receiving
  // addresses (from a real custody or payment-processor account) before
  // ever pointing real users at this flow.
  const CRYPTO_WALLETS = {
    BTC: {
      label: "Bitcoin",
      network: "Bitcoin (BTC)",
      address: "DEMO-BTC-NOT-A-REAL-ADDRESS-0000000000",
    },
    ETH: {
      label: "Ethereum",
      network: "Ethereum (ERC-20)",
      address: "0xDEMO0000NOTAREALETHADDRESS0000000000",
    },
    USDT: {
      label: "Tether (USDT)",
      network: "Ethereum (ERC-20)",
      address: "0xDEMO0000NOTAREALUSDTADDRESS000000000",
    },
    USDC: {
      label: "USD Coin (USDC)",
      network: "Ethereum (ERC-20)",
      address: "0xDEMO0000NOTAREALUSDCADDRESS000000000",
    },
  };

  const ADMIN_EMAIL = "admin@aquavest.com";

  function nowIso() {
    return new Date().toISOString();
  }

  function genId(prefix) {
    return (
      prefix +
      "_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 8)
    );
  }

  function loadDB() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return seedDB();
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.users)) return seedDB();
      return parsed;
    } catch (e) {
      return seedDB();
    }
  }

  function saveDB(db) {
    global.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  function seedDB() {
    const demoUserId = "user_demo";
    const adminId = "user_admin";
    const db = {
      users: [
        {
          id: demoUserId,
          name: "Jordan Ellis",
          email: "demo@aquavest.com",
          password: "demo1234",
          role: "investor",
          status: "active",
          phone: "+1 (555) 010-2938",
          cashBalance: 5000,
          createdAt: "2026-01-15T09:00:00.000Z",
        },
        {
          id: adminId,
          name: "AquaVest Admin",
          email: "admin@aquavest.com",
          password: "admin1234",
          role: "admin",
          status: "active",
          phone: "",
          cashBalance: 0,
          createdAt: "2026-01-01T09:00:00.000Z",
        },
      ],
      investments: [
        {
          id: genId("inv"),
          userId: demoUserId,
          fund: "tilapia",
          amount: 8000,
          startDate: "2026-02-01T00:00:00.000Z",
          status: "active",
        },
        {
          id: genId("inv"),
          userId: demoUserId,
          fund: "shrimp",
          amount: 4000,
          startDate: "2026-04-15T00:00:00.000Z",
          status: "active",
        },
      ],
      transactions: [
        {
          id: genId("txn"),
          userId: demoUserId,
          type: "deposit",
          method: "bank",
          amount: 12000,
          date: "2026-01-16T10:00:00.000Z",
          status: "approved",
          reviewedAt: "2026-01-16T14:00:00.000Z",
        },
        {
          id: genId("txn"),
          userId: demoUserId,
          type: "investment_start",
          fund: "tilapia",
          amount: 8000,
          date: "2026-02-01T00:00:00.000Z",
          status: "approved",
          reviewedAt: "2026-02-01T12:00:00.000Z",
        },
        {
          id: genId("txn"),
          userId: demoUserId,
          type: "investment_start",
          fund: "shrimp",
          amount: 4000,
          date: "2026-04-15T00:00:00.000Z",
          status: "approved",
          reviewedAt: "2026-04-15T12:00:00.000Z",
        },
        {
          id: genId("txn"),
          userId: demoUserId,
          type: "deposit",
          method: "bank",
          amount: 1000,
          date: "2026-06-01T10:00:00.000Z",
          status: "approved",
          reviewedAt: "2026-06-01T15:00:00.000Z",
        },
        {
          id: genId("txn"),
          userId: demoUserId,
          type: "deposit",
          method: "crypto",
          crypto: "USDT",
          amount: 750,
          date: nowIso(),
          status: "pending_approval",
        },
      ],
      emailLog: [],
    };
    saveDB(db);
    return db;
  }

  function resetDemoData() {
    global.localStorage.removeItem(STORAGE_KEY);
    return loadDB();
  }

  // ---- Session -------------------------------------------------------

  function getSession() {
    try {
      const raw = global.localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setSession(userId) {
    global.localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: userId }));
  }

  function clearSession() {
    global.localStorage.removeItem(SESSION_KEY);
  }

  function getCurrentUser() {
    const session = getSession();
    if (!session) return null;
    const db = loadDB();
    return db.users.find((u) => u.id === session.userId) || null;
  }

  /** Call at the top of any investor page. Redirects to login if no
   * session or the account is an admin account. */
  function requireAuth(loginUrl) {
    const user = getCurrentUser();
    if (!user) {
      global.location.href = loginUrl || "../login/index.html";
      return null;
    }
    return user;
  }

  /** Call at the top of any admin page. Redirects non-admins away —
   * client-side only, NOT real access control (see file header). */
  function requireAdmin(loginUrl) {
    const user = getCurrentUser();
    if (!user || user.role !== "admin") {
      global.location.href = loginUrl || "../login/index.html";
      return null;
    }
    return user;
  }

  // ---- Auth ------------------------------------------------------------

  function findUserByEmail(db, email) {
    const normalized = String(email).trim().toLowerCase();
    return db.users.find((u) => u.email.toLowerCase() === normalized);
  }

  /** Returns { ok: true, user } or { ok: false, error } */
  function signUp(name, email, password) {
    const db = loadDB();
    if (!name || !email || !password) {
      return { ok: false, error: "All fields are required." };
    }
    if (password.length < 8) {
      return { ok: false, error: "Password must be at least 8 characters." };
    }
    if (findUserByEmail(db, email)) {
      return { ok: false, error: "An account with this email already exists." };
    }
    const user = {
      id: genId("user"),
      name: name.trim(),
      email: email.trim(),
      password: password, // PROTOTYPE ONLY — never store plaintext passwords in production
      role: "investor",
      status: "active",
      phone: "",
      cashBalance: 0,
      createdAt: nowIso(),
    };
    db.users.push(user);
    saveDB(db);
    setSession(user.id);

    global.AquaVestEmail.send({
      to: user.email,
      subject: "Welcome to AquaVest Capital",
      body:
        "Hi " +
        user.name +
        ",\n\nYour AquaVest investor account has been created. You can now log in to your dashboard to deposit funds and start investing in sustainable aquaculture.\n\n— AquaVest Capital",
    });
    global.AquaVestEmail.send({
      to: ADMIN_EMAIL,
      subject: "New investor account created",
      body:
        "A new investor account was created:\n\nName: " +
        user.name +
        "\nEmail: " +
        user.email +
        "\nCreated: " +
        new Date(user.createdAt).toLocaleString(),
    });

    return { ok: true, user: user };
  }

  /** Returns { ok: true, user } or { ok: false, error } */
  function logIn(email, password) {
    const db = loadDB();
    const user = findUserByEmail(db, email);
    if (!user || user.password !== password) {
      return { ok: false, error: "Incorrect email or password." };
    }
    if (user.status === "suspended") {
      return { ok: false, error: "This account has been suspended. Contact support." };
    }
    setSession(user.id);
    return { ok: true, user: user };
  }

  function logOut() {
    clearSession();
  }

  // ---- Profile ---------------------------------------------------------

  /** User editing their own name/phone. Email + password changes are
   * kept separate below so each has its own validation. */
  function updateProfile(userId, fields) {
    const db = loadDB();
    const user = db.users.find((u) => u.id === userId);
    if (!user) return { ok: false, error: "User not found." };
    if (fields.email !== undefined) {
      const newEmail = String(fields.email).trim();
      const clash = db.users.find((u) => u.id !== userId && u.email.toLowerCase() === newEmail.toLowerCase());
      if (clash) return { ok: false, error: "Another account already uses this email." };
      user.email = newEmail;
    }
    if (fields.name !== undefined) user.name = String(fields.name).trim();
    if (fields.phone !== undefined) user.phone = String(fields.phone).trim();
    saveDB(db);
    return { ok: true, user: user };
  }

  function changePassword(userId, currentPassword, newPassword) {
    const db = loadDB();
    const user = db.users.find((u) => u.id === userId);
    if (!user) return { ok: false, error: "User not found." };
    if (user.password !== currentPassword) {
      return { ok: false, error: "Current password is incorrect." };
    }
    if (!newPassword || newPassword.length < 8) {
      return { ok: false, error: "New password must be at least 8 characters." };
    }
    user.password = newPassword;
    saveDB(db);
    return { ok: true };
  }

  // ---- Money movement — all REQUESTS land pending, admin decides ------
  //
  // Deposits: not credited to cashBalance until an admin approves (we
  // cannot verify money actually arrived).
  // Withdrawals & investments: the amount is reserved out of
  // cashBalance immediately on request (so it can't be double-spent
  // while pending) and refunded if an admin rejects the request.

  /** Returns { ok, error? }. method: "bank" | "crypto". cryptoCode only
   * required when method is "crypto". */
  function requestDeposit(userId, amount, method, cryptoCode) {
    amount = Number(amount);
    if (!(amount > 0)) return { ok: false, error: "Enter an amount greater than 0." };
    const db = loadDB();
    const user = db.users.find((u) => u.id === userId);
    if (!user) return { ok: false, error: "User not found." };

    const txn = {
      id: genId("txn"),
      userId: userId,
      type: "deposit",
      method: method || "bank",
      amount: amount,
      date: nowIso(),
      status: "pending_approval",
    };
    if (method === "crypto") txn.crypto = cryptoCode;
    db.transactions.push(txn);
    saveDB(db);

    const methodLabel = method === "crypto" ? CRYPTO_WALLETS[cryptoCode].label + " deposit" : "bank deposit";
    global.AquaVestEmail.send({
      to: user.email,
      subject: "Deposit request received — $" + formatMoney(amount),
      body:
        "Hi " +
        user.name +
        ",\n\nWe've received your " +
        methodLabel +
        " request for $" +
        formatMoney(amount) +
        ". It will be credited to your account once our team verifies the funds. You'll get an email as soon as it's approved.\n\n— AquaVest Capital",
    });
    global.AquaVestEmail.send({
      to: ADMIN_EMAIL,
      subject: "Deposit awaiting approval — " + user.name,
      body:
        user.name + " (" + user.email + ") requested a $" + formatMoney(amount) + " " + methodLabel + ". Review it in the admin portal.",
    });

    return { ok: true, transaction: txn };
  }

  /** Returns { ok, error? } */
  function requestWithdrawal(userId, amount) {
    amount = Number(amount);
    if (!(amount > 0)) return { ok: false, error: "Enter an amount greater than 0." };
    const db = loadDB();
    const user = db.users.find((u) => u.id === userId);
    if (!user) return { ok: false, error: "User not found." };
    if (amount > user.cashBalance) {
      return { ok: false, error: "Withdrawal exceeds your available cash balance." };
    }

    user.cashBalance -= amount; // reserved pending admin decision
    const txn = {
      id: genId("txn"),
      userId: userId,
      type: "withdrawal",
      amount: amount,
      date: nowIso(),
      status: "pending_approval",
    };
    db.transactions.push(txn);
    saveDB(db);

    global.AquaVestEmail.send({
      to: user.email,
      subject: "Withdrawal request received — $" + formatMoney(amount),
      body:
        "Hi " +
        user.name +
        ",\n\nYour withdrawal request for $" +
        formatMoney(amount) +
        " has been submitted and is awaiting approval. The amount has been reserved from your available cash balance.\n\n— AquaVest Capital",
    });
    global.AquaVestEmail.send({
      to: ADMIN_EMAIL,
      subject: "Withdrawal awaiting approval — " + user.name,
      body:
        user.name + " (" + user.email + ") requested a $" + formatMoney(amount) + " withdrawal. Review it in the admin portal.",
    });

    return { ok: true, transaction: txn };
  }

  /** Returns { ok, error? } */
  function requestInvestment(userId, fundKey, amount) {
    amount = Number(amount);
    const fund = FUNDS[fundKey];
    if (!fund) return { ok: false, error: "Select a fund." };
    if (!(amount > 0)) return { ok: false, error: "Enter an amount greater than 0." };
    const db = loadDB();
    const user = db.users.find((u) => u.id === userId);
    if (!user) return { ok: false, error: "User not found." };
    if (amount > user.cashBalance) {
      return { ok: false, error: "Amount exceeds your available cash balance. Deposit funds first." };
    }

    user.cashBalance -= amount; // reserved pending admin decision
    const txn = {
      id: genId("txn"),
      userId: userId,
      type: "investment_start",
      fund: fundKey,
      amount: amount,
      date: nowIso(),
      status: "pending_approval",
    };
    db.transactions.push(txn);
    saveDB(db);

    global.AquaVestEmail.send({
      to: user.email,
      subject: "Investment request received — " + fund.label,
      body:
        "Hi " +
        user.name +
        ",\n\nYour request to invest $" +
        formatMoney(amount) +
        " in " +
        fund.label +
        " has been submitted and is awaiting approval.\n\n— AquaVest Capital",
    });
    global.AquaVestEmail.send({
      to: ADMIN_EMAIL,
      subject: "Investment awaiting approval — " + user.name,
      body:
        user.name + " (" + user.email + ") requested a $" + formatMoney(amount) + " investment in " + fund.label + ". Review it in the admin portal.",
    });

    return { ok: true, transaction: txn };
  }

  // ---- Admin: approvals -------------------------------------------------

  function adminListPendingTransactions() {
    const db = loadDB();
    return db.transactions
      .filter((t) => t.status === "pending_approval")
      .map((t) => Object.assign({}, t, { user: db.users.find((u) => u.id === t.userId) }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  function adminListAllTransactions() {
    const db = loadDB();
    return db.transactions
      .map((t) => Object.assign({}, t, { user: db.users.find((u) => u.id === t.userId) }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /** Returns { ok, error? } */
  function adminApproveTransaction(txnId, adminUser) {
    const db = loadDB();
    const txn = db.transactions.find((t) => t.id === txnId);
    if (!txn) return { ok: false, error: "Transaction not found." };
    if (txn.status !== "pending_approval") return { ok: false, error: "Already reviewed." };
    const user = db.users.find((u) => u.id === txn.userId);
    if (!user) return { ok: false, error: "User not found." };

    if (txn.type === "deposit") {
      user.cashBalance += txn.amount;
    } else if (txn.type === "investment_start") {
      db.investments.push({
        id: genId("inv"),
        userId: txn.userId,
        fund: txn.fund,
        amount: txn.amount,
        startDate: nowIso(),
        status: "active",
      });
    }
    // withdrawal: funds were already reserved at request time; approving
    // just confirms the payout was sent — no further balance change.

    txn.status = "approved";
    txn.reviewedAt = nowIso();
    txn.reviewedBy = adminUser ? adminUser.email : ADMIN_EMAIL;
    saveDB(db);

    let subject, body;
    if (txn.type === "deposit") {
      subject = "Deposit approved — $" + formatMoney(txn.amount);
      body =
        "Hi " + user.name + ",\n\nYour deposit of $" + formatMoney(txn.amount) +
        " has been approved and credited to your account. Your available cash balance is now $" +
        formatMoney(user.cashBalance) + ".\n\n— AquaVest Capital";
    } else if (txn.type === "withdrawal") {
      subject = "Withdrawal approved — $" + formatMoney(txn.amount);
      body =
        "Hi " + user.name + ",\n\nYour withdrawal of $" + formatMoney(txn.amount) +
        " has been approved and sent.\n\n— AquaVest Capital";
    } else {
      subject = "Investment approved — " + FUNDS[txn.fund].label;
      body =
        "Hi " + user.name + ",\n\nYour investment of $" + formatMoney(txn.amount) +
        " in " + FUNDS[txn.fund].label + " has been approved and is now active.\n\n— AquaVest Capital";
    }
    global.AquaVestEmail.send({ to: user.email, subject: subject, body: body });

    return { ok: true };
  }

  /** Returns { ok, error? } */
  function adminRejectTransaction(txnId, adminUser, reason) {
    const db = loadDB();
    const txn = db.transactions.find((t) => t.id === txnId);
    if (!txn) return { ok: false, error: "Transaction not found." };
    if (txn.status !== "pending_approval") return { ok: false, error: "Already reviewed." };
    const user = db.users.find((u) => u.id === txn.userId);
    if (!user) return { ok: false, error: "User not found." };

    if (txn.type === "withdrawal" || txn.type === "investment_start") {
      user.cashBalance += txn.amount; // refund the reservation
    }
    // deposit: nothing was ever credited, so nothing to reverse.

    txn.status = "rejected";
    txn.reviewedAt = nowIso();
    txn.reviewedBy = adminUser ? adminUser.email : ADMIN_EMAIL;
    if (reason) txn.rejectionReason = reason;
    saveDB(db);

    const typeLabel = { deposit: "deposit", withdrawal: "withdrawal", investment_start: "investment request" }[txn.type];
    global.AquaVestEmail.send({
      to: user.email,
      subject: "Your " + typeLabel + " was not approved",
      body:
        "Hi " + user.name + ",\n\nYour " + typeLabel + " of $" + formatMoney(txn.amount) +
        " could not be approved" + (reason ? " (" + reason + ")" : "") + "." +
        (txn.type !== "deposit" ? " The reserved amount has been returned to your available cash balance." : "") +
        " Contact us if you have questions.\n\n— AquaVest Capital",
    });

    return { ok: true };
  }

  // ---- Admin: user management --------------------------------------

  function adminListUsers() {
    const db = loadDB();
    return db.users.filter((u) => u.role !== "admin");
  }

  /** Admin editing any account field (name, email, phone, cashBalance,
   * status). Returns { ok, error? }. */
  function adminUpdateUser(userId, fields, adminUser) {
    const db = loadDB();
    const user = db.users.find((u) => u.id === userId);
    if (!user) return { ok: false, error: "User not found." };

    if (fields.name !== undefined) user.name = String(fields.name).trim();
    if (fields.email !== undefined) user.email = String(fields.email).trim();
    if (fields.phone !== undefined) user.phone = String(fields.phone).trim();
    if (fields.status !== undefined) user.status = fields.status;
    if (fields.cashBalance !== undefined) {
      const newBalance = Number(fields.cashBalance);
      if (!isNaN(newBalance)) user.cashBalance = newBalance;
    }
    saveDB(db);

    global.AquaVestEmail.send({
      to: user.email,
      subject: "Your AquaVest account was updated",
      body:
        "Hi " + user.name + ",\n\nAn administrator updated your account settings. If this wasn't expected, contact support immediately.\n\n— AquaVest Capital",
    });

    return { ok: true, user: user };
  }

  // ---- Portfolio math (simulated — see Disclaimer) -------------------

  /** Simulated current value: principal + pro-rata simple yield since
   * start, using each fund's illustrative annualYield. This is NOT a
   * real market valuation — there is no real market data source yet. */
  function currentValue(investment) {
    const fund = FUNDS[investment.fund];
    if (!fund) return investment.amount;
    const start = new Date(investment.startDate).getTime();
    const now = Date.now();
    const yearsHeld = Math.max(0, (now - start) / (365 * 24 * 60 * 60 * 1000));
    return investment.amount * (1 + fund.annualYield * yearsHeld);
  }

  function getPortfolio(userId) {
    const db = loadDB();
    const investments = db.investments.filter((i) => i.userId === userId);
    const user = db.users.find((u) => u.id === userId);

    let totalInvested = 0;
    let totalCurrentValue = 0;
    const byFund = {};

    investments.forEach((inv) => {
      const value = currentValue(inv);
      totalInvested += inv.amount;
      totalCurrentValue += value;
      if (!byFund[inv.fund]) {
        byFund[inv.fund] = { fund: inv.fund, label: FUNDS[inv.fund].label, invested: 0, currentValue: 0 };
      }
      byFund[inv.fund].invested += inv.amount;
      byFund[inv.fund].currentValue += value;
    });

    const pending = db.transactions.filter((t) => t.userId === userId && t.status === "pending_approval");

    return {
      cashBalance: user ? user.cashBalance : 0,
      totalInvested: totalInvested,
      totalCurrentValue: totalCurrentValue,
      totalReturn: totalCurrentValue - totalInvested,
      totalReturnPct: totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 : 0,
      holdings: Object.values(byFund),
      investments: investments,
      pending: pending,
    };
  }

  function getTransactions(userId) {
    const db = loadDB();
    return db.transactions
      .filter((t) => t.userId === userId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /** Monthly portfolio value series for the chart, from the earliest
   * investment start date to today (simulated, see currentValue). */
  function getGrowthSeries(userId) {
    const db = loadDB();
    const investments = db.investments.filter((i) => i.userId === userId);
    if (investments.length === 0) return [];

    const earliest = investments.reduce(
      (min, inv) => Math.min(min, new Date(inv.startDate).getTime()),
      Date.now()
    );
    const points = [];
    const start = new Date(earliest);
    start.setDate(1);
    const cursor = new Date(start);
    const end = new Date();

    while (cursor <= end) {
      const asOf = cursor.getTime();
      let value = 0;
      investments.forEach((inv) => {
        const invStart = new Date(inv.startDate).getTime();
        if (invStart <= asOf) {
          const fund = FUNDS[inv.fund];
          const yearsHeld = Math.max(0, (asOf - invStart) / (365 * 24 * 60 * 60 * 1000));
          value += inv.amount * (1 + fund.annualYield * yearsHeld);
        }
      });
      points.push({ date: new Date(cursor), value: value });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    // Always include a final "today" point for a clean chart edge.
    points.push({ date: end, value: getPortfolio(userId).totalCurrentValue });
    return points;
  }

  function formatMoney(n) {
    return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  global.AquaVestStore = {
    FUNDS: FUNDS,
    CRYPTO_WALLETS: CRYPTO_WALLETS,
    getCurrentUser: getCurrentUser,
    requireAuth: requireAuth,
    requireAdmin: requireAdmin,
    signUp: signUp,
    logIn: logIn,
    logOut: logOut,
    updateProfile: updateProfile,
    changePassword: changePassword,
    requestDeposit: requestDeposit,
    requestWithdrawal: requestWithdrawal,
    requestInvestment: requestInvestment,
    adminListPendingTransactions: adminListPendingTransactions,
    adminListAllTransactions: adminListAllTransactions,
    adminApproveTransaction: adminApproveTransaction,
    adminRejectTransaction: adminRejectTransaction,
    adminListUsers: adminListUsers,
    adminUpdateUser: adminUpdateUser,
    getPortfolio: getPortfolio,
    getTransactions: getTransactions,
    getGrowthSeries: getGrowthSeries,
    formatMoney: formatMoney,
    resetDemoData: resetDemoData,
  };
})(window);
