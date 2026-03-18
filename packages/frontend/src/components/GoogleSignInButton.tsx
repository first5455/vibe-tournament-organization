import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'

interface GoogleSignInButtonProps {
  onSuccess: (userData: any, isNewUser: boolean) => void
  onError: (error: string) => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          renderButton: (element: HTMLElement, config: any) => void
        }
      }
    }
  }
}

export function GoogleSignInButton({ onSuccess, onError }: GoogleSignInButtonProps) {
  const { t } = useTranslation('common')
  const buttonRef = useRef<HTMLDivElement>(null)
  const [clientId, setClientId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch OAuth providers config from backend
    const fetchProviders = async () => {
      try {
        const data = await api('/auth/oauth/providers')
        const google = data.providers?.find((p: any) => p.name === 'google')
        if (google?.clientId) {
          setClientId(google.clientId)
        }
      } catch (err) {
        console.error('Failed to fetch OAuth providers', err)
      } finally {
        setLoading(false)
      }
    }
    fetchProviders()
  }, [])

  useEffect(() => {
    if (!clientId || !buttonRef.current) return

    // Load Google Identity Services script
    const existingScript = document.getElementById('google-gsi-script')
    if (existingScript) {
      initializeGoogle()
      return
    }

    const script = document.createElement('script')
    script.id = 'google-gsi-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = initializeGoogle
    document.head.appendChild(script)

    function initializeGoogle() {
      if (!window.google || !buttonRef.current) return

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
      })

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'filled_black',
        size: 'large',
        width: buttonRef.current.offsetWidth,
        text: 'continue_with',
        shape: 'rectangular',
      })
    }
  }, [clientId])

  const handleCredentialResponse = async (response: any) => {
    try {
      const res = await api('/auth/oauth/google', {
        method: 'POST',
        body: JSON.stringify({ credential: response.credential }),
      })
      onSuccess(res.user, res.isNewUser)
    } catch (err: any) {
      onError(err.message || 'Google sign-in failed')
    }
  }

  if (loading) return null
  if (!clientId) return null

  return (
    <div>
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-800" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-zinc-900/50 px-4 text-zinc-500">{t('orContinueWith')}</span>
        </div>
      </div>
      <div ref={buttonRef} className="w-full flex justify-center" />
    </div>
  )
}
