"use client";

import { useState } from "react";

export default function ReauditModal({ isOpen, onClose, targetUrl }) {
  const [email, setEmail] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 backdrop-blur-xs p-6"
      onClick={onClose}
    >
      <div
        className="relative max-w-md w-full bg-paper border border-rule rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-rule pb-3 mb-4">
          <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
            🔔 Set Automated Re-Audit Alert
          </h3>
          <button
            onClick={onClose}
            className="text-inkfaint hover:text-ink font-bold text-lg px-2"
          >
            ✕
          </button>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-inkfaint leading-relaxed">
              Never miss a stealth UX change. We&apos;ll automatically re-run our autonomous AI agent on <strong className="text-ink font-mono">{targetUrl || "your target site"}</strong> and notify you if new dark patterns appear.
            </p>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Notification Email
              </label>
              <input
                type="email"
                required
                placeholder="your.name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-rule bg-panel px-3 py-2 text-xs text-ink rounded-lg outline-none focus:border-ink"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Audit Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full border border-rule bg-panel px-3 py-2 text-xs text-ink rounded-lg outline-none focus:border-ink"
              >
                <option value="weekly">Every Week (Recommended)</option>
                <option value="biweekly">Every 2 Weeks</option>
                <option value="monthly">Every Month</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="border border-rule bg-panel px-4 py-2 text-xs text-ink rounded-lg font-medium hover:border-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="border border-ink bg-ink px-5 py-2 text-xs text-paper rounded-lg font-medium hover:bg-transparent hover:text-ink transition-colors"
              >
                Activate Automated Audits 🚀
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-6">
            <span className="text-4xl mb-2 block">🎉</span>
            <h4 className="font-serif text-lg font-bold text-ink mb-1">
              Alert Subscription Activated!
            </h4>
            <p className="text-xs text-inkfaint leading-relaxed mb-5">
              We will re-audit <strong className="text-ink font-mono">{targetUrl || "this site"}</strong> {frequency} and send evidence snapshots directly to <strong className="text-ink">{email}</strong>.
            </p>
            <button
              onClick={onClose}
              className="border border-ink bg-ink text-paper text-xs px-6 py-2 rounded-lg font-medium hover:bg-transparent hover:text-ink transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
