import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, ArrowRight, Sparkles, ShieldCheck, Workflow, FileText } from 'lucide-react'

const metrics = [
  { label: 'Active projects', value: '12', change: '+3 this week' },
  { label: 'Specs approved', value: '48', change: '92% approval' },
  { label: 'Validations run', value: '134', change: 'Automated & manual' },
  { label: 'Avg. lead time', value: '5.4d', change: 'From brief to handoff' },
]

const templateShortcuts = [
  { title: 'API-first service', tag: 'Backend', href: '/projects/new' },
  { title: 'Mobile UI kit', tag: 'Frontend', href: '/projects/new' },
  { title: 'Data pipeline', tag: 'Analytics', href: '/projects/new' },
]

export function Overview() {
  return (
    <div className="space-y-10">
      <Card className="overflow-hidden border border-border/80 bg-gradient-to-br from-background via-card to-secondary/30 shadow-[var(--shadow-lg)]">
        <CardContent className="grid gap-8 p-8 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/70 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              AI-guided · Spec-first delivery
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                Orchestrate your specs, validation, and handoff in one elegant flow.
              </h1>
              <p className="text-base text-muted-foreground md:text-lg">
                Draft requirements, align stakeholders, and validate with confidence. SpecDrive keeps every phase connected to the code you ship.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-lg bg-gradient-to-br from-primary to-destructive text-primary-foreground shadow-[var(--shadow)] hover:from-primary hover:to-primary/90">
                <Link to="/projects/new" className="flex items-center gap-2">
                  Start a new project
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-lg border-border/80 bg-background/80 shadow-[var(--shadow-sm)]">
                <Link to="/projects/new">Browse templates</Link>
              </Button>
              <Button asChild variant="ghost" className="rounded-lg text-primary">
                <Link to="/auth">Sign in</Link>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-xl border border-border/80 bg-card/70 px-4 py-3 shadow-[var(--shadow-xs)]">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold text-foreground">{metric.value}</span>
                    <span className="text-xs text-muted-foreground">{metric.change}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border/80 bg-card/70 px-5 py-6 shadow-[var(--shadow-md)]">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Recent validation wins
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/40 px-3 py-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                Spec “Payments API” approved and auto-synced to Jira
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/40 px-3 py-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                Validation suite “Checkout happy path” passed in 3.2m
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/40 px-3 py-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                Artifact handoff delivered to engineering with traceability
              </div>
            </div>
            <div className="rounded-xl border border-dashed border-border/70 bg-secondary/60 p-4 text-sm text-secondary-foreground">
              Tip: Connect your repo to keep specs, validations, and merges in lockstep.
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold text-foreground">Jump back in</p>
          </div>
          <Card className="border border-border/80 shadow-[var(--shadow-sm)]">
            <CardContent className="divide-y divide-border/70 p-0">
              {['Spec review', 'Validation', 'Handoff'].map((phase, idx) => (
                <div key={phase} className="flex items-center justify-between px-4 py-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{phase} cadence</p>
                    <p className="text-xs text-muted-foreground">Keep momentum with guided checklists.</p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="rounded-lg">
                    <Link to="/projects/new">Open</Link>
                  </Button>
                  {idx < 2 && <div className="hidden" />} {/* keeps divider shading consistent */}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold text-foreground">Popular templates</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {templateShortcuts.map((item) => (
              <Card key={item.title} className="border border-border/80 bg-card/70 shadow-[var(--shadow-xs)]">
                <CardContent className="space-y-2 p-4">
                  <span className="inline-flex w-fit rounded-full border border-secondary/60 bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                    {item.tag}
                  </span>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <Button asChild variant="ghost" size="sm" className="justify-start px-0 text-primary">
                    <Link to={item.href} className="inline-flex items-center gap-1">
                      Use template
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border border-border/80 bg-card/80 shadow-[var(--shadow-sm)]">
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <p className="text-sm font-semibold text-foreground">Sample HANDOFF.md</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Preview the depth, structure, and tone of a generated handoff before exporting.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" className="rounded-lg bg-gradient-to-br from-primary to-destructive text-primary-foreground shadow-[var(--shadow)] hover:from-primary hover:to-primary/90">
                  <a href="/docs/HANDOFF_SAMPLE.md" target="_blank" rel="noreferrer">
                    View sample
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline" className="rounded-lg border-border/80">
                  <Link to="/projects/new">Generate yours</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
