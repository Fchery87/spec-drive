import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Workflow,
  ListChecks,
  Boxes,
  GitBranch,
  Compass,
  ClipboardCheck,
  FileText,
} from 'lucide-react'

const guidedPhases = [
  { title: 'Analysis', description: 'Clarify vision, personas, KPIs, and constraints.' },
  { title: 'Stack Selection', description: 'Approve platform choices with rationale and tradeoffs.' },
  { title: 'Spec', description: 'Generate PRDs, API contracts, and data models.' },
  { title: 'Dependencies', description: 'Validate packages, risk notes, and legal/licensing.' },
  { title: 'Solutioning', description: 'Map architecture, epics, and workflows into delivery plans.' },
  { title: 'Done', description: 'Export HANDOFF.md with traceability for downstream teams.' },
]

const featureHighlights = [
  {
    icon: <Compass className="h-5 w-5 text-primary" />,
    title: 'Spec-first orchestration',
    description: 'Guide analysts, architects, and AI agents through a shared source of truth.',
  },
  {
    icon: <GitBranch className="h-5 w-5 text-primary" />,
    title: 'Stack-aware decisions',
    description: 'Bake tech constraints into every phase so proposals and PRDs stay in sync.',
  },
  {
    icon: <ShieldCheck className="h-5 w-5 text-primary" />,
    title: 'Production-ready handoffs',
    description: 'Deliver curated PRDs, artifacts, and bundling so engineering can ship faster.',
  },
]

const workflowHighlights = [
  {
    icon: <Workflow className="h-5 w-5 text-primary" />,
    title: 'Phase choreography',
    description: 'The platform decides whether to execute AI agents or request approvals before advancing.',
  },
  {
    icon: <Boxes className="h-5 w-5 text-primary" />,
    title: 'Artifact lineage',
    description: 'Every deliverable—PRDs, data models, dependency proposals—is versioned and traceable.',
  },
  {
    icon: <ClipboardCheck className="h-5 w-5 text-primary" />,
    title: 'Gate reviews',
    description: 'Stakeholders sign off on stacks and dependencies before downstream automation continues.',
  },
]

const operationalWins = [
  {
    emphasis: 'Hand-off turnaround dropped from days to hours.',
    detail: 'Stakeholders approve dependencies before a single line of code ships.',
    tag: 'Head of Platform, Alto Robotics',
  },
  {
    emphasis: '4 squads rely on SpecDrive to align AI-generated artifacts with tech leadership requirements.',
    detail: 'Spec-drive trifecta: requirements, architecture, validation summaries.',
    tag: 'Eng Director, B2B SaaS',
  },
  {
    emphasis: '92% of dependency proposals are approved on the first pass.',
    detail: 'Risks are documented in-context, so reviewers act faster.',
    tag: 'Security Lead, Enterprise',
  },
]

const metrics = [
  { label: 'Specs delivered', value: '480+' },
  { label: 'Median handoff time', value: '2.6 hrs' },
  { label: 'Approval accuracy', value: '94%' },
]

