// frontend/app/api/approval-status/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getLatestApproval } from "@/lib/approvals-store"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const id = url.searchParams.get("id")

  console.log("[/api/approval-status] Incoming request:", {
    url: req.url,
    id,
  })

  if (!id) {
    console.warn("[/api/approval-status] Missing id parameter")
    return NextResponse.json(
      { status: "error", error: "Missing id parameter" },
      { status: 400 },
    )
  }

  const latest = getLatestApproval()

  console.log("[/api/approval-status] Current latestApproval:", latest)

  if (!latest || latest.id !== id) {
    console.log(
      "[/api/approval-status] No matching approval for this id. Returning pending.",
    )
    return NextResponse.json({ status: "pending" })
  }

  const status = latest.decision === "approve" ? "approved" : "rejected"

  const body = {
    status, // "approved" | "rejected"
    message:
      status === "approved"
        ? `The operation with id ${id} has been approved by a human operator.`
        : `The operation with id ${id} has been rejected by a human operator.`,
    amount: latest.amount ?? null,
  }

  console.log("[/api/approval-status] Returning response:", body)

  return NextResponse.json(body)
}
