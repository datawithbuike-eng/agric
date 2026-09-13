/**
 * Shows a toast for every mock email AquaVestEmail sends, so the
 * notification flow (signup, deposit, withdrawal, investment) is
 * visible while testing. Include after store.js + email.js.
 */
(function (global) {
  "use strict";

  function ensureStack() {
    let stack = document.querySelector(".av-toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "av-toast-stack";
      document.body.appendChild(stack);
    }
    return stack;
  }

  function showToast(entry) {
    const stack = ensureStack();
    const el = document.createElement("div");
    el.className = "av-toast";
    el.innerHTML =
      "<strong>Email sent to " + escapeHtml(entry.to) + "</strong>" + escapeHtml(entry.subject);
    stack.appendChild(el);
    setTimeout(() => {
      el.style.transition = "opacity 0.3s";
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 300);
    }, 4500);
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = String(s);
    return d.innerHTML;
  }

  if (global.AquaVestEmail) {
    global.AquaVestEmail.onSend(showToast);
  }
})(window);
