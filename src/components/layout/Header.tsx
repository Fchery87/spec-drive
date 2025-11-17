import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { signOut, getCurrentUser } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Plus, FileText, LogOut, User as UserIcon } from 'lucide-react'
import type { User } from '@/lib/auth'

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

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
    <header className="bg-white border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <Link to="/" className="flex items-center space-x-2">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold text-gray-900">
              Spec-Driven Orchestrator
            </h1>
          </Link>

          {/* Navigation */}
          <div className="flex items-center space-x-4">
            {user && (
              <>
                <Button
                  variant={isActive('/') ? 'default' : 'ghost'}
                  asChild
                >
                  <Link to="/">
                    Dashboard
                  </Link>
                </Button>
                
                <Button
                  variant={isActive('/projects/new') ? 'default' : 'ghost'}
                  asChild
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Link to="/projects/new" className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>New Project</span>
                  </Link>
                </Button>
              </>
            )}

            {/* Auth Section */}
            <div className="flex items-center space-x-2">
              {user && !loading && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <UserIcon className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
              )}
              
              <Button
                variant={user ? 'outline' : 'default'}
                onClick={handleAuth}
                className={cn(
                  user ? 'text-red-600 border-red-200 hover:bg-red-50' : ''
                )}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {user ? 'Sign Out' : 'Sign In'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}