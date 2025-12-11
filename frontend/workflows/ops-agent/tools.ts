// frontend/workflows/ops-agent/tools.ts
import { tool } from "ai"
import { fetch as stepFetch } from "workflow"
import { z } from "zod"
import { getLatestApproval } from "@/lib/approvals-store"

const SLACK_APPROVAL_WEBHOOK_URL = process.env.SLACK_APPROVAL_WEBHOOK_URL
const PUBLIC_BASE_URL =
  process.env.PUBLIC_BASE_URL || "http://localhost:3000"

export const opsTools = {
  requestSlackApproval: tool({
    description:
      "Send a request to Slack so a human operator can approve or reject a risky operation. The 'reason' should include the user's original request or a very close paraphrase.",
    inputSchema: z.object({
      operationType: z.enum([
        "refund",
        "high_value",
        "ambiguous",
        "account_change",
      ]),
      risk: z.enum(["low", "medium", "high"]),
      reason: z.string(),
      amount: z.number().optional(),
    }),
    async execute(input) {
      "use workflow"

      console.log("[opsTools.requestSlackApproval] Called with input:", input)

      if (!SLACK_APPROVAL_WEBHOOK_URL) {
        console.error(
          "[opsTools.requestSlackApproval] Missing SLACK_APPROVAL_WEBHOOK_URL env var",
        )
        return {
          ok: false,
          messageForUser:
            "I tried to request human approval in Slack, but the Slack configuration is missing.",
        }
      }

      const approvalId = crypto.randomUUID()

      const baseUrl = PUBLIC_BASE_URL.replace(/\/$/, "")
      const decisionUrlBase = `${baseUrl}/api/slack-decision?id=${encodeURIComponent(
        approvalId,
      )}`

      const amountParam =
        typeof input.amount === "number"
          ? `&amount=${encodeURIComponent(String(input.amount))}`
          : ""

      const approveUrl = `${decisionUrlBase}&decision=approve${amountParam}`
      const rejectUrl = `${decisionUrlBase}&decision=reject${amountParam}`

      const userMessage =
        (input as any).userMessage &&
        typeof (input as any).userMessage === "string"
          ? (input as any).userMessage
          : undefined

      const lines: string[] = [
        "*Plaude Agent – approval requested*",
        `• Operation type: ${input.operationType}`,
        `• Risk level: ${input.risk}`,
        `• Amount: ${input.amount ?? "n/a"}`,
        `• Reason (AI summary): ${input.reason}`,
      ]

      if (userMessage) {
        lines.push(`• Original user request: ${userMessage}`)
      }

      lines.push(
        "",
        "*Decision (click one):*",
        `Approve: ${approveUrl}`,
        `Reject: ${rejectUrl}`,
      )

      const text = lines.join("\n")

      console.log(
        "[opsTools.requestSlackApproval] Sending payload to Slack webhook:",
        {
          webhookUrl: SLACK_APPROVAL_WEBHOOK_URL,
          approvalId,
          text,
        },
      )

      try {
        const res = await stepFetch(SLACK_APPROVAL_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        })

        const bodyText = await res.text().catch(() => "")

        if (!res.ok) {
          console.error(
            "[opsTools.requestSlackApproval] Slack webhook HTTP error",
            res.status,
            bodyText,
          )

          return {
            ok: false,
            messageForUser:
              "I'm having trouble notifying a human operator in Slack for approval.",
          }
        }

        console.log(
          "[opsTools.requestSlackApproval] Slack webhook success. Status:",
          res.status,
          "Body:",
          bodyText,
        )

        return {
          ok: true,
          approvalId,
          messageForUser:
            "I've sent your request to an internal operator in Slack for approval.",
        }
      } catch (err) {
        console.error(
          "[opsTools.requestSlackApproval] Exception while calling Slack webhook:",
          err,
        )
        return {
          ok: false,
          messageForUser:
            "I'm having trouble contacting a human operator in Slack for approval.",
        }
      }
    },
  }),

  checkLatestApprovalStatus: tool({
    description:
      "Check the most recent human decision (approve or reject) recorded via Slack for a risky operation.",
    // Acepta literalmente cualquier cosa (incluye null/undefined)
    // para evitar errores de Zod cuando el modelo llama sin argumentos.
    inputSchema: z.any().optional(),
    async execute(_input) {
      "use workflow"

      console.log(
        "[opsTools.checkLatestApprovalStatus] Called with input:",
        _input,
      )

      const latest = getLatestApproval()

      console.log(
        "[opsTools.checkLatestApprovalStatus] Current latest approval from store:",
        latest,
      )

      if (!latest) {
        const payload = {
          found: false as const,
          messageForAgent:
            "No recent human Slack decision has been recorded yet.",
        }

        console.log(
          "[opsTools.checkLatestApprovalStatus] Returning payload (no approval):",
          payload,
        )

        return payload
      }

      const payload = {
        found: true as const,
        id: latest.id,
        decision: latest.decision, // "approve" | "reject"
        amount: latest.amount ?? null,
        messageForAgent:
          latest.decision === "approve"
            ? `The most recent human decision is APPROVE for amount ${latest.amount ?? "n/a"}.`
            : `The most recent human decision is REJECT for amount ${latest.amount ?? "n/a"}.`,
      }

      console.log(
        "[opsTools.checkLatestApprovalStatus] Returning payload (with approval):",
        payload,
      )

      return payload
    },
  }),
}
