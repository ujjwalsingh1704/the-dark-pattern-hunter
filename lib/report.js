export function buildAuditReport({
  targetUrl,
  signupSteps = [],
  cancelSteps = [],
  findings = [],
  score = 100,
  screenshots = []
}) {
  // Deduplicate findings by type + title + evidence
  const uniqueFindingsMap = new Map();
  for (const f of findings) {
    const key = `${f.kind || f.type}_${f.title}_${f.evidence || ""}`;
    if (!uniqueFindingsMap.has(key)) {
      uniqueFindingsMap.set(key, f);
    }
  }
  const uniqueFindings = Array.from(uniqueFindingsMap.values());

  const high =
    uniqueFindings.filter(f => f.severity === "high").length;

  const medium =
    uniqueFindings.filter(f => f.severity === "medium").length;

  const low =
    uniqueFindings.filter(f => f.severity === "low").length;

  let riskLevel = "Low";

  if (score < 50) {
    riskLevel = "High";
  } else if (score < 75) {
    riskLevel = "Medium";
  }

  return {
    targetUrl,
    generatedAt: new Date().toISOString(),
    score,
    riskLevel,
    summary: {
      totalFindings: uniqueFindings.length,
      high,
      medium,
      low
    },
    exploration: {
      signupSteps: signupSteps.length,
      cancellationSteps: cancelSteps.length
    },
    findings: uniqueFindings.map((finding, index) => ({
      id: finding.id || index + 1,
      type: finding.kind || finding.type,
      title: finding.title,
      severity: finding.severity,
      confidence: finding.confidence || 0.8,
      detail: finding.detail,
      evidence: finding.evidence || "",
      screenshot: finding.screenshot || null,
      url: finding.url || null,
      step: finding.step ?? null
    })),
    signupSteps,
    cancelSteps,
    screenshots
  };
}
