import { NextResponse } from "next/server";
import { getAudit } from "@/lib/db";

export async function GET(_req, context) {
  try {
    const params = await context.params;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "Invalid audit ID" }, { status: 400 });
    }

    const audit = await getAudit(id);
    if (!audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    return NextResponse.json({ audit });
  } catch (err) {
    console.error("[API Error] GET /api/audits/[id] failed:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
