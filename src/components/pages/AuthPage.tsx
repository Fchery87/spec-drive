import React, { useState } from 'react'
import { AuthForm } from '@/components/auth/AuthForm'
import { useNavigate } from 'react-router-dom'

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const navigate = useNavigate()

  const handleSuccess = () => {
    // Redirect to dashboard after successful auth
    navigate('/')
  }

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Spec-Driven Orchestrator
          </h1>
          <p className="text-gray-600">
            AI-powered project specification and orchestration platform
          </p>
        </div>
        
        <AuthForm
          mode={mode}
          onSuccess={handleSuccess}
          onToggleMode={toggleMode}
        />
      </div>
    </div>
  )
}