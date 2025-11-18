import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { signOut, getCurrentUser } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Plus, LogOut, User as UserIcon, Sun, Moon } from 'lucide-react'
import type { User } from '@/lib/auth'

const Logo = () => (
  <div className="relative flex h-11 w-11 items-center justify-center">
    <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-destructive shadow-[var(--shadow-md)]" />
    <span className="absolute inset-[3px] rounded-xl border border-primary/20 bg-background/90 backdrop-blur" />
    <span className="relative inline-flex h-6 w-6 -rotate-12 items-center justify-center">
      <span className="absolute inset-[-2px] rounded-lg border border-primary/60" />
      <span className="absolute inset-0 rounded-md bg-gradient-to-br from-primary via-primary/80 to-destructive/80 opacity-90" />
      <span className="absolute inset-x-[6px] top-0 h-full rounded-full bg-accent/70 blur-[1px]" />
      <span className="absolute inset-y-[6px] left-0 w-full rounded-full bg-sidebar-primary/60 blur-[1px]" />
    </span>
  </div>
)

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  const isActive = (path: string) => {
    return location.pathname === path
  }

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [location])  // Refresh user check whenever location changes

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const mediaPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initial = stored === 'dark' || (!stored && mediaPrefersDark) ? 'dark' : 'light'
    applyTheme(initial)
    setTheme(initial)
  }, [])

  const applyTheme = (value: 'light' | 'dark') => {
    const root = document.documentElement
    if (value === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', value)
  }

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    applyTheme(next)
    setTheme(next)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      setUser(null)
      navigate('/auth')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleAuth = () => {
    if (user) {
      handleSignOut()
    } else {
      navigate('/auth')
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="group flex items-center gap-3">
          <Logo />
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold tracking-tight text-foreground">
                SpecDrive
              </span>
              <span className="rounded-full border border-border/70 bg-secondary px-2 py-0.5 text-[11px] font-medium uppercase text-secondary-foreground shadow-[var(--shadow-xs)]">
                Orchestrator
              </span>
            </div>
            <p className="text-xs text-muted-foreground transition-colors group-hover:text-foreground/80">
              AI-guided specs to production clarity
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <Button
            variant={isActive('/overview') ? 'secondary' : 'ghost'}
            asChild
            className={cn(
              'rounded-lg px-3',
              isActive('/overview') && 'shadow-[var(--shadow-sm)]'
            )}
          >
            <Link to="/overview">Overview</Link>
          </Button>

          {user && (
            <>
              <Button
                variant={isActive('/') ? 'secondary' : 'ghost'}
                asChild
                className={cn(
                  'rounded-lg px-3',
                  isActive('/') && 'shadow-[var(--shadow-sm)]'
                )}
              >
                <Link to="/">Dashboard</Link>
              </Button>

              <Button
                variant={isActive('/projects/new') ? 'default' : 'secondary'}
                asChild
                className={cn(
                  'rounded-lg bg-gradient-to-br from-primary to-destructive text-primary-foreground shadow-[var(--shadow)] hover:from-primary hover:to-primary/90',
                  isActive('/projects/new') ? 'opacity-100' : 'opacity-95'
                )}
              >
                <Link to="/projects/new" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>New Project</span>
                </Link>
              </Button>
            </>
          )}

          <div className="flex items-center gap-3">
            {user && !loading && (
              <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/60 px-3 py-1 text-sm text-muted-foreground shadow-[var(--shadow-xs)]">
                <UserIcon className="h-4 w-4 text-primary" />
                <span className="truncate max-w-[180px]">{user.email}</span>
              </div>
            )}

            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-lg border-border/80 shadow-[var(--shadow-xs)]"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4 text-foreground" />
              ) : (
                <Sun className="h-4 w-4 text-foreground" />
              )}
            </Button>

            <Button
              variant={user ? 'outline' : 'default'}
              onClick={handleAuth}
              className={cn(
                'rounded-lg shadow-[var(--shadow-sm)]',
                user
                  ? 'border-destructive/40 text-destructive hover:bg-destructive/5'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {user ? 'Sign Out' : 'Sign In'}
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
