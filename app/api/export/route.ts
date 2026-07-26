import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, type Action, type IntelItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADER_FILL = "FF1D4ED8"; // blue-700
const OPP_FILL = "FFD1FAE5"; // emerald-100
const THREAT_FILL = "FFFFE4E6"; // rose-100

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle" };
  });
  row.height = 20;
}

export async function GET() {
  const supabase = await createClient();

  const [{ data: itemsData, error: itemsErr }, { data: actionsData, error: actErr }] =
    await Promise.all([
      supabase
        .from("intel_items")
        .select("*")
        .order("priority_score", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("actions").select("*").order("created_at", { ascending: true }),
    ]);

  if (itemsErr || actErr) {
    return NextResponse.json(
      { error: itemsErr?.message ?? actErr?.message ?? "Failed to load data for export." },
      { status: 500 },
    );
  }

  const items = (itemsData as IntelItem[]) ?? [];
  const actions = (actionsData as Action[]) ?? [];
  const titleById = new Map(items.map((i) => [i.id, i.title]));
  const actionCount = new Map<string, number>();
  for (const a of actions) {
    actionCount.set(a.intel_item_id, (actionCount.get(a.intel_item_id) ?? 0) + 1);
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Market Intel — MP Biomedicals BD";
  wb.created = new Date();

  // ── Sheet 1: Intel Items ─────────────────────────────────────────────────
  const s1 = wb.addWorksheet("Intel Items", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  s1.columns = [
    { header: "Priority", key: "priority", width: 10 },
    { header: "Type", key: "type", width: 13 },
    { header: "Title", key: "title", width: 48 },
    { header: "Status", key: "status", width: 12 },
    { header: "Confidence", key: "confidence", width: 12 },
    { header: "Source", key: "source", width: 12 },
    { header: "Review", key: "review", width: 12 },
    { header: "Actions", key: "actions", width: 9 },
    { header: "Recommendation", key: "recommendation", width: 55 },
    { header: "Source URL", key: "source_url", width: 40 },
    { header: "Created", key: "created", width: 12 },
  ];
  styleHeader(s1.getRow(1));

  for (const it of items) {
    const row = s1.addRow({
      priority: Math.round(it.priority_score),
      type: it.type === "opportunity" ? "Opportunity" : "Threat",
      title: it.title,
      status: STATUS_LABELS[it.status] ?? it.status,
      confidence: typeof it.confidence === "number" ? it.confidence : "",
      source: it.source,
      review: it.review_status,
      actions: actionCount.get(it.id) ?? 0,
      recommendation: it.recommendation ?? "",
      source_url: it.source_url ?? "",
      created: it.created_at ? new Date(it.created_at) : "",
    });
    const typeCell = row.getCell("type");
    typeCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: it.type === "opportunity" ? OPP_FILL : THREAT_FILL },
    };
    row.getCell("confidence").numFmt = "0%";
    row.getCell("created").numFmt = "yyyy-mm-dd";
    row.getCell("title").alignment = { wrapText: true, vertical: "top" };
    row.getCell("recommendation").alignment = { wrapText: true, vertical: "top" };
  }
  s1.autoFilter = { from: "A1", to: "K1" };

  // ── Sheet 2: Actions ─────────────────────────────────────────────────────
  const s2 = wb.addWorksheet("Actions", { views: [{ state: "frozen", ySplit: 1 }] });
  s2.columns = [
    { header: "Intel item", key: "intel", width: 45 },
    { header: "Action", key: "title", width: 40 },
    { header: "Type", key: "type", width: 12 },
    { header: "Status", key: "status", width: 13 },
    { header: "Assignee", key: "assignee", width: 20 },
    { header: "Role", key: "role", width: 22 },
    { header: "Due date", key: "due", width: 12 },
    { header: "Notes", key: "notes", width: 50 },
    { header: "Created", key: "created", width: 12 },
  ];
  styleHeader(s2.getRow(1));

  for (const a of actions) {
    const row = s2.addRow({
      intel: titleById.get(a.intel_item_id) ?? "(deleted item)",
      title: a.title,
      type: a.action_type ?? "",
      status: STATUS_LABELS[a.status] ?? a.status,
      assignee: a.assignee_name ?? "",
      role: a.assignee_role ?? "",
      due: a.due_date ? new Date(a.due_date) : "",
      notes: a.description ?? "",
      created: a.created_at ? new Date(a.created_at) : "",
    });
    row.getCell("due").numFmt = "yyyy-mm-dd";
    row.getCell("created").numFmt = "yyyy-mm-dd";
    row.getCell("intel").alignment = { wrapText: true, vertical: "top" };
    row.getCell("notes").alignment = { wrapText: true, vertical: "top" };
  }
  s2.autoFilter = { from: "A1", to: "I1" };

  const buffer = await wb.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="market-intel-${date}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
