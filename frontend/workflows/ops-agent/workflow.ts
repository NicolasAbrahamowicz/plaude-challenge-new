// frontend/workflows/ops-agent/workflow.ts
import { DurableAgent } from "@workflow/ai/agent"
import { getWritable } from "workflow"
import { groq } from "@ai-sdk/groq"
import type { ModelMessage, UIMessageChunk } from "ai"

import { OPS_AGENT_INSTRUCTIONS } from "@/ai/ops-instructions"
import { opsTools } from "./tools"

export type ClientMessage = {
  role: "user" | "agent"
  content: string
}

export type AgentResult = {
  reply: string
  requiredApproval: boolean
  approvalId?: string | null
}

/**
 * Modelo Groq (llama-3.1-8b-instant por defecto).
 */
async function opsModel() {
  "use step"

  return groq(process.env.GROQ_MODEL || "llama-3.1-8b-instant", {
    apiKey: process.env.GROQ_API_KEY,
  })
}

/**
 * Detección de idioma un poco más robusta:
 * - Busca señales típicas de inglés y de español.
 * - Si ve solo inglés → "en".
 * - Si ve solo español → "es".
 * - Si ve mezcla o nada muy claro:
 *   - Si hay caracteres no-ASCII (acentos, ñ, etc.) → "es".
 *   - Si todo es ASCII → "en".
 */
function detectLanguage(text: string): "en" | "es" {
  const lower = text.toLowerCase()

  const spanishSignals =
    /[áéíóúñ¿¡]|(\b(que|como|cómo|estoy|hola|reembolso|rembolso|devolución|devolucion|cuenta|ayuda|por favor|gracias|disculpa|perdón|perdon|quiero|solicito)\b)/i

  const englishSignals =
    /\b(refund|order|account|please|hello|hi|chargeback|usd|dollars|customer|issue|money|payment|card)\b/i

  const hasSpanish = spanishSignals.test(lower)
  const hasEnglish = englishSignals.test(lower)

  if (hasSpanish && !hasEnglish) {
    return "es"
  }
  if (hasEnglish && !hasSpanish) {
    return "en"
  }

  const hasNonAscii = /[^\x00-\x7F]/.test(text)
  return hasNonAscii ? "es" : "en"
}

/**
 * Convierte content del modelo (string, array, etc.) a texto plano.
 */
function flattenContentToText(content: any): string {
  if (!content) return ""

  if (typeof content === "string") return content

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (!part) return ""
        if (typeof part === "string") return part
        if (typeof (part as any).text === "string") return (part as any).text
        if (Array.isArray((part as any).content)) {
          return flattenContentToText((part as any).content)
        }
        return ""
      })
      .filter(Boolean)
      .join(" ")
  }

  if (typeof content === "object" && typeof (content as any).text === "string") {
    return (content as any).text
  }

  return ""
}

/**
 * Limpia marcas tipo <function=...></function> por si el modelo
 * llegara a imprimirlas en el texto.
 */
function stripToolCallMarkup(text: string): string {
  if (!text) return text
  return text
    .replace(/<function[^>]*>/gi, "")
    .replace(/<\/function>/gi, "")
    .replace(/<tool_call[^>]*>/gi, "")
    .replace(/<\/tool_call>/gi, "")
    .trim()
}

/**
 * Heurística simple para detectar que el user está pidiendo un refund.
 * Esto lo usamos como “safety net” si el modelo se olvida de llamar al tool.
 */
function isRefundRequest(text: string): boolean {
  const lower = text.toLowerCase()
  const patterns = [
    "refund",
    "refound",
    "reembolso",
    "rembolso",
    "devolución",
    "devolucion",
    "devolver el dinero",
    "money back",
    "chargeback",
  ]
  return patterns.some((p) => lower.includes(p))
}

/**
 * Workflow principal del agente Plaude.
 */
