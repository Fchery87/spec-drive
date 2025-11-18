import React from 'react'
import { Link } from 'react-router-dom'

const MiniLogo = () => (
  <div className="relative flex h-10 w-10 items-center justify-center">
    <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-destructive shadow-[var(--shadow-sm)]" />
    <span className="absolute inset-[3px] rounded-xl border border-primary/20 bg-background/90 backdrop-blur" />
    <span className="relative inline-flex h-5 w-5 -rotate-12 items-center justify-center">
      <span className="absolute inset-[-2px] rounded-lg border border-primary/60" />
      <span className="absolute inset-0 rounded-md bg-gradient-to-br from-primary via-primary/80 to-destructive/80 opacity-90" />
    </span>
  </div>
)

export function Footer() {
  return (
    <footer className="border-t border-border/80 bg-card/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md space-y-3">
          <div className="flex items-center gap-3">
            <MiniLogo />
            <div className="leading-tight">
              <p className="text-base font-semibold text-foreground">SpecDrive Orchestrator</p>
              <p className="text-sm text-muted-foreground">Elegant Luxury theme · AI-guided delivery</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Build, validate, and launch specification-driven projects with clarity across product,
            engineering, and validation workflows.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border/70 bg-secondary px-3 py-1 text-secondary-foreground">
              Crafted for premium experience
            </span>
            <span className="rounded-full border border-border/70 px-3 py-1">
              Elegant Luxury UI kit
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Product</p>
            <div className="flex flex-col gap-2 text-foreground">
              <Link to="/" className="text-muted-foreground transition hover:text-foreground">Dashboard</Link>
              <Link to="/projects/new" className="text-muted-foreground transition hover:text-foreground">New Project</Link>
              <Link to="/auth" className="text-muted-foreground transition hover:text-foreground">Auth</Link>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resources</p>
            <div className="flex flex-col gap-2 text-foreground">
              <a href="README.md" className="text-muted-foreground transition hover:text-foreground">Overview</a>
              <a href="PRODUCTION_CHECKLIST.md" className="text-muted-foreground transition hover:text-foreground">Production</a>
              <a href="ROADMAP_TO_10_10.md" className="text-muted-foreground transition hover:text-foreground">Roadmap</a>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Support</p>
            <div className="flex flex-col gap-2 text-foreground">
              <a href="mailto:support@specdrive.app" className="text-muted-foreground transition hover:text-foreground">Email support</a>
              <a href="DOCS_GUIDE.md" className="text-muted-foreground transition hover:text-foreground">Docs guide</a>
              <a href="NEXT_STEPS.md" className="text-muted-foreground transition hover:text-foreground">Next steps</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
