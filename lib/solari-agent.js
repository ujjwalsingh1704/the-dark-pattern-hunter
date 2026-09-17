import { Solari } from "@solarisdk/browser";
import { nanoid } from "nanoid";
import path from "node:path";
import fs from "node:fs/promises";
import { AutonomousAgent } from "./agent.js";

const SCREENSHOT_DIR = path.join(process.cwd(), "public", "screenshots");

export async function runAudit(auditId, targetUrl) {
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });

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
