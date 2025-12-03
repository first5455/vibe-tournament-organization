import { useState } from 'react'
import { api } from '../lib/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Link, useNavigate } from 'react-router-dom'

export default function ForgotPassword() {
  const [step, setStep] = useState<'username' | 'answer' | 'reset'>('username')
  const [username, setUsername] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await api('/auth/recovery-question', {
        method: 'POST',
        body: JSON.stringify({ username })
      })
      setQuestion(res.question)
      setStep('answer')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          username,
          securityAnswer: answer,
          newPassword
        })
      })
      alert('Password reset successfully! Please login.')
      navigate('/login')
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-zinc-900/50 p-8 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white">Reset Password</h2>
          <p className="mt-2 text-sm text-zinc-400">Recover your account</p>
        </div>
        
        {error && (
          <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500 ring-1 ring-red-500/20">
            {error}
          </div>
        )}

        {step === 'username' && (
          <form className="mt-8 space-y-6" onSubmit={handleUsernameSubmit}>
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
            <Button type="submit" className="w-full" size="lg">
              Next
            </Button>
          </form>
        )}

        {step === 'answer' && (
          <form className="mt-8 space-y-6" onSubmit={handleResetSubmit}>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Security Question:
              </label>
              <p className="text-white mb-4">{question}</p>
              
              <label htmlFor="answer" className="block text-sm font-medium text-zinc-400">
                Your Answer
              </label>
              <Input
                id="answer"
                type="text"
                required
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="mt-1"
                placeholder="Enter your answer"
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-zinc-400">
                New Password
              </label>
              <Input
                id="newPassword"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1"
                placeholder="Choose a new password"
              />
            </div>

            <Button type="submit" className="w-full" size="lg">
              Reset Password
            </Button>
          </form>
        )}

        <div className="text-center">
          <Link to="/login" className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
