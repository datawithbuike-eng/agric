/**
 * AquaVest investor portal — MOCK email layer.
 *
 * There is no backend yet, so no real email can be sent from a static
 * site without a third-party client-side provider (e.g. EmailJS) or a
 * server. Every "email" triggered by the prototype (signup, deposit,
 * withdrawal, investment start — see store.js) is instead:
 *   1. appended to a local "sent mail" log (localStorage, visible on
 *      the dashboard's Notifications panel for testing), and
 *   2. logged to the browser console.
 *
 * TO WIRE UP REAL EMAIL LATER: replace the body of `send()` below with
 * either a `fetch()` call to your backend's /api/send-email endpoint,
 * or an EmailJS `emailjs.send(...)` call. Every call site in store.js
 * already passes the { to, subject, body } shape either integration
 * needs — nothing else in this codebase needs to change.
 */
(function (global) {
  "use strict";

  const LOG_KEY = "aquavest_prototype_emaillog_v1";
  const listeners = [];

  function loadLog() {
    try {
      const raw = global.localStorage.getItem(LOG_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveLog(log) {
    global.localStorage.setItem(LOG_KEY, JSON.stringify(log));
  }

  function send(message) {
    const entry = {
      id: Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      to: message.to,
      subject: message.subject,
      body: message.body,
      sentAt: new Date().toISOString(),
    };
    const log = loadLog();
    log.unshift(entry);
    // Keep the log bounded for a prototype.
    saveLog(log.slice(0, 200));

    console.log("[AquaVest mock email] to=" + entry.to + " subject=" + entry.subject);

    listeners.forEach((fn) => {
      try {
        fn(entry);
      } catch (e) {
        /* listener errors shouldn't break sending */
      }
    });

    return entry;
  }

  function getLog() {
    return loadLog();
  }

  function onSend(fn) {
    listeners.push(fn);
    return function unsubscribe() {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }

  global.AquaVestEmail = {
    send: send,
    getLog: getLog,
    onSend: onSend,
  };
})(window);
