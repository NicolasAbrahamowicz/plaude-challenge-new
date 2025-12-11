import { HelpCircle } from "lucide-react"
import { Card } from "@/components/ui/card"

export function HelperHint() {
  return (
    <Card className="border border-border bg-card/50 backdrop-blur-sm p-4">
      <div className="flex gap-3">
        <HelpCircle className="w-4 h-4 text-cyan-highlight flex-shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Try asking: <span className="text-foreground font-medium">"Issue a refund of 120 USD for order #123"</span> to
          see how human approval would be requested.
        </p>
      </div>
    </Card>
  )
}
