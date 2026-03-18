import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Shield, Key, Link2, Unlink } from 'lucide-react'
import { GoogleSignInButton } from '../components/GoogleSignInButton'

interface OAuthAccount {
  id: number
  provider: string
  email?: string
  displayName?: string
  createdAt: string
}

export default function SecuritySettings() {
  const { t } = useTranslation('profile')
  const { user, refreshUser } = useAuth()
  const [oauthAccounts, setOauthAccounts] = useState<OAuthAccount[]>([])
  const [loading, setLoading] = useState(true)

  // Password form
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  // Security question form
  const [securityQuestion, setSecurityQuestion] = useState('')
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [securityError, setSecurityError] = useState('')
  const [securitySuccess, setSecuritySuccess] = useState('')

  useEffect(() => {
    if (user) {
      fetchOAuthAccounts()
    }
  }, [user])

  const fetchOAuthAccounts = async () => {
    if (!user) return
    try {
      const data = await api(`/auth/oauth/accounts/${user.id}`)
      setOauthAccounts(data.accounts || [])
    } catch (err) {
      console.error('Failed to fetch OAuth accounts', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (newPassword.length < 4) {
      setPasswordError(t('security.errors.passwordMinLength'))
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('security.errors.passwordMismatch'))
      return
    }

    try {
      await api('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          userId: user?.id,
          password: newPassword,
        }),
      })
      setPasswordSuccess(t('security.success.passwordUpdated'))
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password')
    }
  }

  const handleSetSecurityQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    setSecurityError('')
    setSecuritySuccess('')

    if (!securityQuestion || !securityAnswer) {
      setSecurityError(t('security.errors.selectQuestion'))
      return
    }

    try {
      await api('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          userId: user?.id,
          securityQuestion,
          securityAnswer,
        }),
      })
      setSecuritySuccess(t('security.success.questionUpdated'))
      setSecurityAnswer('')
    } catch (err: any) {
      setSecurityError(err.message || 'Failed to update security question')
    }
  }

  const handleUnlinkOAuth = async (provider: string) => {
    if (!confirm(t('security.linkedAccounts.unlinkConfirm', { provider }))) return
    try {
      await api(`/auth/oauth/unlink/${provider}`, {
        method: 'DELETE',
        body: JSON.stringify({ userId: user?.id }),
      })
      fetchOAuthAccounts()
      refreshUser()
    } catch (err: any) {
      alert(err.message || 'Failed to unlink account')
    }
  }

  const handleLinkOAuth = async (_userData: any) => {
    // The GoogleSignInButton handles the OAuth flow, but for linking
    // we need to use the link endpoint instead
    fetchOAuthAccounts()
    refreshUser()
  }

  if (loading) return <div className="flex justify-center items-center h-96 text-zinc-500">{t('user.loading')}</div>

  const isOAuthUser = oauthAccounts.length > 0

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">{t('security.title')}</h1>
        <p className="text-zinc-400 mt-1">{t('security.subtitle')}</p>
      </div>

      {/* Password Section */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Key className="h-5 w-5 text-indigo-500" />
          {isOAuthUser ? t('security.setPassword.title') : t('security.setPassword.changeTitle')}
        </h2>
        {isOAuthUser && (
          <p className="text-sm text-zinc-400">
            {t('security.setPassword.description')}
          </p>
        )}

        <form onSubmit={handleSetPassword} className="space-y-4">
          {passwordError && (
            <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500 ring-1 ring-red-500/20">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-500 ring-1 ring-green-500/20">
              {passwordSuccess}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">{t('security.setPassword.newPassword')}</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('security.setPassword.newPasswordPlaceholder')}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">{t('security.setPassword.confirmPassword')}</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('security.setPassword.confirmPasswordPlaceholder')}
              required
            />
          </div>
          <Button type="submit">
            {isOAuthUser ? t('security.setPassword.setButton') : t('security.setPassword.updateButton')}
          </Button>
        </form>
      </div>

      {/* Security Question Section */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-500" />
          {t('security.securityQuestion.title')}
        </h2>
        <p className="text-sm text-zinc-400">
          {t('security.securityQuestion.description')}
        </p>

        <form onSubmit={handleSetSecurityQuestion} className="space-y-4">
          {securityError && (
            <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500 ring-1 ring-red-500/20">
              {securityError}
            </div>
          )}
          {securitySuccess && (
            <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-500 ring-1 ring-green-500/20">
              {securitySuccess}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">{t('security.securityQuestion.title')}</label>
            <select
              className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              value={securityQuestion}
              onChange={(e) => setSecurityQuestion(e.target.value)}
              required
            >
              <option value="">{t('security.securityQuestion.selectQuestion')}</option>
              <option value="What is your pet's name?">{t('security.securityQuestion.questions.petName')}</option>
              <option value="What is your mother's maiden name?">{t('security.securityQuestion.questions.maidenName')}</option>
              <option value="What was your first car?">{t('security.securityQuestion.questions.firstCar')}</option>
              <option value="What city were you born in?">{t('security.securityQuestion.questions.birthCity')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">{t('security.securityQuestion.answer')}</label>
            <Input
              type="text"
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              placeholder={t('security.securityQuestion.answerPlaceholder')}
              required
            />
          </div>
          <Button type="submit">{t('security.securityQuestion.save')}</Button>
        </form>
      </div>

      {/* Linked Accounts Section */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Link2 className="h-5 w-5 text-emerald-500" />
          {t('security.linkedAccounts.title')}
        </h2>
        <p className="text-sm text-zinc-400">
          {t('security.linkedAccounts.description')}
        </p>

        {oauthAccounts.length > 0 ? (
          <div className="space-y-3">
            {oauthAccounts.map(account => (
              <div key={account.id} className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-lg border border-white/5">
                <div className="flex items-center gap-3">
                  {account.provider === 'google' && (
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  <div>
                    <p className="text-sm font-medium text-white capitalize">{account.provider}</p>
                    {account.email && <p className="text-xs text-zinc-500">{account.email}</p>}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUnlinkOAuth(account.provider)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Unlink className="h-4 w-4 mr-1" />
                  {t('security.linkedAccounts.unlink')}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">{t('security.linkedAccounts.noAccounts')}</p>
        )}

        {/* Link new account */}
        {!oauthAccounts.find(a => a.provider === 'google') && (
          <div className="pt-2">
            <p className="text-sm text-zinc-400 mb-2">{t('security.linkedAccounts.linkNew')}</p>
            <GoogleSignInButton
              onSuccess={async (userData) => {
                // If we get here via the regular flow, user is already logged in
                // We need to use the link endpoint instead
                // The GoogleSignInButton calls /auth/oauth/google which will detect the user
                // For linking, we handle it differently
                handleLinkOAuth(userData)
              }}
              onError={(err) => alert(err)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
