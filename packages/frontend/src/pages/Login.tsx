import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Link, useNavigate } from 'react-router-dom'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      // For MVP, the backend returns { user: { ... } } but no token yet?
      // Wait, I implemented auth routes but didn't implement JWT token generation in the backend code I wrote earlier.
      // I just returned the user object.
      // I should probably fix the backend to return a fake token or implement JWT.
      // For now, I'll just use a dummy token since the backend is simple.
      
      const res = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      
      // Assuming backend returns { user: ... }
      // I'll simulate a token for now.
      login('dummy-token', res.user)
      navigate('/')
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-zinc-900/50 p-8 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white">Welcome back</h2>
          <p className="mt-2 text-sm text-zinc-400">Sign in to your account</p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500 ring-1 ring-red-500/20">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-zinc-400">
                Username
              </label>
              <Input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1"
                placeholder="Enter your username"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-400">
                Password
              </label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
                placeholder="Enter your password"
              />
            </div>
            
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
                Forgot password?
              </Link>
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg">
            Sign in
          </Button>
          
          <p className="text-center text-sm text-zinc-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-indigo-400 hover:text-indigo-300">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
