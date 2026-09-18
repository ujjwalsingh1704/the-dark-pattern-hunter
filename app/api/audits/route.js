import { NextResponse } from "next/server";
import { listAudits, saveAudit, getAudit } from "@/lib/db";
import { runAudit, newAuditId } from "@/lib/solari-agent";

export async function GET() {
  try {
    const audits = await listAudits();
    return NextResponse.json({ audits });
  } catch (err) {
    console.error("[API Error] GET /api/audits failed:", err);
    return NextResponse.json({ audits: [] });
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const targetUrl = body?.targetUrl;

    if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
      return NextResponse.json({ error: "targetUrl must be a valid http(s) URL" }, { status: 400 });
    }

    const id = newAuditId();
    const audit = {
      id,
      targetUrl,
      status: "queued",
      createdAt: new Date().toISOString(),
      signupSteps: [],
      cancelSteps: [],
      findings: [],
      score: 0
    };
    await saveAudit(audit);

    // Run the audit in the background; the client polls GET /api/audits/[id].
    (async () => {
      const current = await getAudit(id);
      if (!current) return;
      current.status = "running";
      await saveAudit(current);

      try {
        const result = await runAudit(id, targetUrl);
        const finished = await getAudit(id);
        if (!finished) return;
        Object.assign(finished, result, {
          status: "complete",
          completedAt: new Date().toISOString()
        });
        await saveAudit(finished);
      } catch (err) {
        const failed = await getAudit(id);
        if (!failed) return;
        failed.status = "failed";
        failed.error = err instanceof Error ? err.message : "Unknown error";
        await saveAudit(failed);
      }
    })();

    return NextResponse.json({ audit }, { status: 202 });
  } catch (err) {
    console.error("[API Error] POST /api/audits failed:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
