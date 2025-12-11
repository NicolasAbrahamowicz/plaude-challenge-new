"use client"

import { useState, useEffect } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"

import type {
  AgentResult,
  ClientMessage,
} from "@/workflows/ops-agent/workflow"

interface Message {
  id: string
  role: "user" | "agent"
  content: string
  timestamp: Date
  approvalId?: string | null
}

const statusConfig: Record<
  "idle" | "running" | "waiting",
  { label: string; color: string }
> = {
  idle: { label: "Idle", color: "bg-muted/50 text-muted-foreground" },
  running: {
    label: "Running workflow...",
    color: "bg-cyan-highlight/20 text-cyan-400",
  },
  waiting: {
    label: "Waiting for human approval...",
    color: "bg-violet-primary/20 text-violet-400",
  },
}

function detectSpanish(text: string): boolean {
  const spanishSignals =
    /[áéíóúñ¿¡]|(\b(que|como|cómo|estoy|hola|reembolso|rembolso|cuenta|ayuda|por favor|gracias|disculpa|perdón)\b)/i
  return spanishSignals.test(text)
}

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "agent",
      content:
        "Hello! I'm the Plaude Operations Agent. I can help you with refunds, account management, and other operations. If I need human approval, I'll pause and request it via Slack.",
      timestamp: new Date(Date.now() - 5 * 60000),
    },
  ])

  const [input, setInput] = useState("")
  const [status, setStatus] = useState<"idle" | "running" | "waiting">("idle")
  const [error, setError] = useState<string | null>(null)
  const [activeApprovalId, setActiveApprovalId] = useState<string | null>(null)

  const handleSend = async () => {
    if (!input.trim()) return
    if (status === "running") {
      console.log(
        "[ChatPanel] Ignoring send because status is already 'running'",
      )
      return
    }

    setError(null)

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    console.log("[ChatPanel] Sending user message:", userMessage)

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setStatus("running")

    try {
      const payloadMessages: ClientMessage[] = [...messages, userMessage].map(
        (m) => ({
          role: m.role === "user" ? "user" : "agent",
          content: m.content,
        }),
      )

      console.log(
        "[ChatPanel] Calling /api/agent with payloadMessages:",
        payloadMessages,
      )

      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadMessages }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        console.error("Error from /api/agent:", res.status, text)
        throw new Error(`Request failed with status ${res.status}`)
      }

      const data: AgentResult = await res.json()

      console.log("[ChatPanel] /api/agent response:", data)

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-agent`,
          role: "agent",
          content: data.reply,
          timestamp: new Date(),
          approvalId: data.approvalId ?? null,
        },
      ])

      if (data.requiredApproval && data.approvalId) {
        console.log(
          "[ChatPanel] Agent requires human approval. approvalId:",
          data.approvalId,
        )
        setStatus("waiting")
        setActiveApprovalId(data.approvalId)
      } else {
        console.log("[ChatPanel] No approval required for this turn.")
        setStatus("idle")
        setActiveApprovalId(null)
      }
    } catch (err: any) {
      console.error("[ChatPanel] Error calling /api/agent:", err)
      setStatus("idle")
      setError(err?.message ?? "Unknown error when calling agent API")

      // Mensaje de error “bonito” en el chat
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-error`,
          role: "agent",
          content:
            "Sorry, something went wrong while talking to the workflow API. Check server logs for details.",
          timestamp: new Date(),
        },
      ])
    }
  }

  // Polling para detectar cuando el operador humano en Slack aprueba/rechaza
  useEffect(() => {
    if (!activeApprovalId || status !== "waiting") {
      return
    }

    console.log(
      "[ChatPanel] Starting approval status polling for approvalId:",
      activeApprovalId,
    )

    let cancelled = false

    const poll = async () => {
      if (cancelled) {
        console.log("[ChatPanel] Polling cancelled; exiting.")
        return
      }

      try {
        console.log(
          "[ChatPanel] Polling /api/approval-status for id:",
          activeApprovalId,
        )

        const res = await fetch(
          `/api/approval-status?id=${encodeURIComponent(activeApprovalId)}`,
        )

        if (!res.ok) {
          console.error(
            "[ChatPanel] /api/approval-status HTTP error:",
            res.status,
          )
        } else {
          const data = await res.json()
          console.log("[ChatPanel] /api/approval-status response:", data)

          if (data.status === "approved" || data.status === "rejected") {
            const lastUserMessage = [...messages]
              .reverse()
              .find((m) => m.role === "user")

            const isSpanish = lastUserMessage
              ? detectSpanish(lastUserMessage.content)
              : false

            const amount = data.amount ?? "the requested"

            let content: string

            if (data.status === "approved") {
              content = isSpanish
                ? `Tu reembolso de ${amount} USD fue aprobado por un operador humano. Vamos a procesarlo a tu método de pago original.`
                : `Your refund of ${amount} USD has been approved by a human operator. We'll now process it to your original payment method.`
            } else {
              content = isSpanish
                ? `Tu reembolso de ${amount} USD fue rechazado por un operador humano. Si creés que es un error, respondé a este mensaje y podemos revisar el caso.`
                : `Your refund of ${amount} USD has been rejected by a human operator. If you think this is a mistake, reply to this message and we can review your case.`
            }

            console.log(
              "[ChatPanel] Approval resolved; pushing auto message to chat:",
              content,
            )

            setMessages((prev) => [
              ...prev,
              {
                id: `${Date.now()}-agent-approval`,
                role: "agent",
                content,
                timestamp: new Date(),
                approvalId: activeApprovalId,
              },
            ])

            setStatus("idle")
            setActiveApprovalId(null)
            return
          }
        }
      } catch (err) {
        console.error("[ChatPanel] Error polling /api/approval-status:", err)
      }

      setTimeout(poll, 5000)
    }

    poll()

    return () => {
      console.log(
        "[ChatPanel] Cleaning up polling effect for approvalId:",
        activeApprovalId,
      )
      cancelled = true
    }
  }, [activeApprovalId, status, messages])

  return (
    <Card className="h-full flex flex-col border-border bg-card/50 backdrop-blur-sm">
      <CardHeader className="border-b border-border">
        <CardTitle>AI Ops Agent</CardTitle>
        <CardDescription>
          Chat with an operations agent that can pause for human approval via
          Slack.
        </CardDescription>
        <div className="flex items-center gap-2 mt-3">
          <div
            className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[status].color}`}
          >
            {statusConfig[status].label}
          </div>
          <div className="w-2 h-2 rounded-full bg-current opacity-75 animate-pulse" />
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="text-xs text-muted-foreground px-4 pt-4 pb-2">
            This agent may pause a workflow and wait for Slack approval only for
            risky or high-value operations.
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-4 px-4 py-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs px-4 py-3 rounded-lg ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-muted text-muted-foreground rounded-bl-none"
                    }`}
                  >
                    <div className="text-xs opacity-60 mb-1">
                      {msg.role === "user" ? "You" : "Ops Agent"}
                    </div>
                    <div className="text-sm whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="border-t border-border p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleSend()
            }}
            className="flex flex-col gap-2"
          >
            <div className="flex gap-2">
              <Input
                placeholder="Ask the agent to process a refund, close an account, or perform an operation..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-background border-border text-foreground placeholder:text-muted-foreground"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    void handleSend()
                  }
                }}
                disabled={status === "running"}
              />
              <Button
                type="submit"
                size="icon"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={status === "running"}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            {error && (
              <p className="text-xs text-destructive mt-1">Error: {error}</p>
            )}
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
