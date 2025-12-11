// frontend/app/api/slack-decision/route.ts
import { NextRequest, NextResponse } from "next/server"
import { saveApproval } from "@/lib/approvals-store"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const idParam = url.searchParams.get("id")
  const decisionParam = url.searchParams.get("decision")
  const amountParam = url.searchParams.get("amount")

  console.log("[/api/slack-decision] Incoming request:", {
    url: req.url,
    idParam,
    decisionParam,
    amountParam,
  })

  const id = idParam || crypto.randomUUID()
  const amount = amountParam ? Number(amountParam) : undefined

  const decision =
    decisionParam === "approve" || decisionParam === "reject"
      ? decisionParam
      : null

  if (!decision) {
    console.warn(
      "[/api/slack-decision] Invalid or missing decisionParam:",
      decisionParam,
    )

    return new NextResponse(
      `<html><body><h1>Invalid decision. Please close this window.</h1></body></html>`,
      {
        status: 400,
        headers: { "Content-Type": "text/html" },
      },
    )
  }

  console.log("[/api/slack-decision] Saving approval to store:", {
    id,
    decision,
    amount,
  })

  saveApproval({ id, decision, amount })

  const message =
    decision === "approve"
      ? "✅ Approval recorded. You can close this window."
      : "❌ Rejection recorded. You can close this window."

  const html = `
    <html>
      <body>
        <h1>${message}</h1>
        <p>Approval ID: <code>${id}</code></p>
        ${
          typeof amount === "number"
            ? `<p>Amount: <strong>${amount}</strong></p>`
            : ""
        }
      </body>
    </html>
  `

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  })
}
