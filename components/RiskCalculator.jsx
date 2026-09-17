"use client";

import { useState } from "react";

const PATTERN_OPTIONS = [
  { id: "urgency", label: "Countdown Timer / Scarcity Copy", penalty: 15, severity: "medium" },
  { id: "shaming", label: "Guilt-inducing Opt-out Button", penalty: 15, severity: "medium" },
  { id: "preselected", label: "Pre-checked Insurance or Add-on", penalty: 15, severity: "medium" },
  { id: "hidden_fee", label: "Surprise Service Fee at Final Step", penalty: 25, severity: "high" },
  { id: "forced_continuity", label: "Auto-renewing Free Trial", penalty: 25, severity: "high" },
  { id: "phone_cancel", label: "Phone-Call Only Cancellation", penalty: 25, severity: "high" }
];

export default function RiskCalculator() {
  const [selectedPatterns, setSelectedPatterns] = useState(["urgency", "forced_continuity"]);

  const totalPenalty = selectedPatterns.reduce((acc, id) => {
    const item = PATTERN_OPTIONS.find((p) => p.id === id);
    return acc + (item ? item.penalty : 0);
  }, 0);

  const calculatedScore = Math.max(0, 100 - totalPenalty);

  const riskLevel =
    calculatedScore < 50
      ? { label: "High Risk", color: "border-flag text-flag bg-flagfaint" }
      : calculatedScore < 75
      ? { label: "Medium Risk", color: "border-amber-600 text-amber-700 bg-amber-50" }
      : { label: "Low Risk / Clean", color: "border-clear text-clear bg-clearfaint" };

  function togglePattern(id) {
    setSelectedPatterns((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  return (
    <div className="rounded-2xl border border-rule/80 bg-paper p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-rule/60 pb-4 mb-5">
        <div>
          <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
            <span>📊</span> Interactive Dark Pattern Risk Estimator
          </h3>
          <p className="text-xs text-inkfaint mt-0.5">
            Toggle detected dark patterns to calculate real-time UX Trust Score penalties.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-ink uppercase tracking-wider block mb-2">
            Select Detected UX Behaviors:
          </label>
          {PATTERN_OPTIONS.map((p) => {
            const isChecked = selectedPatterns.includes(p.id);
            return (
              <label
                key={p.id}
                onClick={() => togglePattern(p.id)}
                className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                  isChecked
                    ? "border-ink bg-panel font-medium text-ink shadow-xs"
                    : "border-rule/60 bg-paper text-inkfaint hover:border-rule"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="rounded accent-ink cursor-pointer"
                  />
                  <span>{p.label}</span>
                </div>
                <span className="font-mono text-[11px] opacity-70">-{p.penalty} pts</span>
              </label>
            );
          })}
        </div>

        <div className="flex flex-col justify-center items-center bg-panel border border-rule/60 p-6 rounded-xl text-center">
          <span className="text-xs uppercase tracking-wider font-bold text-inkfaint mb-2">
            Estimated Trust Score
          </span>
          <div className="font-serif text-5xl font-bold text-ink mb-2">
            {calculatedScore} <span className="text-xl text-inkfaint">/ 100</span>
          </div>

          <span
            className={`inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full border mb-4 ${riskLevel.color}`}
          >
            {riskLevel.label}
          </span>

          <p className="text-xs text-inkfaint max-w-xs leading-relaxed">
            {selectedPatterns.length === 0
              ? "No patterns selected — ideal transparent signup flow."
              : `${selectedPatterns.length} pattern${selectedPatterns.length === 1 ? "" : "s"} selected accumulating ${totalPenalty} penalty points.`}
          </p>
        </div>
      </div>
    </div>
  );
}