export function Overview() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary px-3 py-1 text-xs font-semibold uppercase text-secondary-foreground shadow-[var(--shadow-xs)]">
            Spec-first orchestration OS
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
              From idea to handoff in six guided phases.
            </h1>
            <p className="text-base text-muted-foreground md:text-lg">
              SpecDrive aligns analysts, architects, and AI copilots around a single source of truth
              so you can ship production-ready instructions faster than ever.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="rounded-lg bg-gradient-to-br from-primary to-destructive text-primary-foreground shadow-[var(--shadow)] hover:from-primary hover:to-primary/90">
              <Link to="/projects/new" className="flex items-center gap-2">
                Start New Project
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-lg border-border/80 bg-background/80 shadow-[var(--shadow-sm)]">
              <a href="/docs/HANDOFF_SAMPLE.md" target="_blank" rel="noreferrer">See sample HANDOFF</a>
            </Button>
            <Button asChild variant="ghost" className="rounded-lg text-primary">
              <Link to="/overview">Explore workflow</Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl border border-border/70 bg-card/70 px-4 py-3 shadow-[var(--shadow-xs)]"
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                <p className="text-2xl font-semibold text-foreground">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>

        <Card className="h-full border border-border/80 shadow-[var(--shadow-lg)]">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              <p className="text-sm font-semibold text-foreground">Guided Orchestration</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Every artifact is generated, reviewed, and approved in a predictable flow.
            </p>
            <ol className="space-y-3">
              {guidedPhases.map((phase, idx) => (
                <li
                  key={phase.title}
                  className="flex gap-3 rounded-lg border border-border/70 bg-muted/50 px-3 py-2 shadow-[var(--shadow-xs)]"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{phase.title}</p>
                    <p className="text-xs text-muted-foreground">{phase.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>

      {/* Feature trio */}
      <section className="grid gap-4 md:grid-cols-3">
        {featureHighlights.map((item) => (
          <Card key={item.title} className="border border-border/70 shadow-[var(--shadow-sm)]">
            <CardContent className="space-y-3 p-5">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary/60 text-primary">
                {item.icon}
              </div>
              <p className="text-sm font-semibold text-foreground">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Workflow snapshot */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Workflow in one glance
            </div>
            <p className="text-lg font-semibold text-foreground">Every phase knows what’s next</p>
            <p className="text-sm text-muted-foreground">
              Analysts, architects, and engineers stay aligned because the orchestrator enforces gates before moving ahead.
            </p>
          </div>
          <Button asChild variant="ghost" className="hidden items-center gap-1 text-primary md:flex">
            <Link to="/projects/new">
              Explore Workflow
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <Card className="border border-border/70 shadow-[var(--shadow-sm)]">
          <CardContent className="grid gap-4 p-5 md:grid-cols-3">
            {workflowHighlights.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border/60 bg-card/70 p-4 shadow-[var(--shadow-xs)]"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary/50 text-primary">
                  {item.icon}
                </div>
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Handoff sample + preview */}
      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Outcome highlight
          </div>
          <p className="text-lg font-semibold text-foreground">See exactly what you hand off</p>
          <p className="text-sm text-muted-foreground">
            Every project bundles PRDs, API schemas, dependency memos, and a final HANDOFF.md prompt.
            Preview the quality downstream teams receive.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" className="rounded-lg bg-gradient-to-br from-primary to-destructive text-primary-foreground shadow-[var(--shadow)] hover:from-primary hover:to-primary/90">
              <a href="/docs/HANDOFF_SAMPLE.md" target="_blank" rel="noreferrer">
                See sample HANDOFF
              </a>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-lg border-border/80 bg-background/80 shadow-[var(--shadow-sm)]">
              <Link to="/projects/new">Generate your own</Link>
            </Button>
          </div>
        </div>
        <Card className="border border-border/70 shadow-[var(--shadow-md)]">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <p className="text-sm font-semibold text-foreground">Excerpt — HANDOFF.md</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/50 p-4 text-sm text-muted-foreground shadow-[var(--shadow-xs)]">
              <pre className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">
{`## Project Brief
Aurora Assist is a multi-channel support companion that helps...
Personas: Support Lead, Implementation Engineer, End Users

## Functional Requirements
- Real-time ticket ingestion from HelpScout, Slack, and Email
- Spec-driven triage workflow that tags urgency, KPIs affected
- Knowledge graph search across PRD, API specs, and dependency memos
- Human-in-the-loop approvals for escalations`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Operational uplift */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Operational uplift
            </div>
            <p className="text-lg font-semibold text-foreground">Teams ship with clarity</p>
          </div>
          <Button asChild variant="ghost" className="hidden items-center gap-1 text-primary md:flex">
            <Link to="/">View live projects</Link>
          </Button>
        </div>
        <Card className="border border-border/70 shadow-[var(--shadow-sm)]">
          <CardContent className="grid gap-4 p-5 md:grid-cols-3">
            {operationalWins.map((item) => (
              <div
                key={item.emphasis}
                className="flex h-full flex-col gap-2 rounded-xl border border-border/60 bg-card/70 p-4 shadow-[var(--shadow-xs)]"
              >
                <div className="inline-flex items-center gap-2 text-primary">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase">Operational lift</span>
                </div>
                <p className="text-sm font-semibold text-foreground">{item.emphasis}</p>
                <p className="text-sm text-muted-foreground">{item.detail}</p>
                <span className="text-xs text-muted-foreground">{item.tag}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* CTA Band */}
      <section>
        <Card className="overflow-hidden border border-border/70 bg-gradient-to-br from-secondary/70 via-card to-primary/10 shadow-[var(--shadow-lg)]">
          <CardContent className="flex flex-col items-start gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-lg font-semibold text-foreground">Ready to orchestrate your next build?</p>
              <p className="text-sm text-muted-foreground">
                Launch a project in minutes, invite stakeholders, and watch every artifact align itself automatically.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-lg bg-gradient-to-br from-primary to-destructive text-primary-foreground shadow-[var(--shadow)] hover:from-primary hover:to-primary/90">
                <Link to="/projects/new">Start New Project</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-lg border-border/80 bg-background/80 shadow-[var(--shadow-sm)]">
                <a href="/docs/HANDOFF_SAMPLE.md" target="_blank" rel="noreferrer">See sample HANDOFF</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
