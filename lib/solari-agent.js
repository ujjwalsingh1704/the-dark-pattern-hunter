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
    throw new Error("SOLARI_API_KEY is not set. Add it to .env.local — get one at console.getsolari.com");
  }

  const solari = new Solari({ apiKey });
  const browser = await solari.launch({ recording: true });
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

export function newAuditId() {
  return nanoid(10);
}
