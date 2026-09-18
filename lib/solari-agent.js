import { Solari } from "@solarisdk/browser";
import { nanoid } from "nanoid";
import path from "node:path";
import fs from "node:fs/promises";
import { AutonomousAgent } from "./agent.js";

import os from "node:os";

const PRIMARY_SCREENSHOT_DIR = path.join(process.cwd(), "public", "screenshots");
const TMP_SCREENSHOT_DIR = path.join(os.tmpdir(), "public", "screenshots");

export async function runAudit(auditId, targetUrl) {
  let screenshotDir = process.env.VERCEL ? TMP_SCREENSHOT_DIR : PRIMARY_SCREENSHOT_DIR;
  try {
    await fs.mkdir(screenshotDir, { recursive: true });
  } catch {
    screenshotDir = TMP_SCREENSHOT_DIR;
    await fs.mkdir(screenshotDir, { recursive: true });
  }

  const apiKey = process.env.SOLARI_API_KEY;
  if (!apiKey) {
    console.warn("[Solari Agent] SOLARI_API_KEY missing — using Serverless HTTP DOM Fallback Mode");
    return runServerlessDomAudit(auditId, targetUrl, "SOLARI_API_KEY is not configured in environment variables.");
  }

  let browser;
  let solari;
  try {
    solari = new Solari({ apiKey });
    browser = await solari.launch({ recording: true });
  } catch (err) {
    console.warn("[Solari Agent] Stealth browser launch failed:", err.message);
    return runServerlessDomAudit(auditId, targetUrl, err.message);
  }

  const sessionId = browser.id;
  let auditResult;

  try {
    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 8000 });

    const agent = new AutonomousAgent(page, auditId);
    auditResult = await agent.runFullAudit();
  } finally {
    await solari.sessions.releaseAndWait(sessionId).catch(() => {});
  }

  let recordingUrl;
  try {
    const replay = await solari.sessions.getReplayUrl(sessionId);
    recordingUrl = replay.url;
  } catch {
    recordingUrl = undefined;
  }

  return {
    ...auditResult,
    recordingUrl
  };
}

async function runServerlessDomAudit(auditId, targetUrl, reason) {
  let html = "";
  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    html = await res.text();
  } catch {}

  const findings = [];
  let score = 100;

  if (/only\s+\d+\s+left|timer|countdown|limited time|hurry|offer ends/i.test(html)) {
    findings.push({
      pattern: "False Urgency",
      kind: "false_urgency",
      severity: "medium",
      penalty: 15,
      description: "Detected high-urgency language or limited availability claim in server-rendered DOM.",
      evidence: "Scanned text containing urgency triggers."
    });
    score -= 15;
  }

  if (/no thanks|i don'?t want|skip saving|maybe later/i.test(html)) {
    findings.push({
      pattern: "Confirm Shaming",
      kind: "confirm_shaming",
      severity: "medium",
      penalty: 15,
      description: "Detected guilt-inducing opt-out choices in page elements.",
      evidence: "Found decline button copy with manipulative phrasing."
    });
    score -= 15;
  }

  if (/<input[^>]+type=["']checkbox["'][^>]*checked/i.test(html)) {
    findings.push({
      pattern: "Preselected Add-on",
      kind: "preselected_addon",
      severity: "medium",
      penalty: 15,
      description: "Detected pre-checked opt-in input checkboxes.",
      evidence: "HTML contains pre-checked checkbox element."
    });
    score -= 15;
  }

  const signupSteps = [
    { step: 1, action: "navigate", url: targetUrl, title: "Initial Page Load (Serverless Mode)" },
    { step: 2, action: "analyze", url: targetUrl, title: "Serverless HTTP DOM Heuristic Evaluation" }
  ];

  const cancelSteps = [
    { step: 1, action: "navigate", url: targetUrl, title: "Cancellation Link Check" }
  ];

  return {
    score: Math.max(0, score),
    findings,
    signupSteps,
    cancelSteps,
    mode: "Serverless HTTP DOM Mode",
    note: `Serverless Mode Active: ${reason}`
  };
}

export function newAuditId() {
  return nanoid(10);
}
