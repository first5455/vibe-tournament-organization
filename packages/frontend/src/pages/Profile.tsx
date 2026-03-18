import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Button } from '../components/ui/button'

export default function Profile() {
  const { t } = useTranslation('profile')
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState(user?.username || '')
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [password, setPassword] = useState('')
  const [color, setColor] = useState(user?.color || '#ffffff')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleUpdate = async () => {
    setMessage('')
    setError('')
    try {
      const res = await api('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          userId: user?.id,
          requesterId: user?.id,
          username: username !== user?.username ? username : undefined,
          displayName: displayName !== user?.displayName ? displayName : undefined,
          password: password || undefined,
          color: color !== user?.color ? color : undefined,
          avatarUrl: avatarUrl !== user?.avatarUrl ? avatarUrl : undefined
        })
      })
      
      // Update local user state if username changed
      if (res.user) {
          const stored = JSON.parse(localStorage.getItem('user') || '{}')
        localStorage.setItem('user', JSON.stringify({ ...stored, ...res.user }))
        // Force reload to update context
        window.location.reload()
      }
      
      setMessage(t('settings.updateSuccess'))
      setPassword('')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDelete = async () => {
    if (!confirm(t('settings.deleteConfirm'))) return
    
    try {
      await api('/auth/account', {
        method: 'DELETE',
        body: JSON.stringify({ userId: user?.id })
      })
      logout()
      navigate('/')
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl">
      <h1 className="text-2xl font-bold text-white mb-6">{t('settings.title')}</h1>
      
      {message && <div className="mb-4 p-2 bg-green-500/20 text-green-400 rounded">{message}</div>}
      {error && <div className="mb-4 p-2 bg-red-500/20 text-red-400 rounded">{error}</div>}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">{t('settings.avatarUrl')}</label>
          <input
            type="text"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder={t('settings.avatarPlaceholder')}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:outline-none focus:border-zinc-600"
          />
          {avatarUrl && (/^(http:|https:)/.test(avatarUrl)) ? (
            <div className="mt-2">
              <p className="text-xs text-zinc-500 mb-1">{t('settings.preview')}</p>
              <img 
                src={avatarUrl} 
                alt="Avatar preview" 
                className="h-20 w-20 rounded-full object-cover border border-zinc-700"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.nextElementSibling?.classList.remove('hidden')
                }}
              />
              <p className="text-xs text-red-400 mt-1 hidden">{t('settings.failedToLoad')}</p>
            </div>
          ) : avatarUrl ? (
            <p className="text-xs text-red-400 mt-2">{t('settings.urlWarning')}</p>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">{t('settings.displayName')}</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:outline-none focus:border-zinc-600"
            placeholder={t('settings.displayNamePlaceholder')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">{t('settings.username')}</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:outline-none focus:border-zinc-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">{t('settings.customColor')}</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-20 bg-transparent cursor-pointer rounded border border-zinc-700"
            />
            <div className="text-sm text-zinc-500">
              {t('settings.colorDescription')}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">{t('settings.newPassword')}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white focus:outline-none focus:border-zinc-600"
          />
        </div>

        <div className="pt-4 flex gap-2">
          <Button onClick={handleUpdate} className="flex-1">{t('common:actions.saveChanges')}</Button>
        </div>

        <div className="pt-8 border-t border-zinc-800">
          <h2 className="text-lg font-semibold text-red-500 mb-2">{t('settings.dangerZone')}</h2>
          <Button className="w-full bg-red-500 hover:bg-red-600" onClick={handleDelete}>
            {t('settings.deleteAccount')}
          </Button>
        </div>
      </div>
    </div>
  )
}
