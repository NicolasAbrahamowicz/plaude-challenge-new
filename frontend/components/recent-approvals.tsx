import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Approval {
  id: string
  operation: string
  amount?: string
  status: "approved" | "rejected" | "pending"
  time: string
}

export function RecentApprovals() {
  const approvals: Approval[] = [
    {
      id: "1",
      operation: "Refund #1234",
      amount: "$120.00",
      status: "approved",
      time: "5 min ago",
    },
    {
      id: "2",
      operation: "Close account ID-987",
      status: "approved",
      time: "22 min ago",
    },
    {
      id: "3",
      operation: "Refund #5678",
      amount: "$45.50",
      status: "pending",
      time: "1 hour ago",
    },
    {
      id: "4",
      operation: "Upgrade plan #2109",
      status: "rejected",
      time: "2 hours ago",
    },
    {
      id: "5",
      operation: "Export user data #456",
      status: "approved",
      time: "Yesterday",
    },
  ]

  const statusConfig = {
    approved: { bg: "bg-cyan-highlight/10", text: "text-cyan-400", label: "Approved" },
    rejected: { bg: "bg-destructive/10", text: "text-destructive", label: "Rejected" },
    pending: { bg: "bg-violet-primary/10", text: "text-violet-400", label: "Pending" },
  }

  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-base">Recent approvals</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {approvals.map((approval) => (
            <div
              key={approval.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{approval.operation}</p>
                {approval.amount && <p className="text-xs text-muted-foreground mt-0.5">{approval.amount}</p>}
              </div>
              <div className="flex items-center gap-3 ml-3">
                <span className="text-xs text-muted-foreground whitespace-nowrap">{approval.time}</span>
                <Badge
                  variant="secondary"
                  className={`${statusConfig[approval.status].bg} ${statusConfig[approval.status].text}`}
                >
                  {statusConfig[approval.status].label}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
