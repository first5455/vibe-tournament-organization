import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'
import i18n from '../i18n'

interface SiteSettings {
  siteName: string
  siteLogo: string
  featureLeaderboard: boolean
  featureDuelRoom: boolean
  featureDecks: boolean
  featureCustomDecks: boolean
  featureTournaments: boolean
  defaultLanguage: string
}

interface SiteSettingsContextType {
  settings: SiteSettings
  isLoading: boolean
  refreshSettings: () => Promise<void>
  isFeatureEnabled: (feature: string) => boolean
}

const defaultSettings: SiteSettings = {
  siteName: 'VibeTourney',
  siteLogo: '',
  featureLeaderboard: true,
  featureDuelRoom: true,
  featureDecks: true,
  featureCustomDecks: true,
  featureTournaments: true,
  defaultLanguage: 'en',
}

const SiteSettingsContext = createContext<SiteSettingsContextType>({
  settings: defaultSettings,
  isLoading: true,
  refreshSettings: async () => {},
  isFeatureEnabled: () => true,
})

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)

  const refreshSettings = useCallback(async () => {
    try {
      const data = await api('/settings')
      const newSettings = {
        siteName: data.siteName || 'VibeTourney',
        siteLogo: data.siteLogo || '',
        featureLeaderboard: data.featureLeaderboard ?? true,
        featureDuelRoom: data.featureDuelRoom ?? true,
        featureDecks: data.featureDecks ?? true,
        featureCustomDecks: data.featureCustomDecks ?? true,
        featureTournaments: data.featureTournaments ?? true,
        defaultLanguage: data.defaultLanguage || 'en',
      }
      setSettings(newSettings)

      // Apply admin default language if user hasn't chosen one yet
      if (!localStorage.getItem('i18nextLng')) {
        i18n.changeLanguage(newSettings.defaultLanguage)
      }
    } catch (err) {
      console.error('Failed to fetch site settings', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshSettings()
  }, [refreshSettings])

  const isFeatureEnabled = useCallback((feature: string) => {
    switch (feature) {
      case 'leaderboard': return settings.featureLeaderboard
      case 'duel_room': return settings.featureDuelRoom
      case 'decks': return settings.featureDecks
      case 'custom_decks': return settings.featureCustomDecks
      case 'tournaments': return settings.featureTournaments
      default: return true
    }
  }, [settings])

  return (
    <SiteSettingsContext.Provider value={{ settings, isLoading, refreshSettings, isFeatureEnabled }}>
      {children}
    </SiteSettingsContext.Provider>
  )
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext)
}
