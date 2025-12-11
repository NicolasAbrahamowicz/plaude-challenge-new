// app/api/slack-interactivity/route.ts
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const bodyText = await req.text()
  const payloadStr = new URLSearchParams(bodyText).get("payload") ?? "{}"
  const payload = JSON.parse(payloadStr)

  const action = payload.actions?.[0]
  const decision = action?.value // 'approve' o 'reject'
  const requestId = payload.callback_id || "unknown"

  console.log("⚡ Slack decision:", decision, "for request:", requestId)

  // Simple confirmation message visible en Slack
  return NextResponse.json({
    replace_original: true,
    text:
      decision === "approve"
        ? `✅ Approved by human operator. (Request ${requestId})`
        : `❌ Rejected by human operator. (Request ${requestId})`,
  })
}
