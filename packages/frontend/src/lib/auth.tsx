import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from './api'

interface User {
  id: number
  username: string
  displayName?: string
  role: 'user' | 'admin'
  assignedRole?: { id: number, name: string } | null
  permissions?: string[]
  color?: string
  avatarUrl?: string
  tokenVersion?: number
}

interface AuthContextType {
  user: User | null
  login: (token: string, user: User) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
  refreshUser: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token')
      const savedUser = localStorage.getItem('user')
      const expiry = localStorage.getItem('sessionExpiry')
      
      if (!token || !savedUser) {
        setIsLoading(false)
        return
      }

      // Check expiry
      if (expiry && new Date().getTime() > parseInt(expiry)) {
        // Expired
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('sessionExpiry')
        setIsLoading(false)
        return
      }

      try {
        const parsedUser = JSON.parse(savedUser)
        if (parsedUser && typeof parsedUser.id === 'number') {
          // Set initial user from storage to avoid flickering if possible, 
          // but relying on it for permissions is risky if stale. 
          // We will set it, but keep loading true until verified.
          setUser(parsedUser)
          
          // Auto-refresh: Extend session if valid
          localStorage.setItem('sessionExpiry', (new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toString())
          
          // Refresh user data from server to ensure it's up to date
          try {
            const res = await api(`/users/${parsedUser.id}`)
            if (res.user) {
              const updated = res.user
              localStorage.setItem('user', JSON.stringify(updated))
              setUser(updated)
            }
          } catch (err) {
            console.error('Failed to refresh user on load:', err)
            // If we fail to fetch user (e.g. 404 because deleted), logout
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            localStorage.removeItem('sessionExpiry')
            setUser(null)
          }
        } else {
          // Invalid user data, clear it
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
      } catch (e) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      } finally {
        setIsLoading(false)
      }

    }

    initAuth()

    // Refresh on window focus
    const onFocus = () => {
        const user = localStorage.getItem('user')
        if (user) refreshUser()
    }
    window.addEventListener('focus', onFocus)
    
    return () => {
        window.removeEventListener('focus', onFocus)
    }
  }, [])

  const login = (token: string, user: User) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    // Set expiry to 7 days from now
    localStorage.setItem('sessionExpiry', (new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toString())
    setUser(user)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('sessionExpiry')
    setUser(null)
  }

  const updateUser = (updatedUser: Partial<User>) => {
    if (!user) return
    const newUser = { ...user, ...updatedUser }
    localStorage.setItem('user', JSON.stringify(newUser))
    setUser(newUser)
  }

  const refreshUser = async () => {
    if (!user) return
    try {
      const res = await api(`/users/${user.id}`)
      if (res.user) {
        const updated = res.user
        
        // Check for force logout (only if we have a version tracked)
        if (user.tokenVersion !== undefined && updated.tokenVersion !== undefined && user.tokenVersion !== updated.tokenVersion) {
            logout()
            return
        }

        localStorage.setItem('user', JSON.stringify(updated))
        setUser(updated)
      }
    } catch (e) {
      console.error('Failed to refresh user:', e)
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, refreshUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  
  const hasPermission = (permission: string) => {
      if (!context.user) return false
      return context.user.permissions?.includes(permission) || false
  }

  return { ...context, hasPermission }
}
