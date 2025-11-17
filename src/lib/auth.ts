// User type
export type User = {
  id: string
  email: string
  name?: string
  image?: string
  emailVerified?: boolean
}

// Session type
export type Session = {
  user: User
  token: string
  expiresAt: string
}

// API base URL - use relative path to go through Vite proxy during dev
const API_BASE_URL = ''

// Auth client for API communication
class AuthClient {
  private apiUrl: string

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl
  }

  async signUp(credentials: { email: string; password: string; name: string }) {
    try {
      const response = await fetch(`${this.apiUrl}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      })

      // Check if response has content before parsing JSON
      const contentLength = response.headers.get('content-length')
      const contentType = response.headers.get('content-type')

      if (!contentType?.includes('application/json')) {
        throw new Error(`Invalid response content type: ${contentType}`)
      }

      const responseText = await response.text()

      if (!responseText) {
        throw new Error('Empty response from server')
      }

      const data = JSON.parse(responseText)

      if (!response.ok) {
        throw new Error(data.error || 'Sign up failed')
      }

      if (data.data?.token) {
        localStorage.setItem('auth_token', data.data.token)
        localStorage.setItem('auth_expires', data.data.expiresAt)
      }

      return data.data
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    }
  }

  async signIn(credentials: { email: string; password: string }) {
    try {
      const response = await fetch(`${this.apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      })

      // Check if response has content before parsing JSON
      const contentType = response.headers.get('content-type')

      if (!contentType?.includes('application/json')) {
        throw new Error(`Invalid response content type: ${contentType}`)
      }

      const responseText = await response.text()

      if (!responseText) {
        throw new Error('Empty response from server')
      }

      const data = JSON.parse(responseText)

      if (!response.ok) {
        throw new Error(data.error || 'Sign in failed')
      }

      if (data.data?.token) {
        localStorage.setItem('auth_token', data.data.token)
        localStorage.setItem('auth_expires', data.data.expiresAt)
      }

      return data.data
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }

  async signOut() {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${this.apiUrl}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
      })

      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_expires')

      if (!response.ok) {
        console.error('Sign out request failed')
      }
    } catch (error) {
      console.error('Sign out error:', error)
      // Clear local storage anyway
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_expires')
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const token = localStorage.getItem('auth_token')

      if (!token) {
        return null
      }

      const response = await fetch(`${this.apiUrl}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      })

      if (!response.ok) {
        // Token might be expired or invalid
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_expires')
        return null
      }

      const data = await response.json()
      return data.data || null
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token')
  }

  isTokenExpired(): boolean {
    const expiresAt = localStorage.getItem('auth_expires')
    if (!expiresAt) return true
    return new Date(expiresAt) <= new Date()
  }
}

// Export auth client instance
export const authClient = new AuthClient(API_BASE_URL)

// Convenience functions
export async function signIn(credentials: { email: string; password: string }) {
  return authClient.signIn(credentials)
}

export async function signUp(credentials: { email: string; password: string; name: string }) {
  return authClient.signUp(credentials)
}

export async function signOut() {
  return authClient.signOut()
}

export async function getCurrentUser(): Promise<User | null> {
  return authClient.getCurrentUser()
}

export function getAuthToken(): string | null {
  return authClient.getToken()
}

export function isAuthenticated(): boolean {
  const token = authClient.getToken()
  return !!token && !authClient.isTokenExpired()
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}