import fs from "node:fs/promises";
import path from "node:path";

import os from "node:os";

const PRIMARY_DB_PATH = path.join(process.cwd(), "data", "audits.json");
const TMP_DB_PATH = path.join(os.tmpdir(), "dark-pattern-audits.json");

function getDbPath() {
  return process.env.VERCEL ? TMP_DB_PATH : PRIMARY_DB_PATH;
}

async function readAll() {
  try {
    const dbPath = getDbPath();
    const raw = await fs.readFile(dbPath, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    try {
      if (getDbPath() !== TMP_DB_PATH) {
        const raw = await fs.readFile(TMP_DB_PATH, "utf-8");
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {}
    return [];
  }
}

async function writeAll(audits) {
  const targetPath = getDbPath();
  try {
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, JSON.stringify(audits, null, 2), "utf-8");
  } catch (err) {
    if (err.code === "EROFS" || err.code === "EACCES") {
      await fs.mkdir(path.dirname(TMP_DB_PATH), { recursive: true });
      await fs.writeFile(TMP_DB_PATH, JSON.stringify(audits, null, 2), "utf-8");
    } else {
      throw err;
    }
  }
}

export async function listAudits() {
  const audits = await readAll();
  return audits.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getAudit(id) {
  const audits = await readAll();
  return audits.find((a) => a.id === id);
}

export async function saveAudit(audit) {
  const audits = await readAll();
  const idx = audits.findIndex((a) => a.id === audit.id);
  if (idx >= 0) audits[idx] = audit;
  else audits.push(audit);
  await writeAll(audits);
}
