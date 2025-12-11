import { Github } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Header() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Plaude Agent</h1>
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-violet-primary/20 text-violet-400">beta</span>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <Github className="w-4 h-4" />
          </Button>
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Docs
          </a>
          <span className="text-xs text-muted-foreground ml-2">Powered by Workflow DevKit</span>
        </div>
      </div>
    </header>
  )
}