export async function opsAgentWorkflow(
  messagesFromClient: ClientMessage[],
): Promise<AgentResult> {
  "use workflow"

  const writable = getWritable<UIMessageChunk>()
  let usedApprovalTool = false
  let approvalId: string | null = null

  console.log("[opsAgentWorkflow] START with messagesFromClient:", messagesFromClient)

  // Último mensaje del usuario → idioma + heurística de refund
  const lastUserMessage = [...messagesFromClient]
    .reverse()
    .find((m) => m.role === "user")

  const lastUserText = lastUserMessage?.content ?? ""
  const turnLang: "en" | "es" = lastUserMessage
    ? detectLanguage(lastUserMessage.content)
    : "en"

  console.log(
    "[opsAgentWorkflow] Detected turnLang:",
    turnLang,
    "from lastUserMessage:",
    lastUserMessage,
  )

  const modelMessages: ModelMessage[] = messagesFromClient.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }))

  console.log("[opsAgentWorkflow] modelMessages for DurableAgent:", modelMessages)

  // Guardamos el execute original del tool
  const originalExecute = opsTools.requestSlackApproval.execute

  // Hook: si el modelo llama al tool, marcamos que se usó y capturamos approvalId.
  ;(opsTools as any).requestSlackApproval.execute = async (input: any, ctx: any) => {
    console.log("[opsAgentWorkflow] requestSlackApproval called by model. Raw input:", input)

    usedApprovalTool = true

    if (lastUserText) {
      ;(input as any).userMessage = lastUserText
      console.log(
        "[opsAgentWorkflow] Attached userMessage to Slack approval input:",
        lastUserText,
      )
    }

    const result = await originalExecute(input, ctx)

    console.log(
      "[opsAgentWorkflow] requestSlackApproval result from model call:",
      result,
    )

    if (result && typeof (result as any).approvalId === "string") {
      approvalId = (result as any).approvalId
      console.log(
        "[opsAgentWorkflow] Captured approvalId from model tool call:",
        approvalId,
      )
    }

    return result
  }

  const systemPrompt =
    OPS_AGENT_INSTRUCTIONS +
    `

--------------------------------
TURN LANGUAGE (DO NOT IGNORE)
--------------------------------
- The user's last message is in ${
      turnLang === "en" ? "ENGLISH" : "SPANISH"
    }.
- You MUST answer 100% in ${
      turnLang === "en" ? "ENGLISH" : "SPANISH"
    } in this turn.
- Do NOT mix languages.
- Do NOT add translations, tags, brackets, or extra words in another language.
- Just write a normal, natural reply in ${
      turnLang === "en" ? "English" : "Spanish"
    } only.

USER'S LATEST REQUEST (READ CAREFULLY)
--------------------------------------
- The latest user message you must respond to is:
  """${lastUserText}"""

TOOLS & INTERNAL CALLS
----------------------
- Tools such as "requestSlackApproval" and "checkLatestApprovalStatus" are INTERNAL helpers.
- You may call them using the model's tool calling interface when appropriate.
- Do NOT mention these tool names in your NATURAL LANGUAGE reply to the user.
- Do NOT explain step-by-step which internal functions you called. Just describe the result in plain language
  (e.g. "I checked with our internal team and...").
- Do NOT output raw JSON objects or code blocks describing tool calls. Keep your reply conversational.

REFUND & RISKY OPERATIONS HANDLING
----------------------------------
- IMPORTANT: In this environment, ALL monetary refunds requested by the user MUST go through human approval in Slack.
- If the user asks you to:
  - issue a refund,
  - process a refund,
  - send money back,
  - reverse a charge,
  - or anything that clearly means "refund" of an amount,
  you MUST:
    1) Call the tool "requestSlackApproval" with:
       - operationType: "refund"
       - risk: "high"            (always treat refunds as high risk here)
       - reason: a short sentence describing why the user wants the refund
       - amount: numeric amount if the user specified it, otherwise omit it
    2) After calling the tool, tell the user that their refund request has been sent for human approval and they should wait for an update.
- NEVER decide the outcome of the refund (approved/rejected) yourself without checking a human decision first.

WHEN TO CALL checkLatestApprovalStatus
--------------------------------------
- Call "checkLatestApprovalStatus" ONLY when the user is clearly asking for an update on a previously requested
  risky operation, refund, or account action. Examples:
  - "Is there any update on my refund?"
  - "What happened with my refund?"
  - "Do you have any news about the approval?"
- Do NOT call it for unrelated questions.

HOW TO USE THE TOOL RESULT
--------------------------
- The tool returns either:
  - { found: false, ... } -> No human decision recorded yet. The request is still pending.
  - { found: true, decision: "approve" | "reject", amount, ... } -> A human has ALREADY decided.
- If found === false:
  - You may tell the user that the request is still pending or under review.
- If found === true:
  - You MUST clearly tell the user that the request was approved or rejected, matching the tool result exactly.
  - Do NOT say it is "pending" if the tool says "approve" or "reject".
  - Do NOT contradict the tool output.
`

  const agent = new DurableAgent({
    model: opsModel,
    tools: {
      ...opsTools,
    },
    system: systemPrompt,
  })

  try {
    const { messages } = await agent.stream({
      messages: modelMessages,
      writable,
    })

    console.log("[opsAgentWorkflow] Agent stream returned messages:", messages)

    const assistantMessages = messages.filter((m) => m.role === "assistant")
    const lastAssistant = assistantMessages[assistantMessages.length - 1]

    console.log("[opsAgentWorkflow] Last assistant message:", lastAssistant)

    let replyText = flattenContentToText((lastAssistant as any)?.content)
    replyText = stripToolCallMarkup(replyText)

    /**
     * SAFETY NET:
     * Si el user pidió un refund pero el modelo NO llamó al tool,
     * forzamos acá la llamada a Slack nosotros mismos.
     */
    if (!usedApprovalTool && lastUserText && isRefundRequest(lastUserText)) {
      console.log(
        "[opsAgentWorkflow] SAFETY NET: user requested a refund but requestSlackApproval was NOT called by the model. Forcing Slack approval request from workflow.",
      )

      // Intentamos extraer un monto numérico del mensaje del user.
      const amountMatch = lastUserText.match(
        /(\d+(?:\.\d+)?)\s*(usd|u\$s|dollars|dólares|dolares)?/i,
      )
      const amount = amountMatch ? Number(amountMatch[1]) : undefined

      const reason =
        lastUserText.length > 240
          ? lastUserText.slice(0, 237) + "..."
          : lastUserText

      const fallbackInput: any = {
        operationType: "refund" as const,
        risk: "high" as const,
        reason,
        amount,
        userMessage: lastUserText,
      }

      console.log(
        "[opsAgentWorkflow] SAFETY NET: calling original requestSlackApproval with input:",
        fallbackInput,
      )

      try {
        const result = await originalExecute(fallbackInput, {} as any)

        console.log(
          "[opsAgentWorkflow] SAFETY NET: Slack approval result:",
          result,
        )

        usedApprovalTool = true

        if (result && typeof (result as any).approvalId === "string") {
          approvalId = (result as any).approvalId
          console.log(
            "[opsAgentWorkflow] SAFETY NET: captured approvalId:",
            approvalId,
          )
        }

        // Sobrescribimos la respuesta para que sea coherente.
        replyText =
          turnLang === "en"
            ? "I've sent your refund request to an internal operator in Slack for approval. Please wait for a response from them."
            : "He enviado tu solicitud de reembolso a un operador humano en Slack para su aprobación. Por favor, aguardá una respuesta de su parte."
      } catch (err) {
        console.error(
          "[opsAgentWorkflow] SAFETY NET: error while forcing Slack approval request:",
          err,
        )
      }
    }

    if (!replyText) {
      replyText =
        turnLang === "en"
          ? "Sorry, I couldn't generate a useful reply. Please try rephrasing your question or giving me a bit more context."
          : "Perdón, no pude generar una respuesta útil. Probá reformular la pregunta o darme un poco más de contexto."
    }

    const result: AgentResult = {
      reply: replyText,
      requiredApproval: usedApprovalTool,
      approvalId,
    }

    console.log("[opsAgentWorkflow] FINAL AgentResult:", result)

    return result
  } catch (err) {
    console.error("[opsAgentWorkflow] ERROR:", err)

    const fallback =
      turnLang === "en"
        ? "Sorry, something went wrong while processing your request. The team has been notified."
        : "Perdón, hubo un error interno al procesar tu solicitud. El equipo ya fue notificado."

    return {
      reply: fallback,
      requiredApproval: false,
      approvalId: null,
    }
  } finally {
    ;(opsTools as any).requestSlackApproval.execute = originalExecute
    console.log("[opsAgentWorkflow] Restored original requestSlackApproval.execute")
  }
}
