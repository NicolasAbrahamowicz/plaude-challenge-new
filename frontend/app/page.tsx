"use client"

import { Header } from "@/components/header"
import { ChatPanel } from "@/components/chat-panel"
import { WorkflowTimeline } from "@/components/workflow-timeline"
import { RecentApprovals } from "@/components/recent-approvals"
import { IntegrationStatus } from "@/components/integration-status"
import { HelperHint } from "@/components/helper-hint"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left column: Chat Panel */}
          <div className="lg:col-span-2">
            <ChatPanel />
          </div>

          {/* Right column: Status and Approvals */}
          <div className="space-y-6 lg:space-y-8">
            <WorkflowTimeline />
            <RecentApprovals />
            <IntegrationStatus />
          </div>
        </div>

        {/* Helper hint */}
        <div className="mt-8 lg:mt-12 max-w-2xl">
          <HelperHint />
        </div>
      </main>
    </div>
  )
}
