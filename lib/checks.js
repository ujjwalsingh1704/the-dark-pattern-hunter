import { nanoid } from "nanoid";

function normalize(text = "") {
  return text
    .replace(/\s+/g, " ")
    .trim();
}

function makeFinding({
  kind,
  title,
  severity,
  detail,
  evidence,
  confidence = 0.8,
  stepIndex
}) {
  return {
    id: nanoid(8),
    kind,
    title,
    severity,
    detail,
    evidence,
    confidence,
    stepIndex
  };
}

// ---------------------------------------------------------
// 1. FALSE URGENCY
// ---------------------------------------------------------
export async function checkFalseUrgency(page, stepIndex) {
  const text = normalize(
    await page.locator("body").innerText().catch(() => "")
  );

  const urgencyPatterns = [
    /only\s+\d+\s+(left|remaining)/i,
    /limited\s+time/i,
    /act\s+now/i,
    /hurry/i,
    /ends?\s+(today|soon|tonight)/i,
    /offer\s+expires?/i,
    /last\s+chance/i,
    /only\s+\d+\s+(minutes?|hours?)\s+left/i,
    /sale\s+ends?/i
  ];

  const matched = urgencyPatterns.find(
    pattern => pattern.test(text)
  );

  if (!matched) {
    return [];
  }

  return [
    makeFinding({
      kind: "false_urgency",
      title: "Possible false urgency",
      severity: "medium",
      detail:
        "The page uses urgency or scarcity messaging that may pressure the user to act quickly.",
      evidence: text.match(matched)?.[0] || "Urgency messaging detected.",
      confidence: 0.75,
      stepIndex
    })
  ];
}

// ---------------------------------------------------------
// 2. CONFIRM SHAMING
// ---------------------------------------------------------
export async function checkConfirmShaming(page, stepIndex) {
  const elements = await page
    .locator("button, a, [role='button'], label")
    .allTextContents()
    .catch(() => []);

  const shamePatterns = [
    /no\s+thanks,?\s+i('d|\s+would)?\s+(rather|prefer)/i,
    /no,?\s+i\s+don't\s+want\s+(to\s+save|free|discount|benefits|more)/i,
    /i\s+(hate|don't\s+care\s+about)\s+(saving|discounts|security|money)/i,
    /pay\s+full\s+price/i,
    /miss\s+out\s+on\s+exclusive/i,
    /decline\s+and\s+lose/i
  ];

  const matchedText = elements.find((text) =>
    shamePatterns.some((pattern) => pattern.test(text))
  );

  if (!matchedText) {
    return [];
  }

  return [
    makeFinding({
      kind: "confirm_shaming",
      title: "Possible confirm-shaming",
      severity: "medium",
      detail:
        "The page presents an option alongside guilt-inducing or shameful language to influence user choice.",
      evidence: matchedText.trim(),
      confidence: 0.85,
      stepIndex
    })
  ];
}

// ---------------------------------------------------------
// 3. PRESELECTED OPTIONS
// ---------------------------------------------------------
export async function checkPreselectedOptions(page, stepIndex) {
  const checked = await page
    .locator("input[type='checkbox']:checked")
    .count()
    .catch(() => 0);

  if (checked === 0) {
    return [];
  }

  const selectedLabels = await page.evaluate(() => {
    const result = [];
    document
      .querySelectorAll("input[type='checkbox']:checked")
      .forEach(input => {
        const label =
          input.closest("label")?.innerText ||
          input.parentElement?.innerText ||
          input.getAttribute("aria-label") ||
          "";

        result.push(label.trim());
      });
    return result;
  }).catch(() => []);

  return [
    makeFinding({
      kind: "preselected_option",
      title: "Preselected optional option",
      severity: "medium",
      detail:
        "One or more checkboxes were already selected when the page was opened.",
      evidence: selectedLabels.join(" | ") || "Preselected checkbox detected.",
      confidence: 0.8,
      stepIndex
    })
  ];
}

// ---------------------------------------------------------
// 4. HIDDEN FEES
// ---------------------------------------------------------
export async function checkHiddenFees(page, stepIndex) {
  const text = normalize(
    await page.locator("body").innerText().catch(() => "")
  );

  const feePattern =
    /(service fee|processing fee|platform fee|convenience fee|handling fee|additional fee|taxes? and fees?)/i;

  const match = text.match(feePattern);

  if (!match) {
    return [];
  }

  return [
    makeFinding({
      kind: "hidden_fee",
      title: "Possible additional fee",
      severity: "high",
      detail:
        "The page contains an additional fee that should be compared against earlier pricing information.",
      evidence: match[0],
      confidence: 0.7,
      stepIndex
    })
  ];
}

// ---------------------------------------------------------
// 5. FORCED CONTINUITY
// ---------------------------------------------------------
export async function checkForcedContinuity(page, stepIndex) {
  const text = normalize(
    await page.locator("body").innerText().catch(() => "")
  );

  const trial =
    /(free trial|trial period|try for free|start your free)/i.test(text);

  const automatic =
    /(automatically renew|auto.?renew|charged after|billing begins|subscription renews)/i
      .test(text);

  if (!trial || !automatic) {
    return [];
  }

  return [
    makeFinding({
      kind: "forced_continuity",
      title: "Possible forced continuity",
      severity: "high",
      detail:
        "The page combines a free-trial offer with automatic renewal or future billing language.",
      evidence: "Free trial + automatic renewal language detected.",
      confidence: 0.82,
      stepIndex
    })
  ];
}

// ---------------------------------------------------------
// RUN ALL DETECTORS
// ---------------------------------------------------------
export async function runAllChecks(page, stepIndex) {
  const results = [];

  const checks = [
    checkFalseUrgency,
    checkConfirmShaming,
    checkPreselectedOptions,
    checkHiddenFees,
    checkForcedContinuity
  ];

  for (const check of checks) {
    try {
      const findings = await check(page, stepIndex);
      if (findings?.length) {
        results.push(...findings);
      }
    } catch (error) {
      console.warn(
        `[Checks] ${check.name} failed: ${error.message}`
      );
    }
  }

  return results;
}

// ---------------------------------------------------------
// FLOW ASYMMETRY
// ---------------------------------------------------------
export function checkFlowAsymmetry(
  signupSteps,
  cancelSteps
) {
  if (signupSteps < 2 || cancelSteps < 2) {
    return [];
  }

  if (cancelSteps <= signupSteps * 2) {
    return [];
  }

  return [
    makeFinding({
      kind: "difficult_cancellation",
      title: "Possible difficult cancellation",
      severity: "high",
      detail:
        `Signup required ${signupSteps} step(s), while cancellation required ${cancelSteps} step(s).`,
      evidence:
        `Signup: ${signupSteps} steps; Cancellation: ${cancelSteps} steps.`,
      confidence: 0.78,
      stepIndex: cancelSteps
    })
  ];
}

// ---------------------------------------------------------
// SCORE
// ---------------------------------------------------------
export function scoreFindings(findings) {
  let penalty = 0;

  for (const finding of findings) {
    if (finding.severity === "high") {
      penalty += 25;
    }
    if (finding.severity === "medium") {
      penalty += 15;
    }
    if (finding.severity === "low") {
      penalty += 5;
    }
  }

  return Math.max(0, 100 - penalty);
}
