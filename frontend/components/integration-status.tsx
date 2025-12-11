import type React from "react"
import { Check, Code2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Integration {
  name: string
  status: string
  icon: React.ReactNode
}

export function IntegrationStatus() {
  const integrations: Integration[] = [
    {
      name: "Slack",
      status: "Connected",
      icon: <Check className="w-4 h-4" />,
    },
    {
      name: "Workflow DevKit",
      status: "Configured",
      icon: <Code2 className="w-4 h-4" />,
    },
  ]

  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-base">Integration status</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {integrations.map((integration) => (
            <div
              key={integration.name}
              className="flex items-center gap-3 pb-3 border-b border-border last:pb-0 last:border-0"
            >
              <div className="text-cyan-highlight">{integration.icon}</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{integration.name}</p>
                <p className="text-xs text-muted-foreground">{integration.status}</p>
              </div>
            </div>
          ))}
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">App URL</p>
            <div className="mt-2 px-3 py-2 rounded bg-muted/50 font-mono text-xs text-muted-foreground break-all">
              https://localhost:3000
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
