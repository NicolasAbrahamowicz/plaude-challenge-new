// frontend/workflows/ops-agent/approval-store.ts

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type ApprovalRecord = {
  id: string;
  status: ApprovalStatus;
  amount?: number;
  reason?: string;
  decidedAt?: string;
};

const approvals = new Map<string, ApprovalRecord>();
let latestId: string | null = null;

export function createApproval(
  id: string,
  amount?: number,
  reason?: string,
) {
  const rec: ApprovalRecord = {
    id,
    status: "pending",
    amount,
    reason,
  };
  approvals.set(id, rec);
  latestId = id;
}

export function setApprovalDecision(
  id: string,
  decision: "approve" | "reject",
) {
  const current: ApprovalRecord =
    approvals.get(id) ?? {
      id,
      status: "pending",
    };

  current.status = decision === "approve" ? "approved" : "rejected";
  current.decidedAt = new Date().toISOString();

  approvals.set(id, current);
  latestId = id;
}

export function getApproval(id: string): ApprovalRecord | null {
  return approvals.get(id) ?? null;
}

export function getLatestApproval(): ApprovalRecord | null {
  if (!latestId) return null;
  return approvals.get(latestId) ?? null;
}
