"use client";

import { useEffect, useState } from "react";
import { AppSettings, LLMModel, PublishMethod } from "@/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (updatedSettings: AppSettings) => {
    try {
      setSaving(true);
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings: updatedSettings }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("System settings saved successfully!", "success");
        setSettings(updatedSettings);
      } else {
        showToast(data.error || "Failed to save settings", "error");
      }
    } catch (err: any) {
      showToast(err.message || "An error occurred", "error");
    } finally {
      setSaving(false);
    }
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const updateModel = (model: LLMModel) => {
    if (!settings) return;
    const updated = { ...settings, defaultModel: model };
    handleSave(updated);
  };

  const updateMixField = (field: "capx" | "niche" | "personal", value: number) => {
    if (!settings) return;
    const currentMix = settings.defaultContentMix;
    const diff = value - currentMix[field];
    
    // Distribute the change proportionally between other fields to maintain a total of 100%
    const otherFields = (["capx", "niche", "personal"] as Array<"capx" | "niche" | "personal">).filter(
      (f) => f !== field
    );
    
    const newMix = { ...currentMix };
    newMix[field] = value;

    const otherSum = currentMix[otherFields[0]] + currentMix[otherFields[1]];
    if (otherSum > 0) {
      const prop1 = currentMix[otherFields[0]] / otherSum;
      const prop2 = currentMix[otherFields[1]] / otherSum;
      
      newMix[otherFields[0]] = Math.max(0, Math.round(currentMix[otherFields[0]] - diff * prop1));
      newMix[otherFields[1]] = Math.max(0, Math.round(currentMix[otherFields[1]] - diff * prop2));
    } else {
      const halfDiff = Math.round(diff / 2);
      newMix[otherFields[0]] = Math.max(0, -halfDiff);
      newMix[otherFields[1]] = Math.max(0, -(diff - halfDiff));
    }

    const sum = newMix.capx + newMix.niche + newMix.personal;
    if (sum !== 100) {
      newMix[otherFields[0]] += (100 - sum);
    }

    const updated = { ...settings, defaultContentMix: newMix };
    setSettings(updated); // Update UI state instantly, user can click Save or let auto-save work
  };

  if (loading || !settings) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">LLM configuration, content defaults, and system preferences</p>
        </div>
        <div className="page-body">
          <div className="card skeleton" style={{ height: "400px", maxWidth: "680px" }} />
        </div>
      </>
    );
  }

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: toast.type === "success" ? "var(--accent-secondary)" : "var(--accent-danger)",
            color: "var(--text-inverse)",
            padding: "12px 24px",
            borderRadius: "var(--radius-md)",
            zIndex: 100,
            fontSize: "14px",
            fontWeight: 600,
            boxShadow: "var(--shadow-lg)",
            animation: "fadeIn 0.3s ease-out",
          }}
        >
          {toast.message}
        </div>
      )}

      <div className="page-header" style={{ display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">LLM configuration, content defaults, and system preferences</p>
        </div>
        <button
          className="btn btn-primary btn-sm animate-pulse-glow"
          onClick={() => handleSave(settings)}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      <div className="page-body">
        <div style={{ maxWidth: "680px", display: "flex", flexDirection: "column", gap: "28px" }}>

          {/* LLM Configuration */}
          <div className="card" style={{ padding: "24px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
              LLM Configuration
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "20px" }}>
              Choose the default model for content generation. API keys are loaded from .env.local
            </p>

            {/* Model Selection */}
            <div style={{ marginBottom: "20px" }}>
              <label className="label">Active Model</label>
              <div style={{ display: "flex", gap: "10px" }}>
                {[
                  { id: "gemini-flash", label: "Gemini 2.5 Flash", desc: "Fast, cost-efficient", icon: "⚡" },
                  { id: "claude-sonnet", label: "Claude Sonnet", desc: "Higher voice quality", icon: "🎭" },
                ].map((model) => (
                  <button
                    key={model.id}
                    onClick={() => updateModel(model.id as LLMModel)}
                    style={{
                      flex: 1,
                      padding: "14px 16px",
                      background: settings.defaultModel === model.id ? "var(--accent-primary-muted)" : "var(--bg-secondary)",
                      border: `1px solid ${settings.defaultModel === model.id ? "var(--accent-primary)" : "var(--border-primary)"}`,
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all var(--transition-fast)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "16px" }}>{model.icon}</span>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: settings.defaultModel === model.id ? "var(--accent-primary)" : "var(--text-primary)" }}>
                        {model.label}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                      {model.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* API Key Status */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                background: "var(--bg-secondary)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-primary)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "14px" }}>⚡</span>
                  <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>Gemini API Key</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div className={`status-dot ${settings.geminiKeyConfigured ? "status-online" : "status-offline"}`} />
                  <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                    {settings.geminiKeyConfigured ? "Configured" : "Not configured"}
                  </span>
                </div>
              </div>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                background: "var(--bg-secondary)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-primary)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "14px" }}>🎭</span>
                  <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>Claude API Key</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div className={`status-dot ${settings.claudeKeyConfigured ? "status-online" : "status-offline"}`} />
                  <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                    {settings.claudeKeyConfigured ? "Configured" : "Not configured"}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "14px", padding: "10px 14px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)" }}>
              <code style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                Add keys to <span style={{ color: "var(--accent-primary)" }}>.env.local</span> → GEMINI_API_KEY and CLAUDE_API_KEY
              </code>
            </div>
          </div>

          {/* Content Defaults */}
          <div className="card" style={{ padding: "24px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
              Content Defaults
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "20px" }}>
              Default content mix and posting frequency. Can be overridden per persona.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label className="label">Tweets per Week</label>
                <input
                  className="input"
                  type="number"
                  value={settings.postsPerWeek}
                  min={1}
                  max={21}
                  onChange={(e) => setSettings({ ...settings, postsPerWeek: parseInt(e.target.value) || 7 })}
                />
              </div>
              <div>
                <label className="label">Posting Times (comma separated)</label>
                <input
                  className="input"
                  type="text"
                  value={settings.defaultPostingTimes.join(", ")}
                  placeholder="e.g. 09:00, 13:00, 18:00"
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultPostingTimes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                />
              </div>
            </div>

            {/* Content Mix */}
            <div style={{ marginTop: "20px" }}>
              <label className="label">Default Content Mix (Sum equals 100%)</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  { label: "Capx", key: "capx" as const, color: "var(--pillar-capx)" },
                  { label: "Niche", key: "niche" as const, color: "var(--pillar-niche)" },
                  { label: "Personal", key: "personal" as const, color: "var(--pillar-personal)" },
                ].map((pillar) => (
                  <div key={pillar.label} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: pillar.color }} />
                    <span style={{ fontSize: "13px", color: "var(--text-secondary)", width: "70px" }}>{pillar.label}</span>
                    <input
                      className="input"
                      type="number"
                      value={settings.defaultContentMix[pillar.key]}
                      min={0}
                      max={100}
                      onChange={(e) => updateMixField(pillar.key, parseInt(e.target.value) || 0)}
                      style={{ width: "80px" }}
                    />
                    <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Automation Level Settings */}
            <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--border-secondary)" }}>
              <label className="label">System Automation Level (Guardrail Mode)</label>
              <select
                className="select"
                value={(settings as any).defaultAutomationTier || "manual-review"}
                onChange={(e) => setSettings({ ...settings, defaultAutomationTier: e.target.value } as any)}
              >
                <option value="manual-review">Tier 1: Manual Review (Recommended for safety)</option>
                <option value="semi-autonomous">Tier 2: Semi-Autonomous (Auto-approve if Voice Match &gt; 90%)</option>
                <option value="fully-autonomous">Tier 3: Fully Autonomous (Full automatic publishing)</option>
              </select>
              <p style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "6px", lineHeight: "1.4" }}>
                Configure network guardrails. Semi-autonomous mode automatically approves generated posts that match the style checklist of the persona perfectly.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
