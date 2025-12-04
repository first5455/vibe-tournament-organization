import { useState, useCallback } from 'react'

export function useRefresh(refreshFn: () => Promise<void> | void, cooldownMs: number = 5000) {
  const [isCoolingDown, setIsCoolingDown] = useState(false)

  const handleRefresh = useCallback(async () => {
    if (isCoolingDown) return

    await refreshFn()
    setIsCoolingDown(true)
    
    setTimeout(() => {
      setIsCoolingDown(false)
    }, cooldownMs)
  }, [refreshFn, cooldownMs, isCoolingDown])

  return { handleRefresh, isCoolingDown }
}
