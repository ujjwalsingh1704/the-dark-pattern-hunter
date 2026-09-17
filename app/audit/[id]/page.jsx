"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const SEVERITY_LABEL = {
  high: "High Severity",
  medium: "Medium Severity",
  low: "Low Severity"
};

function ScoreBadge({ score }) {
  const tone = score >= 75 ? "clear" : score >= 50 ? "medium" : "flag";
  const bg =
    tone === "clear"
      ? "bg-clearfaint text-clear border-clear"
      : tone === "medium"
      ? "bg-amber-500/10 text-amber-500 border-amber-500/40"
      : "bg-flagfaint text-flag border-flag";
  return (
    <div className={`inline-flex flex-col items-center justify-center border px-4 py-2 rounded ${bg}`}>
      <span className="text-2xl font-bold font-serif">{score} / 100</span>
      <span className="text-xs uppercase tracking-wider font-semibold opacity-80">UX Health Score</span>
    </div>
  );
}

function FindingRow({ finding, index }) {
  return (
    <li className="border-b border-rule py-5 transition-colors hover:bg-panel/50 px-3 rounded">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-serif text-lg font-bold text-inkfaint">{String(index + 1).padStart(2, "0")}</span>
          <h3 className="font-serif text-lg font-bold text-ink">{finding.title}</h3>
        </div>
        <span
          className={`shrink-0 border px-2.5 py-1 text-xs font-medium uppercase tracking-wider rounded ${
            finding.severity === "high"
              ? "border-flag text-flag bg-flagfaint/50"
              : finding.severity === "medium"
              ? "border-ink text-ink bg-panel"
              : "border-inkfaint text-inkfaint bg-paper"
          }`}
        >
          {SEVERITY_LABEL[finding.severity] || finding.severity}
        </span>
      </div>
      <p className="pl-8 text-sm text-inkfaint leading-relaxed">{finding.detail}</p>
    </li>
  );
}

