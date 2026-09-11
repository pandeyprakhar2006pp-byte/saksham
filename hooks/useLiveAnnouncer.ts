"use client"

import { useCallback, useState } from "react"

export function useLiveAnnouncer() {
  const [message, setMessage] = useState("")
  const announce = useCallback((msg: string) => setMessage(msg), [])
  return { message, announce }
}
