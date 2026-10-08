"use client"

import React, { useEffect, useState } from "react"
import { arduinoDeviceManager } from "@/lib/hardware/deviceManager"
import type { DeviceStatusInfo } from "@/lib/hardware/types"
import {
  GearIcon,
  ShieldIcon,
  AlertTriangleIcon,
  CheckIcon,
} from "@/components/ui/icons"
import styles from "./OperatorDeviceControl.module.css"

export interface OperatorDeviceControlProps {
  onDeviceStateChange?: (status: DeviceStatusInfo) => void
}

export function OperatorDeviceControl({ onDeviceStateChange }: OperatorDeviceControlProps) {
  const [deviceInfo, setDeviceInfo] = useState<DeviceStatusInfo>(() =>
    arduinoDeviceManager.getStatus(),
  )
  const [adapterType, setAdapterType] = useState<"web_serial" | "simulated">(() =>
    arduinoDeviceManager.isSimulated() ? "simulated" : "web_serial",
  )
  const [baudRate, setBaudRate] = useState<number>(57600)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [mockScenario, setMockScenario] = useState<string>("success_candidate_1")

  // Sync state on change
  useEffect(() => {
    const unsubscribe = arduinoDeviceManager.subscribe(() => {
      const updated = arduinoDeviceManager.getStatus()
      setDeviceInfo(updated)
      if (onDeviceStateChange) {
        onDeviceStateChange(updated)
      }
    })
    return () => unsubscribe()
  }, [onDeviceStateChange])

  async function handleToggleAdapter(type: "web_serial" | "simulated") {
    setIsProcessing(true)
    try {
      if (deviceInfo.status !== "disconnected") {
        await arduinoDeviceManager.disconnect()
      }
      arduinoDeviceManager.setAdapterType(type)
      setAdapterType(type)
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleConnect() {
    setIsProcessing(true)
    try {
      await arduinoDeviceManager.connect({ baudRate })
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleDisconnect() {
    setIsProcessing(true)
    try {
      await arduinoDeviceManager.disconnect()
    } finally {
      setIsProcessing(false)
    }
  }

  function handleMockScenarioChange(val: any) {
    setMockScenario(val)
    arduinoDeviceManager.getMockAdapter().setMockScenario(val)
  }

  const statusLabel = deviceInfo.status.toUpperCase()
  const statusClass =
    deviceInfo.status === "ready"
      ? styles.statusReady
      : deviceInfo.status === "connecting"
      ? styles.statusConnecting
      : deviceInfo.status === "error"
      ? styles.statusError
      : styles.statusDisconnected

  return (
    <aside className={styles.operatorBar} aria-label="Arduino Hardware Device Control Panel">
      <div className={styles.topRow}>
        <div className={styles.titleArea}>
          <GearIcon size={16} aria-hidden="true" />
          <h2 className={styles.title}>Arduino Device Control</h2>
          <span className={styles.operatorBadge}>Operator</span>
        </div>

        <div className={`${styles.statusPill} ${statusClass}`} role="status">
          <span className={styles.statusDot} />
          <span>{statusLabel}</span>
        </div>
      </div>

      {/* Adapter Mode Toggle */}
      <div className={styles.modeToggle} role="group" aria-label="Select Reader Hardware Interface">
        <button
          type="button"
          className={`${styles.toggleBtn} ${adapterType === "web_serial" ? styles.toggleBtnActive : ""}`}
          onClick={() => handleToggleAdapter("web_serial")}
          disabled={isProcessing}
        >
          Physical Arduino (Web Serial USB)
        </button>
        <button
          type="button"
          className={`${styles.toggleBtn} ${adapterType === "simulated" ? styles.toggleBtnActive : ""}`}
          onClick={() => handleToggleAdapter("simulated")}
          disabled={isProcessing}
        >
          Simulated (Demo Mode)
        </button>
      </div>

      {/* Prominent Disclaimer when Simulated Mode is Active */}
      {deviceInfo.isSimulated ? (
        <div className={styles.disclaimerBanner} role="note">
          <AlertTriangleIcon size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
          <span>
            <strong>Simulated Demo Mode:</strong> No physical Arduino hardware detected. Biometric matching is emulated for testing. Real fingerprint authentication requires physical USB Arduino connection.
          </span>
        </div>
      ) : (
        <div className={styles.hardwareNotice} role="note">
          <ShieldIcon size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
          <span>
            <strong>Physical Hardware Mode:</strong> Connecting to Arduino via Web Serial API. Requires Chrome/Edge and optical sensor firmware (R307/AS608) on Arduino.
          </span>
        </div>
      )}

      {/* Controls Row */}
      <div className={styles.controlsRow}>
        <div className={styles.configGroup}>
          <label htmlFor="baudRateSelect">Baud:</label>
          <select
            id="baudRateSelect"
            className={styles.selectInput}
            value={baudRate}
            onChange={(e) => setBaudRate(Number(e.target.value))}
            disabled={deviceInfo.status !== "disconnected" || isProcessing}
          >
            <option value={57600}>57600 (R307/AS608 Optical)</option>
            <option value={9600}>9600 (Standard Serial)</option>
            <option value={115200}>115200 (High Speed)</option>
          </select>

          {deviceInfo.isSimulated && (
            <>
              <label htmlFor="scenarioSelect">Test Scenario:</label>
              <select
                id="scenarioSelect"
                className={styles.selectInput}
                value={mockScenario}
                onChange={(e) => handleMockScenarioChange(e.target.value)}
              >
                <option value="success_candidate_1">Eligible: Aarav Sharma (Enrolled)</option>
                <option value="success_candidate_2">Eligible: Priya Patel (Enrolled)</option>
                <option value="ineligible_candidate">Ineligible: Rohan Verma (Already Completed)</option>
                <option value="unregistered_finger">Mismatch: Unregistered Fingerprint</option>
                <option value="sensor_error">Error: Prism Sensor Timeout</option>
              </select>
            </>
          )}
        </div>

        <div>
          {deviceInfo.status === "disconnected" || deviceInfo.status === "error" ? (
            <button
              type="button"
              className={styles.actionBtnConnect}
              onClick={handleConnect}
              disabled={isProcessing}
            >
              <CheckIcon size={14} aria-hidden="true" />
              {isProcessing ? "Connecting…" : "Connect Device"}
            </button>
          ) : (
            <button
              type="button"
              className={styles.actionBtnDisconnect}
              onClick={handleDisconnect}
              disabled={isProcessing}
            >
              {isProcessing ? "Disconnecting…" : "Disconnect"}
            </button>
          )}
        </div>
      </div>

      {/* Hardware Diagnostics */}
      <div className={styles.detailsGrid}>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Adapter</span>
          <span className={styles.detailValue} title={deviceInfo.adapterName}>
            {deviceInfo.adapterName}
          </span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Sensor Model</span>
          <span className={styles.detailValue} title={deviceInfo.sensorModel}>
            {deviceInfo.sensorModel}
          </span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Serial Port</span>
          <span className={styles.detailValue}>
            {deviceInfo.portName || "Not Connected"}
          </span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Last Handshake</span>
          <span className={styles.detailValue}>
            {deviceInfo.lastPing ? new Date(deviceInfo.lastPing).toLocaleTimeString() : "None"}
          </span>
        </div>
      </div>
    </aside>
  )
}
