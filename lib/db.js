import fs from "node:fs/promises";
import path from "node:path";

const DB_PATH = path.join(process.cwd(), "data", "audits.json");

async function readAll() {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeAll(audits) {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(audits, null, 2), "utf-8");
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
