import { NextRequest, NextResponse } from "next/server"
import { start } from "workflow/api"
import { opsAgentWorkflow, type ClientMessage, type AgentResult } from "@/workflows/ops-agent/workflow"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const messages = (body.messages ?? []) as ClientMessage[]

    console.log("[/api/agent] Incoming:", messages)

    const run = await start(opsAgentWorkflow, [messages])
    const result = (await run.returnValue) as AgentResult

    console.log("[/api/agent] Result:", result)

    return NextResponse.json(result)
  } catch (err: any) {
    console.error("[/api/agent] Internal error:", err)
    return NextResponse.json(
      {
        error: "Internal error in opsAgentWorkflow",
        message: err?.message ?? "Unknown error",
      },
      { status: 500 },
    )
  }
}
