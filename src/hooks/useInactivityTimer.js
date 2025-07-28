"use client"

import { useEffect, useRef, useCallback } from "react"

export const useInactivityTimer = ({ onTimeout, onActivity, timeout = 300000 }) => {
  const timerRef = useRef(null)

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(onTimeout, timeout)
  }, [onTimeout, timeout])

  const handleActivity = useCallback(() => {
    if (onActivity) onActivity()
    resetTimer()
  }, [onActivity, resetTimer])

  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"]
    events.forEach((event) => window.addEventListener(event, handleActivity))
    resetTimer()

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [handleActivity, resetTimer])
}
