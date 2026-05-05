import { useState } from "react"
import { RegistryDiagram } from "./components/RegistryDiagram"
import type { AnimationConfig } from "./components/RegistryDiagram/types"

const NODES = [
  { id: "root",     label: "<root>",      type: "registry" as const },
  { id: "eth-l",    label: "eth",          type: "label"    as const },
  { id: "eth-r",    label: "eth",          type: "registry" as const },
  { id: "left-l",   label: "eth",          type: "label"    as const },
  { id: "right-l",  label: "eth",          type: "label"    as const },
  { id: "workemon", label: "workemon.eth", type: "registry" as const },
  { id: "root2",    label: "<root>",       type: "registry" as const },
]

const EDGES = [
  { from: "root",    to: "eth-l"   },
  { from: "eth-l",   to: "eth-r"   },
  { from: "eth-r",   to: "left-l"  },
  { from: "eth-r",   to: "right-l" },
  { from: "left-l",  to: "workemon" },
  { from: "right-l", to: "root2"   },
]

const PRESETS: AnimationConfig["preset"][] = ["draw", "fade", "pop", "none"]

export default function App() {
  const [preset, setPreset] = useState<AnimationConfig["preset"]>("draw")
  const [key, setKey] = useState(0)

  function handlePreset(p: AnimationConfig["preset"]) {
    setPreset(p)
    setKey((k) => k + 1)
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0908",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
        padding: 40,
      }}
    >
      {/* Preset toggle */}
      <div style={{ display: "flex", gap: 8 }}>
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => handlePreset(p)}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.15)",
              background: preset === p ? "#595755" : "transparent",
              color: preset === p ? "#faf9f7" : "#888",
              fontFamily: "'Geist Mono', monospace",
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {p}
          </button>
        ))}
      </div>

      <RegistryDiagram
        key={key}
        nodes={NODES}
        edges={EDGES}
        animation={{ preset, stagger: 0.1, duration: 0.5 }}
      />
    </div>
  )
}
