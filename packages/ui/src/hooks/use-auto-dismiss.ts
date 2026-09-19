import { useEffect, useRef } from 'react'

export function useAutoDismiss(active: boolean, delayMs: number, onDismiss: () => void) {
  const onDismissRef = useRef(onDismiss)

  useEffect(() => {
    onDismissRef.current = onDismiss
  }, [onDismiss])

  useEffect(() => {
    if (!active) {
      return
    }

    const timer = window.setTimeout(() => onDismissRef.current(), delayMs)
    return () => window.clearTimeout(timer)
  }, [active, delayMs])
}
