// frontend/lib/approvals-store.ts

export type SlackApprovalDecision = {
  id: string
  decision: "approve" | "reject"
  amount?: number
  createdAt: number
}

// Guardamos solo la última decisión (para el challenge alcanza)
let latestApproval: SlackApprovalDecision | null = null

export function saveApproval(decision: {
  id: string
  decision: "approve" | "reject"
  amount?: number
}) {
  latestApproval = {
    ...decision,
    createdAt: Date.now(),
  }

  console.log("[approvals-store] saveApproval called. New latestApproval:", latestApproval)
}

export function getLatestApproval(): SlackApprovalDecision | null {
  console.log("[approvals-store] getLatestApproval returning:", latestApproval)
  return latestApproval
}
