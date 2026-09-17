"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DarkPatternQuiz from "@/components/DarkPatternQuiz";
import RiskCalculator from "@/components/RiskCalculator";
import ReauditModal from "@/components/ReauditModal";

const SAMPLE_SITES = [
  { label: "Amazon", url: "https://amazon.com", icon: "🛒" },
  { label: "Booking.com", url: "https://booking.com", icon: "🏨" },
  { label: "Duolingo", url: "https://duolingo.com", icon: "🦉" },
  { label: "Coursera", url: "https://coursera.org", icon: "🎓" },
  { label: "Adobe", url: "https://adobe.com", icon: "🎨" }
];

const LEADERBOARD_SHAME = [
  { name: "Streaming Giant", domain: "stream-flex.example", score: 28, issue: "Hidden phone-only cancellation & auto-renewing trial", severity: "high" },
  { name: "Travel Deals Co", domain: "quickfly-travel.example", score: 42, issue: "Fake countdown timer & pre-selected travel insurance", severity: "high" },
  { name: "Fitness App", domain: "workout-plus.example", score: 55, issue: "Confirm-shaming decline option on checkout", severity: "medium" }
];

const LEADERBOARD_CLEAN = [
  { name: "Open Cloud Portal", domain: "cloud-dev.example", score: 96, issue: "Transparent 1-click cancellation & clear pricing", severity: "clean" },
  { name: "Edu Course Hub", domain: "learn-fast.example", score: 92, issue: "Explicit opt-in checkboxes & no hidden fees", severity: "clean" }
];

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [audits, setAudits] = useState([]);
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState("shame");
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [selectedAlertUrl, setSelectedAlertUrl] = useState("");

  useEffect(() => {
    fetch("/api/audits")
      .then((r) => r.json())
      .then((d) => setAudits(d.audits ?? []))
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl: url })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start audit");
      router.push(`/audit/${data.audit.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  function handleSelectPill(targetUrl) {
    setUrl(targetUrl);
  }

  function openAlert(targetUrl) {
    setSelectedAlertUrl(targetUrl);
    setIsAlertModalOpen(true);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      {/* Re-audit Alert Modal */}
      <ReauditModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        targetUrl={selectedAlertUrl}
      />

      {/* Top Banner / Pulse Status */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-rule/60 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-clear opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-clear"></span>
          </span>
          <span className="font-mono text-xs font-semibold text-inkfaint uppercase tracking-wider">
            Solari AI Autonomous Agent • Active Stealth Engine
          </span>
        </div>

        <button
          onClick={() => openAlert(url || "https://example.com")}
          className="inline-flex items-center gap-2 rounded-full border border-rule bg-panel px-3.5 py-1.5 text-xs font-medium text-ink hover:border-ink transition-all shadow-2xs"
        >
          <span>🔔 Subscribe to Weekly Re-Audits</span>
        </button>
      </div>

      {/* Hero Header */}
      <section className="mb-12 text-center max-w-3xl mx-auto">
        <div className="inline-block mb-3 rounded-full border border-flag/30 bg-flagfaint/60 px-3.5 py-1 text-xs font-semibold text-flag uppercase tracking-widest">
          Dark Pattern Hunter AI 🔍
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold leading-tight text-ink mb-4">
          Unmask Manipulative UX with Autonomous AI Evidence
        </h1>
        <p className="text-sm sm:text-base text-inkfaint leading-relaxed max-w-2xl mx-auto">
          Our stealth browser agent navigates real multi-step signup and cancellation flows, uncovering preselected add-ons, confirm-shaming, drip fees, and forced continuity with visual receipts.
        </p>
      </section>

      {/* Main Audit Launcher Input */}
      <section className="mb-14 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-rule/80 bg-panel p-4 sm:p-5 shadow-sm transition-all focus-within:shadow-md">
          <label htmlFor="url" className="mb-2 block text-xs font-bold text-ink uppercase tracking-wider">
            Target Website URL
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="url"
              type="url"
              required
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 rounded-xl border border-rule bg-paper px-4 py-3 text-sm text-ink outline-none focus:border-ink font-mono"
            />
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl border border-ink bg-ink px-6 py-3 text-sm font-semibold text-paper transition hover:bg-transparent hover:text-ink disabled:opacity-50 shrink-0 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="animate-spin text-lg">⚙️</span>
                  <span>Launching Agent…</span>
                </>
              ) : (
                <>
                  <span>Run Audit Flow</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
          {error && <p className="mt-2.5 text-xs text-flag font-mono font-medium">{error}</p>}

          {/* Quick Launch Pills */}
          <div className="mt-4 pt-3 border-t border-rule/60 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-inkfaint font-medium mr-1">Quick Try:</span>
            {SAMPLE_SITES.map((site) => (
              <button
                key={site.label}
                type="button"
                onClick={() => handleSelectPill(site.url)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rule/60 bg-paper px-2.5 py-1 text-xs text-ink hover:border-ink hover:bg-panel transition-all"
              >
                <span>{site.icon}</span>
                <span>{site.label}</span>
              </button>
            ))}
          </div>
        </form>
      </section>

      {/* Interactive Tabs / Leaderboard Section */}
      <section className="mb-14">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule pb-4 mb-6">
          <div>
            <h2 className="font-serif text-2xl font-bold text-ink">Dark Pattern UX Index</h2>
            <p className="text-xs text-inkfaint mt-0.5">
              Live audit scores & flagged manipulative UI patterns from recent web audits.
            </p>
          </div>

          <div className="inline-flex rounded-xl border border-rule bg-panel p-1 text-xs font-medium">
            <button
              onClick={() => setActiveLeaderboardTab("shame")}
              className={`px-4 py-1.5 rounded-lg transition-all ${
                activeLeaderboardTab === "shame"
                  ? "bg-flagfaint text-flag border border-flag/30 font-bold shadow-2xs"
                  : "text-inkfaint hover:text-ink"
              }`}
            >
              Hall of Shame 🔴
            </button>
            <button
              onClick={() => setActiveLeaderboardTab("clean")}
              className={`px-4 py-1.5 rounded-lg transition-all ${
                activeLeaderboardTab === "clean"
                  ? "bg-clearfaint text-clear border border-clear/30 font-bold shadow-2xs"
                  : "text-inkfaint hover:text-ink"
              }`}
            >
              Safest Signups 🟢
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(activeLeaderboardTab === "shame" ? LEADERBOARD_SHAME : LEADERBOARD_CLEAN).map((item, i) => (
            <div
              key={i}
              className="rounded-xl border border-rule/80 bg-panel p-4 hover:border-ink/60 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-serif font-bold text-ink text-base">{item.name}</h3>
                  <span
                    className={`font-serif font-bold text-sm px-2.5 py-0.5 rounded border ${
                      item.score < 50
                        ? "border-flag text-flag bg-flagfaint"
                        : "border-clear text-clear bg-clearfaint"
                    }`}
                  >
                    Score {item.score}
                  </span>
                </div>
                <p className="font-mono text-xs text-inkfaint mb-3 truncate">{item.domain}</p>
                <p className="text-xs text-ink leading-relaxed mb-4">{item.issue}</p>
              </div>

              <div className="pt-3 border-t border-rule/40 flex justify-between items-center text-xs">
                <span className="text-inkfaint">Verified by Autonomous Agent</span>
                <button
                  onClick={() => openAlert(`https://${item.domain}`)}
                  className="text-ink hover:underline font-semibold"
                >
                  Set Alert 🔔
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Widgets Grid (Quiz + Risk Estimator) */}
      <section className="mb-14 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <DarkPatternQuiz />
        <RiskCalculator />
      </section>

      {/* Past Audits Section */}
      <section className="mb-12">
        <h2 className="mb-4 font-serif text-2xl font-bold text-ink border-b border-rule pb-2">
          Recent Audit History ({audits.length})
        </h2>
        {audits.length === 0 ? (
          <div className="p-8 text-center bg-panel border border-rule rounded-xl text-inkfaint text-sm">
            No audits recorded yet — submit a URL above to launch your first stealth audit.
          </div>
        ) : (
          <div className="divide-y divide-rule border border-rule rounded-xl bg-paper/60 overflow-hidden">
            {audits.map((a) => (
              <a
                key={a.id}
                href={`/audit/${a.id}`}
                className="flex items-center justify-between p-4 text-sm hover:bg-panel transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🌐</span>
                  <div>
                    <span className="font-mono font-semibold text-ink group-hover:text-flag transition-colors">
                      {a.targetUrl}
                    </span>
                    <span className="block text-xs text-inkfaint">
                      Audit ID: {a.id}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`font-serif font-bold text-xs px-3 py-1 rounded border uppercase tracking-wider ${
                      a.status === "complete"
                        ? a.score < 50
                          ? "border-flag text-flag bg-flagfaint"
                          : "border-clear text-clear bg-clearfaint"
                        : "border-rule text-inkfaint bg-panel"
                    }`}
                  >
                    {a.status === "complete" ? `Score ${a.score}` : a.status}
                  </span>
                  <span className="text-inkfaint group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
