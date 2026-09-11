"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const DEEPGRAM_API_KEY = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY ?? ""

const DEEPGRAM_WS_URL =
  "wss://api.deepgram.com/v1/listen" +
  "?model=nova-2&language=en-IN&interim_results=true&smart_format=true&endpointing=400"

export type MicPermission = "unknown" | "prompt" | "granted" | "denied"

interface UseSpeechRecognitionOptions {
  enabled: boolean
  onCommand: (transcript: string) => void
}

export function useSpeechRecognition({ enabled, onCommand }: UseSpeechRecognitionOptions) {
  const [transcript, setTranscript] = useState("")
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // micPermission tracks the REAL browser-level mic permission state so the UI
  // can show the right screen before we even try to call getUserMedia.
  const [micPermission, setMicPermission] = useState<MicPermission>("unknown")

  const socketRef = useRef<WebSocket | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const onCommandRef = useRef(onCommand)
  onCommandRef.current = onCommand

  // ── Feature detection + live permission tracking ───────────────────────────
  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      typeof MediaRecorder !== "undefined" &&
      !!navigator?.mediaDevices?.getUserMedia
    setSupported(ok)
    if (!ok) return

    // navigator.permissions.query lets us read AND watch the mic permission state
    // without triggering a browser prompt. This is how apps like Google Meet
    // know whether to show "Allow mic" vs "Mic blocked" before you click anything.
    if (!navigator.permissions) {
      setMicPermission("prompt") // permissions API not available, assume we need to ask
      return
    }

    let permissionStatus: PermissionStatus

    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((status) => {
        permissionStatus = status
        setMicPermission(status.state as MicPermission)

        // onchange fires whenever the user updates the permission in the browser
        status.onchange = () => {
          setMicPermission(status.state as MicPermission)
        }
      })
      .catch(() => {
        // Permissions API not supported for mic on this browser — assume prompt
        setMicPermission("prompt")
      })

    return () => {
      // Clean up the listener
      if (permissionStatus) permissionStatus.onchange = null
    }
  }, [])

  // ── stopListening ──────────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop()
    }
    recorderRef.current = null

    if (socketRef.current) {
      const ws = socketRef.current
      socketRef.current = null
      try { ws.close(1000) } catch { /* ignore */ }
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }

    setListening(false)
  }, [])

  // ── requestMicPermission ───────────────────────────────────────────────────
  // Called when the user clicks "Allow Microphone" on the permission prompt screen.
  // Calls getUserMedia just to trigger the browser popup — we don't start
  // recording yet, that happens in startListening.
  const requestMicPermission = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      stream.getTracks().forEach((t) => t.stop())
      setMicPermission("granted")
    } catch (err) {
      console.error("mic permission error:", (err as Error)?.name, err)
      setMicPermission("denied")
    }
  }, [])

  // ── startListening ─────────────────────────────────────────────────────────
  const startListening = useCallback(async () => {
    setError(null)
    setTranscript("")

    if (!DEEPGRAM_API_KEY) {
      setError("no-key")
      return
    }

    stopListening()

    // Request the actual mic stream for recording
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream
      setMicPermission("granted") // reflect immediately if it was previously "prompt"
    } catch {
      setMicPermission("denied")
      setError("not-allowed")
      return
    }

    const ws = new WebSocket(DEEPGRAM_WS_URL, ["token", DEEPGRAM_API_KEY])
    socketRef.current = ws
    ws.binaryType = "arraybuffer"

    ws.onopen = () => {
      setListening(true)

      const mimeType =
        ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"].find((m) =>
          MediaRecorder.isTypeSupported(m),
        ) ?? ""

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(e.data)
        }
      }

      recorder.start(250)
    }

    ws.onmessage = (event) => {
      let data: any
      try { data = JSON.parse(event.data as string) } catch { return }
      if (data.type !== "Results") return

      const text: string = (data.channel?.alternatives?.[0]?.transcript ?? "").trim()
      if (!text) return

      setTranscript(text)
      if (data.is_final) onCommandRef.current(text.toLowerCase())
    }

    ws.onerror = () => {
      setError("network")
      stopListening()
    }

    ws.onclose = (event) => {
      if (event.code !== 1000) setError("network")
      setListening(false)
    }
  }, [stopListening])

  // ── Auto-start listening when permission is granted ────────────────────────
  // Fires once when micPermission first becomes "granted" (either because the
  // user just clicked Allow, or because it was already granted from a previous
  // session and the permissions query resolves on mount).
  const autoStartedRef = useRef(false)
  useEffect(() => {
    if (micPermission === "granted" && !autoStartedRef.current) {
      autoStartedRef.current = true
      startListening()
    }
  }, [micPermission, startListening])

  // ── toggleListening ────────────────────────────────────────────────────────
  const toggleListening = useCallback(() => {
    if (listening) {
      stopListening()
    } else {
      startListening()
    }
  }, [listening, startListening, stopListening])

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopListening() }
  }, [stopListening])

  return {
    transcript,
    listening,
    supported,
    error,
    micPermission,
    requestMicPermission,
    startListening,
    stopListening,
    toggleListening,
  }
}
