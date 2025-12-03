import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Link, useNavigate } from 'react-router-dom'

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    securityQuestion: '',
    securityAnswer: ''
  })
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify(formData),
      })
      
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
          <h2 className="text-3xl font-bold tracking-tight text-white">Create an account</h2>
          <p className="mt-2 text-sm text-zinc-400">Start your journey today</p>
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
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                className="mt-1"
                placeholder="Choose a username"
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
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="mt-1"
                placeholder="Choose a password"
              />
            </div>

            <div>
              <label htmlFor="securityQuestion" className="block text-sm font-medium text-zinc-400">
                Security Question
              </label>
              <select
                id="securityQuestion"
                required
                className="mt-1 flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white ring-offset-zinc-950 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                onChange={(e) => setFormData(prev => ({ ...prev, securityQuestion: e.target.value }))}
              >
                <option value="">Select a question...</option>
                <option value="What is your pet's name?">What is your pet's name?</option>
                <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                <option value="What was your first car?">What was your first car?</option>
                <option value="What city were you born in?">What city were you born in?</option>
              </select>
            </div>

            <div>
              <label htmlFor="securityAnswer" className="block text-sm font-medium text-zinc-400">
                Security Answer
              </label>
              <Input
                id="securityAnswer"
                type="text"
                required
                onChange={(e) => setFormData(prev => ({ ...prev, securityAnswer: e.target.value }))}
                className="mt-1"
                placeholder="Answer to your question"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg">
            Sign up
          </Button>
          
          <p className="text-center text-sm text-zinc-400">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-indigo-400 hover:text-indigo-300">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
