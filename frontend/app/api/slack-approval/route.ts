import { NextRequest, NextResponse } from "next/server"
import { slackApprovalHook } from "@/workflows/ops-agent/hooks"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const token = url.searchParams.get("token")
  const approvedParam = url.searchParams.get("approved")

  if (!token || !approvedParam) {
    return new NextResponse("Missing token or approved param", {
      status: 400,
    })
  }

  const approved = approvedParam === "true"

  await slackApprovalHook.resume(token, {
    approved,
    comment: undefined,
  })

  const html = `
    <html>
      <body style="font-family: system-ui; padding: 24px;">
        <h1>Thanks!</h1>
        <p>You marked this request as <strong>${
          approved ? "APPROVED ✅" : "REJECTED ❌"
        }</strong>.</p>
        <p>You can close this window.</p>
      </body>
    </html>
  `

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  })
}
