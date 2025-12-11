"use client"

import type React from "react"

import { CheckCircle2, Clock, Zap, MessageSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TimelineStep {
  id: number
  title: string
  description: string
  icon: React.ReactNode
  status: "completed" | "active" | "future"
}

export function WorkflowTimeline() {
  const steps: TimelineStep[] = [
    {
      id: 1,
      title: "User request",
      description: "The agent reads the user message.",
      icon: <MessageSquare className="w-5 h-5" />,
      status: "completed",
    },
    {
      id: 2,
      title: "Agent analysis",
      description: "The agent decides if human approval is required.",
      icon: <Zap className="w-5 h-5" />,
      status: "active",
    },
    {
      id: 3,
      title: "Slack approval",
      description: "A message is sent to Slack, waiting for a human decision.",
      icon: <Clock className="w-5 h-5" />,
      status: "future",
    },
    {
      id: 4,
      title: "Final response",
      description: "The agent resumes and answers the user.",
      icon: <CheckCircle2 className="w-5 h-5" />,
      status: "future",
    },
  ]

  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-base">Workflow timeline</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                    step.status === "completed"
                      ? "bg-cyan-highlight/20 text-cyan-400"
                      : step.status === "active"
                        ? "bg-violet-primary/30 text-violet-400 ring-2 ring-violet-primary/50"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step.icon}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-1 h-12 ${step.status === "completed" ? "bg-cyan-highlight/30" : "bg-muted"}`} />
                )}
              </div>
              <div className="flex-1 pt-1">
                <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