function FlowStepCard({ step, flowType, onSelectImage }) {
  return (
    <div className="group relative flex flex-col border border-rule bg-panel rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-rule bg-paper/60 px-4 py-2.5 text-xs">
        <span className="font-bold text-ink uppercase tracking-wider">
          {flowType} • Step {step.index + 1}
        </span>
        <span className="text-inkfaint truncate max-w-[200px]" title={step.url}>
          {step.url}
        </span>
      </div>

      {/* Screenshot Image Container */}
      <div
        className="relative bg-paper/40 cursor-zoom-in overflow-hidden aspect-[16/10] flex items-center justify-center border-b border-rule"
        onClick={() => step.screenshotPath && onSelectImage(step.screenshotPath, `${flowType} Step ${step.index + 1}`)}
      >
        {step.screenshotPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={step.screenshotPath}
            alt={step.label}
            className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center text-inkfaint p-6 text-center">
            <span className="text-2xl mb-1">📷</span>
            <span className="text-xs">No Screenshot Captured</span>
          </div>
        )}

        <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/10 transition-colors flex items-center justify-center">
          <span className="bg-ink/80 text-paper text-xs px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity font-medium">
            🔍 Click to Enlarge
          </span>
        </div>
      </div>

      {/* Action / Context details */}
      <div className="p-3 text-xs flex justify-between items-center text-inkfaint bg-panel">
        <span>{step.label}</span>
        <span className="font-mono text-[11px] bg-paper px-2 py-0.5 border border-rule rounded">
          {step.clickCount} interaction{step.clickCount === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}

export default function AuditReportPage() {
  const routeParams = useParams();
  const auditId = routeParams?.id;
  const [audit, setAudit] = useState(null);
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'signup', 'cancel'
  const [activeModalImage, setActiveModalImage] = useState(null);

  useEffect(() => {
    if (!auditId) return;
    let active = true;
    async function poll() {
      const res = await fetch(`/api/audits/${auditId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!active) return;
      setAudit(data.audit);
      if (data.audit.status === "queued" || data.audit.status === "running") {
        setTimeout(poll, 2500);
      }
    }
    poll();
    return () => {
      active = false;
    };
  }, [auditId]);

  if (!audit) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-20 text-center">
        <div className="inline-block animate-pulse text-inkfaint">Loading audit report...</div>
      </main>
    );
  }

  if (audit.status === "queued" || audit.status === "running") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-20 text-center">
        <div className="mb-6 inline-block animate-spin text-3xl">⚙️</div>
        <h2 className="mb-3 font-serif text-3xl font-bold">Auditing {audit.targetUrl}</h2>
        <p className="text-inkfaint leading-relaxed max-w-lg mx-auto">
          Walking signup and cancellation flows through an autonomous agent. Live browser session recordings and findings will render automatically once finished.
        </p>
      </main>
    );
  }

  if (audit.status === "failed") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="mb-3 font-serif text-3xl font-bold text-flag">Audit Failed</h2>
        <p className="text-inkfaint bg-flagfaint/40 border border-flag/30 p-4 rounded text-sm font-mono max-w-lg mx-auto">
          {audit.error}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      {/* Header Banner */}
      <div className="mb-10 border-b border-rule pb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="mb-1 text-xs uppercase tracking-widest font-bold text-inkfaint">UX Audit Report</p>
            <h1 className="mb-2 font-serif text-4xl font-bold text-ink">{audit.targetUrl}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-inkfaint">
              <span>{audit.findings.length} pattern{audit.findings.length === 1 ? "" : "s"} flagged</span>
              <span>•</span>
              <span>{audit.signupSteps.length} Step Signup</span>
              <span>•</span>
              <span>{audit.cancelSteps.length} Step Cancellation</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ScoreBadge score={audit.score} />
          </div>
        </div>

        {audit.recordingUrl ? (
          <div className="mt-6 flex items-center gap-3 bg-panel border border-rule px-4 py-3 rounded">
            <span className="text-lg">🎬</span>
            <div className="text-sm">
              <span className="font-semibold text-ink">Solari Session Recording Available: </span>
              <a
                href={audit.recordingUrl}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4 text-ink hover:text-flag font-medium transition-colors"
              >
                Watch full stealth browser session →
              </a>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex items-center gap-3 bg-panel border border-rule/60 px-4 py-3 rounded text-xs text-inkfaint">
            <span className="text-lg">📸</span>
            <div>
              <span className="font-semibold text-ink">Visual Audit Evidence Captured: </span>
              Full-page step-by-step screenshots captured for each signup & cancellation flow step below.
            </div>
          </div>
        )}
      </div>

      {/* Flagged Dark Patterns Section */}
      <section className="mb-14">
        <h2 className="mb-4 font-serif text-2xl font-bold border-b border-rule pb-2">
          Flagged UX Patterns ({audit.findings.length})
        </h2>
        {audit.findings.length === 0 ? (
          <div className="p-8 text-center bg-clearfaint/40 border border-clear/30 rounded text-clear font-medium">
            🎉 No dark patterns detected — this signup and cancellation flow came back clean!
          </div>
        ) : (
          <ul className="divide-y divide-rule border border-rule rounded-lg bg-paper/50 p-2">
            {audit.findings
              .slice()
              .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.severity] - { high: 0, medium: 1, low: 2 }[b.severity]))
              .map((f, i) => (
                <FindingRow key={f.id} finding={f} index={i} />
              ))}
          </ul>
        )}
      </section>

      {/* Step Exploration Visualizer (Large & Clear) */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule pb-4 mb-8">
          <div>
            <h2 className="font-serif text-2xl font-bold">Flow Comparison Exploration</h2>
            <p className="text-xs text-inkfaint mt-1">
              Inspect full step screenshots captured dynamically during signup vs. cancellation navigation.
            </p>
          </div>

          {/* Tab Filter */}
          <div className="inline-flex rounded-lg border border-rule bg-panel p-1 text-xs font-medium">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === "all" ? "bg-paper text-ink shadow-sm font-bold" : "text-inkfaint hover:text-ink"
              }`}
            >
              Side by Side
            </button>
            <button
              onClick={() => setActiveTab("signup")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === "signup" ? "bg-paper text-ink shadow-sm font-bold" : "text-inkfaint hover:text-ink"
              }`}
            >
              Signup Flow ({audit.signupSteps.length})
            </button>
            <button
              onClick={() => setActiveTab("cancel")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === "cancel" ? "bg-paper text-ink shadow-sm font-bold" : "text-inkfaint hover:text-ink"
              }`}
            >
              Cancellation Flow ({audit.cancelSteps.length})
            </button>
          </div>
        </div>

        {/* Side-by-Side View */}
        {(activeTab === "all" || activeTab === "signup") && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl font-bold text-ink flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-clear"></span>
                Signup Flow Steps ({audit.signupSteps.length})
              </h3>
            </div>
            {audit.signupSteps.length === 0 ? (
              <p className="text-sm text-inkfaint italic">No steps recorded for signup flow.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {audit.signupSteps.map((step) => (
                  <FlowStepCard
                    key={`signup-${step.index}`}
                    step={step}
                    flowType="Signup"
                    onSelectImage={(src, title) => setActiveModalImage({ src, title })}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {(activeTab === "all" || activeTab === "cancel") && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl font-bold text-ink flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-flag"></span>
                Cancellation Flow Steps ({audit.cancelSteps.length})
              </h3>
            </div>
            {audit.cancelSteps.length === 0 ? (
              <p className="text-sm text-inkfaint italic">No steps recorded for cancellation flow.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {audit.cancelSteps.map((step) => (
                  <FlowStepCard
                    key={`cancel-${step.index}`}
                    step={step}
                    flowType="Cancellation"
                    onSelectImage={(src, title) => setActiveModalImage({ src, title })}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Lightbox Screenshot Modal */}
      {activeModalImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm p-6 cursor-zoom-out"
          onClick={() => setActiveModalImage(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] bg-paper border border-rule rounded-xl overflow-hidden shadow-2xl flex flex-col cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-panel border-b border-rule px-4 py-3 text-sm">
              <span className="font-bold text-ink">{activeModalImage.title}</span>
              <button
                onClick={() => setActiveModalImage(null)}
                className="text-inkfaint hover:text-ink font-bold text-lg px-2"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[80vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeModalImage.src}
                alt={activeModalImage.title}
                className="w-full h-auto border border-rule rounded"
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
