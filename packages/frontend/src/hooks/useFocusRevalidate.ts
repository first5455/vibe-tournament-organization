import { useEffect, useRef } from 'react'

export function useFocusRevalidate(revalidate: () => void, staleTimeMs: number = 5000) {
  const lastRevalidateTime = useRef(Date.now())

  useEffect(() => {
    const onFocus = () => {
      const now = Date.now()
      if (now - lastRevalidateTime.current > staleTimeMs) {
        revalidate()
        lastRevalidateTime.current = now
      }
    }

    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [revalidate, staleTimeMs])
}
