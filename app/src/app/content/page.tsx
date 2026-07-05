"use client";

import { useEffect, useState } from "react";
import { Account, WeeklyPlan, ContentSlot, TweetVariant, Pillar, Persona } from "@/types";
import { analyzeVoiceDrift } from "@/lib/personas/drift";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const colors = [
  "var(--account-1)",
  "var(--account-2)",
  "var(--account-3)",
  "var(--account-4)",
  "var(--account-5)",
  "var(--account-6)",
  "var(--account-7)",
];

const pillarColors: Record<Pillar, string> = {
  capx: "var(--pillar-capx)",
  niche: "var(--pillar-niche)",
  personal: "var(--pillar-personal)",
};

export default function ContentStudioPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [weekStart, setWeekStart] = useState<string>("");
  const [nicheContext, setNicheContext] = useState<string>("");
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [regeneratingSlotId, setRegeneratingSlotId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);

  // Initialize dates (find this week's Monday)
  useEffect(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    const monday = new Date(today.setDate(diff));
    setWeekStart(monday.toISOString().split("T")[0]);
  }, []);

  // Load accounts and personas
  const loadInitialData = async () => {
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (data.success && data.accounts.length > 0) {
        setAccounts(data.accounts);
        setSelectedAccountId(data.accounts[0].id);
      }

      const pRes = await fetch("/api/personas");
      const pData = await pRes.json();
      if (pData.success) {
        setPersonas(pData.personas || []);
      }
    } catch (err) {
      console.error("Failed to load initial data:", err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Fetch plan when account or week changes
  const fetchPlan = async () => {
    if (!selectedAccountId || !weekStart) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/plans?accountId=${selectedAccountId}&weekStart=${weekStart}`);
      const data = await res.json();
      if (data.success && data.plan) {
        setPlan(data.plan);
      } else {
        setPlan(null);
      }
    } catch (err) {
      console.error("Failed to load weekly plan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, [selectedAccountId, weekStart]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Generate complete week
  const handleGenerateWeek = async () => {
    if (!selectedAccountId || !weekStart) return;
    try {
      setGenerating(true);
      const res = await fetch("/api/generate/week", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId: selectedAccountId,
          weekStart,
          nicheContext,
        }),
      });
      const data = await res.json();
      if (data.success && data.plan) {
        setPlan(data.plan);
        showToast("Weekly content batch generated successfully!", "success");
      } else {
        showToast(data.error || "Failed to generate week batch", "error");
      }
    } catch (err: any) {
      showToast(err.message || "An error occurred", "error");
    } finally {
      setGenerating(false);
    }
  };

  // Regenerate a single slot
  const handleRegenerateSlot = async (slotId: string, pillar: Pillar) => {
    if (!selectedAccountId) return;
    try {
      setRegeneratingSlotId(slotId);
      const res = await fetch("/api/generate/slot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId: selectedAccountId,
          pillar,
          nicheContext,
          slotId,
        }),
      });
      const data = await res.json();
      if (data.success && data.variants && plan) {
        const updatedSlots = plan.slots.map((s) => {
          if (s.id === slotId) {
            return {
              ...s,
              variants: data.variants,
              selectedVariantId: data.variants[0]?.id || null,
              status: "draft" as const,
            };
          }
          return s;
        });

        const updatedPlan = { ...plan, slots: updatedSlots };
        setPlan(updatedPlan);
        showToast("Slot content regenerated successfully!", "success");
      } else {
        showToast(data.error || "Failed to regenerate slot", "error");
      }
    } catch (err: any) {
      showToast(err.message || "An error occurred", "error");
    } finally {
      setRegeneratingSlotId(null);
    }
  };

  // Save changes
  const handleSavePlan = async (silent: boolean = false) => {
    if (!plan) return;
    try {
      setSaving(true);
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.success) {
        if (!silent) showToast("Weekly plan saved successfully!", "success");
      } else {
        if (!silent) showToast(data.error || "Failed to save plan", "error");
      }
    } catch (err: any) {
      if (!silent) showToast(err.message || "An error occurred", "error");
    } finally {
      setSaving(false);
    }
  };

  // Approve all slots
  const handleApproveAll = () => {
    if (!plan) return;
    const updatedSlots = plan.slots.map((s) => ({
      ...s,
      status: "approved" as const,
    }));
    const updatedPlan = {
      ...plan,
      slots: updatedSlots,
      status: "reviewed" as const,
    };
    setPlan(updatedPlan);
    showToast("All slots approved! Don't forget to Save.", "success");
  };

  const updateSlotVariantBody = (slotId: string, variantId: string, text: string) => {
    if (!plan) return;
    const updatedSlots = plan.slots.map((slot) => {
      if (slot.id === slotId) {
        const updatedVariants = slot.variants.map((v) => {
          if (v.id === variantId) {
            return { ...v, body: text };
          }
          return v;
        });
        return { ...slot, variants: updatedVariants };
      }
      return slot;
    });
    setPlan({ ...plan, slots: updatedSlots });
  };

  const selectVariant = (slotId: string, variantId: string) => {
    if (!plan) return;
    const updatedSlots = plan.slots.map((slot) => {
      if (slot.id === slotId) {
        return { ...slot, selectedVariantId: variantId };
      }
      return slot;
    });
    setPlan({ ...plan, slots: updatedSlots });
  };

  const toggleSlotApproval = (slotId: string) => {
    if (!plan) return;
    const updatedSlots = plan.slots.map((slot) => {
      if (slot.id === slotId) {
        const nextStatus = slot.status === "approved" ? "draft" : "approved";
        return { ...slot, status: nextStatus as any };
      }
      return slot;
    });
    setPlan({ ...plan, slots: updatedSlots });
  };

  const getSelectedVariantText = (slot: ContentSlot) => {
    const active = slot.variants.find((v) => v.id === slot.selectedVariantId);
    return active ? active.body : "";
  };

  const activeAccount = accounts.find((a) => a.id === selectedAccountId);

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

      {/* Header */}
      <div className="page-header" style={{ borderBottom: "none", paddingBottom: "12px" }}>
        <h1 className="page-title">Content Studio</h1>
        <p className="page-subtitle">Generate, review, and approve weekly tweet batches for all personas</p>
      </div>

      {/* Account Tabs Header */}
      <div style={{
        background: "var(--bg-secondary)",
        padding: "0 32px 12px",
        borderBottom: "1px solid var(--border-primary)",
        position: "sticky",
        top: "73px",
        zIndex: 25,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
      }}>
        {/* Account Selector */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
          {accounts.map((a, i) => {
            const color = colors[i % colors.length];
            const active = a.id === selectedAccountId;
            return (
              <button
                key={a.id}
                onClick={() => setSelectedAccountId(a.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  borderRadius: "var(--radius-full)",
                  background: active ? `${color}20` : "var(--bg-tertiary)",
                  border: `1px solid ${active ? color : "var(--border-secondary)"}`,
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: active ? 600 : 450,
                  whiteSpace: "nowrap",
                  transition: "all var(--transition-fast)",
                }}
              >
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color }} />
                {a.handle}
              </button>
            );
          })}
        </div>

        {/* Date Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <label className="label" style={{ marginBottom: 0 }}>Week Start</label>
          <input
            type="date"
            className="input"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            style={{ width: "150px", padding: "6px 10px" }}
          />
        </div>
      </div>

      {/* Body */}
      <div className="page-body">
        {/* Generator Controls Panel */}
        <div className="card" style={{ padding: "20px", marginBottom: "24px" }}>
          <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <label className="label">Niche Trends / Weekly Context (Optional)</label>
              <textarea
                className="textarea"
                value={nicheContext}
                onChange={(e) => setNicheContext(e.target.value)}
                placeholder="Paste recent news, trends, or specific items from this persona's niche (music releases, race results, tickers, moves) to ground this week's niche tweets..."
                style={{ minHeight: "68px" }}
              />
            </div>
            <div style={{ width: "240px", display: "flex", flexDirection: "column", gap: "10px", alignSelf: "stretch", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                  Current Status
                </div>
                <div style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: 500 }}>
                  {plan ? (
                    <span style={{ color: "var(--accent-secondary)" }}>
                      ✓ Generated (Pillars: {plan.slots.map(s => s.pillar[0]).join(", ")})
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-tertiary)" }}>No plan generated</span>
                  )}
                </div>
              </div>
              
              <button
                className="btn btn-primary"
                onClick={handleGenerateWeek}
                disabled={generating || !selectedAccountId}
                style={{ width: "100%" }}
              >
                {generating ? "Generating batch..." : plan ? "Regenerate Full Week" : "Generate Weekly Batch"}
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[1, 2, 3].map((n) => (
              <div key={n} className="card skeleton" style={{ height: "180px" }} />
            ))}
          </div>
        ) : !plan ? (
          /* Empty State */
          <div className="card" style={{ padding: "48px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>📅</div>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
              No Weekly Plan Found
            </h3>
            <p style={{ fontSize: "14px", color: "var(--text-tertiary)", maxWidth: "420px", margin: "0 auto 20px" }}>
              There is no content batch drafted for this account on the week of {weekStart}. Create one now!
            </p>
            <button className="btn btn-primary btn-sm animate-pulse-glow" onClick={handleGenerateWeek} disabled={generating}>
              {generating ? "Generating..." : "Generate Draft Batch"}
            </button>
          </div>
        ) : (
          /* Plan Slots List */
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Control Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Showing 7 slots ({plan.slots.filter((s) => s.status === "approved").length}/7 approved)
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="btn btn-secondary btn-sm" onClick={handleApproveAll}>
                  Approve All Slots
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => handleSavePlan()} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>

            {/* Slots */}
            {plan.slots.map((slot, idx) => {
              const dayName = days[slot.dayOfWeek] || `Day ${slot.dayOfWeek + 1}`;
              const activeText = getSelectedVariantText(slot);
              
              return (
                <div
                  key={slot.id}
                  className="card animate-fade-in"
                  style={{
                    padding: "20px",
                    display: "grid",
                    gridTemplateColumns: "180px 1fr 220px",
                    gap: "20px",
                    borderColor: slot.status === "approved" ? "var(--accent-secondary)" : "var(--border-primary)",
                    animationDelay: `${idx * 0.05}s`,
                  }}
                >
                  {/* Left Column: Metadata */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderRight: "1px solid var(--border-secondary)", paddingRight: "20px" }}>
                    <div style={{ fontSize: "12px", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em" }}>
                      {dayName} ({slot.date})
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span className={`badge`} style={{ background: `${pillarColors[slot.pillar]}15`, color: pillarColors[slot.pillar] }}>
                        {slot.pillar}
                      </span>
                      <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                        🕒 {slot.scheduledTime}
                      </span>
                    </div>

                    <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        onClick={() => toggleSlotApproval(slot.id)}
                        className={`btn btn-sm ${slot.status === "approved" ? "btn-primary" : "btn-secondary"}`}
                        style={{
                          flex: 1,
                          background: slot.status === "approved" ? "var(--accent-secondary)" : "transparent",
                          color: slot.status === "approved" ? "var(--text-inverse)" : "var(--text-secondary)",
                          borderColor: slot.status === "approved" ? "var(--accent-secondary)" : "var(--border-primary)",
                          boxShadow: slot.status === "approved" ? "0 2px 8px rgba(0,212,170,0.2)" : "none",
                        }}
                      >
                        {slot.status === "approved" ? "✓ Approved" : "Approve"}
                      </button>
                    </div>
                  </div>

                  {/* Middle Column: Text Editor */}
                  <div>
                    <label className="label">Tweet Content</label>
                    <textarea
                      className="textarea"
                      value={activeText}
                      onChange={(e) => {
                        if (slot.selectedVariantId) {
                          updateSlotVariantBody(slot.id, slot.selectedVariantId, e.target.value);
                        }
                      }}
                      style={{ height: "98px", fontSize: "14px" }}
                      disabled={slot.status === "approved" || regeneratingSlotId === slot.id}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
                      <span style={{ fontSize: "11px", color: activeText.length > 280 ? "var(--accent-danger)" : "var(--text-tertiary)" }}>
                        {activeText.length} / 280 characters
                      </span>
                      {(() => {
                        const activePersona = personas.find((p) => p.id === activeAccount?.personaId);
                        const driftReport = activePersona ? analyzeVoiceDrift(activePersona, activeText) : null;
                        
                        return driftReport ? (
                          <span
                            style={{
                              fontSize: "11px",
                              color: driftReport.score >= 90 ? "var(--accent-secondary)" : driftReport.score >= 80 ? "var(--accent-warning)" : "var(--accent-danger)",
                              fontWeight: 650,
                            }}
                            title={driftReport.reasons.join(", ") || "Style rules followed"}
                          >
                            Voice Match: {driftReport.score}%
                          </span>
                        ) : null;
                      })()}
                    </div>

                    {/* Voice Drift Warnings list */}
                    {(() => {
                      const activePersona = personas.find((p) => p.id === activeAccount?.personaId);
                      const driftReport = activePersona ? analyzeVoiceDrift(activePersona, activeText) : null;
                      
                      return driftReport && driftReport.driftDetected ? (
                        <div style={{
                          fontSize: "10px",
                          color: "var(--accent-warning)",
                          marginTop: "6px",
                          padding: "6px 10px",
                          background: "var(--accent-warning-muted)",
                          borderRadius: "var(--radius-sm)",
                          lineHeight: "1.3",
                        }}>
                          <strong>Style Warning:</strong>
                          <ul style={{ margin: "2px 0 0", paddingLeft: "14px" }}>
                            {driftReport.reasons.map((r, ri) => (
                              <li key={ri}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null;
                    })()}
                  </div>

                  {/* Right Column: Variants */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingLeft: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>
                        Variants
                      </span>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: "2px 6px", fontSize: "11px" }}
                        onClick={() => handleRegenerateSlot(slot.id, slot.pillar)}
                        disabled={regeneratingSlotId === slot.id || slot.status === "approved"}
                      >
                        {regeneratingSlotId === slot.id ? "Regen..." : "Regenerate"}
                      </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, overflowY: "auto" }}>
                      {slot.variants.map((v, vIdx) => {
                        const active = v.id === slot.selectedVariantId;
                        return (
                          <button
                            key={v.id}
                            onClick={() => selectVariant(slot.id, v.id)}
                            style={{
                              padding: "8px 10px",
                              borderRadius: "var(--radius-md)",
                              background: active ? "var(--accent-primary-muted)" : "var(--bg-secondary)",
                              border: `1px solid ${active ? "var(--accent-primary)" : "var(--border-primary)"}`,
                              textAlign: "left",
                              cursor: "pointer",
                              fontSize: "12px",
                              color: active ? "var(--text-primary)" : "var(--text-secondary)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              transition: "all var(--transition-fast)",
                              width: "100%",
                            }}
                          >
                            Var {vIdx + 1}: {v.body}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Bottom Actions */}
            <div className="card" style={{ padding: "20px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button className="btn btn-secondary" onClick={() => fetchPlan()}>
                Discard Changes
              </button>
              <button className="btn btn-primary animate-pulse-glow" onClick={() => handleSavePlan()} disabled={saving}>
                {saving ? "Saving Plan..." : "Save Weekly Plan"}
              </button>
            </div>
          </div>
        )}
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
