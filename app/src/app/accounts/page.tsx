"use client";

import { useEffect, useState } from "react";
import { Account, ContentMix } from "@/types";

const colors = [
  "var(--account-1)",
  "var(--account-2)",
  "var(--account-3)",
  "var(--account-4)",
  "var(--account-5)",
  "var(--account-6)",
  "var(--account-7)",
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (data.success) {
        setAccounts(data.accounts);
      } else {
        setError(data.error || "Failed to load accounts");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSelectAccount = (account: Account) => {
    setSelectedAccount(account);
  };

  const handleVerify = async () => {
    try {
      setVerifying(true);
      const res = await fetch("/api/accounts/verify", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showToast(`${data.connected}/${data.total} accounts connected to the X API`, data.connected > 0 ? "success" : "error");
        await fetchAccounts();
      } else {
        showToast(data.error || "Verification failed", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Verification failed", "error");
    } finally {
      setVerifying(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedAccount) return;
    try {
      setSaving(true);

      // Configured flags are derived server-side from env vars — send as-is.
      const updatedAccount: Account = { ...selectedAccount };

      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ account: updatedAccount }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Account configuration saved successfully!", "success");
        setAccounts(
          accounts.map((a) => (a.id === selectedAccount.id ? updatedAccount : a))
        );
        setSelectedAccount(updatedAccount);
      } else {
        showToast(data.error || "Failed to save account config", "error");
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

  const handleMixChange = (field: keyof ContentMix, value: number) => {
    if (!selectedAccount) return;
    const currentMix = selectedAccount.contentMix;
    const diff = value - currentMix[field];
    
    // Distribute diff between other fields to maintain 100% total
    const otherFields = (["capx", "niche", "personal"] as Array<keyof ContentMix>).filter(
      (f) => f !== field
    );
    
    const newMix = { ...currentMix };
    newMix[field] = value;

    // Adjust other fields proportionally
    const otherSum = currentMix[otherFields[0]] + currentMix[otherFields[1]];
    if (otherSum > 0) {
      const prop1 = currentMix[otherFields[0]] / otherSum;
      const prop2 = currentMix[otherFields[1]] / otherSum;
      
      newMix[otherFields[0]] = Math.max(0, Math.round(currentMix[otherFields[0]] - diff * prop1));
      newMix[otherFields[1]] = Math.max(0, Math.round(currentMix[otherFields[1]] - diff * prop2));
    } else {
      // If others are 0, distribute evenly
      const halfDiff = Math.round(diff / 2);
      newMix[otherFields[0]] = Math.max(0, -halfDiff);
      newMix[otherFields[1]] = Math.max(0, -(diff - halfDiff));
    }

    // Force sum to 100
    const sum = newMix.capx + newMix.niche + newMix.personal;
    if (sum !== 100) {
      newMix[otherFields[0]] += (100 - sum);
    }

    setSelectedAccount({
      ...selectedAccount,
      contentMix: newMix,
    });
  };

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
      <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title">
            {selectedAccount ? `Configure: ${selectedAccount.name}` : "Accounts"}
          </h1>
          <p className="page-subtitle">
            {selectedAccount
              ? `Manage credentials, publishing method, and content mix ratios for ${selectedAccount.handle}`
              : "Manage X/Twitter accounts, API keys, and publishing configuration"}
          </p>
        </div>
        <div>
          {selectedAccount ? (
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedAccount(null)}
              >
                Back to Accounts
              </button>
              <button
                className="btn btn-primary btn-sm animate-pulse-glow"
                onClick={handleSaveConfig}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Config"}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="btn btn-secondary btn-sm" onClick={fetchAccounts}>
                Refresh Accounts
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleVerify} disabled={verifying}>
                {verifying ? "Verifying..." : "Verify Connections"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="page-body">
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <div key={n} className="card skeleton" style={{ height: "80px" }} />
            ))}
          </div>
        ) : error ? (
          <div className="card" style={{ padding: "32px", textAlign: "center", borderColor: "var(--accent-danger)" }}>
            <h3 style={{ color: "var(--accent-danger)", marginBottom: "8px" }}>Error Loading Accounts</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>{error}</p>
          </div>
        ) : !selectedAccount ? (
          /* List of accounts */
          <div style={{ maxWidth: "800px" }}>
            {/* Info */}
            <div style={{
              padding: "16px 20px",
              background: "var(--accent-secondary-muted)",
              border: "1px solid rgba(0, 212, 170, 0.2)",
              borderRadius: "var(--radius-lg)",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>
                Each account uses its own X API credentials or Typefully scheduling integrations. Configure them by clicking on an account below.
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {accounts.map((account, i) => {
                const color = colors[i % colors.length];
                return (
                  <div
                    key={account.id}
                    className="card animate-fade-in"
                    style={{
                      padding: "0",
                      overflow: "hidden",
                      animationDelay: `${i * 0.05}s`,
                      cursor: "pointer",
                    }}
                    onClick={() => handleSelectAccount(account)}
                  >
                    <div style={{ height: "3px", background: color }} />
                    <div style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
                      {/* Avatar */}
                      <div style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "var(--radius-lg)",
                        background: `${color}20`,
                        border: `2px solid ${color}40`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        fontWeight: 700,
                        color: color,
                        flexShrink: 0,
                      }}>
                        {account.id}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
                          {account.name}
                        </div>
                        <div style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
                          {account.handle}
                        </div>
                      </div>

                      {/* Ratios summary */}
                      <div style={{ display: "flex", gap: "16px", marginRight: "24px" }}>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                          Ratio: <span style={{ color: "var(--pillar-capx)" }}>{account.contentMix.capx}</span>/
                          <span style={{ color: "var(--pillar-niche)" }}>{account.contentMix.niche}</span>/
                          <span style={{ color: "var(--pillar-personal)" }}>{account.contentMix.personal}</span>
                        </div>
                        <div style={{ width: "80px", height: "6px", borderRadius: "3px", overflow: "hidden", display: "flex", alignSelf: "center" }}>
                          <div style={{ width: `${account.contentMix.capx}%`, background: "var(--pillar-capx)", height: "100%" }} />
                          <div style={{ width: `${account.contentMix.niche}%`, background: "var(--pillar-niche)", height: "100%" }} />
                          <div style={{ width: `${account.contentMix.personal}%`, background: "var(--pillar-personal)", height: "100%" }} />
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "4px 10px",
                          borderRadius: "var(--radius-full)",
                          background: account.status === "connected"
                            ? "var(--accent-secondary-muted)"
                            : account.status === "error"
                            ? "rgba(255, 90, 90, 0.15)"
                            : "var(--bg-tertiary)",
                          fontSize: "11px",
                          fontWeight: 500,
                          color: account.status === "connected"
                            ? "var(--accent-secondary)"
                            : account.status === "error"
                            ? "var(--accent-danger)"
                            : "var(--text-tertiary)",
                        }}>
                          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "currentColor" }} />
                          {account.status === "connected" ? "Connected" : account.status === "error" ? "Auth Error" : "Not Verified"}
                        </div>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "4px 10px",
                          borderRadius: "var(--radius-full)",
                          background: account.publishMethod === "manual"
                            ? "var(--bg-tertiary)"
                            : account.publishMethod === "x-api"
                            ? "var(--accent-secondary-muted)"
                            : "rgba(79, 172, 254, 0.15)",
                          fontSize: "11px",
                          fontWeight: 500,
                          color: account.publishMethod === "manual"
                            ? "var(--text-secondary)"
                            : account.publishMethod === "x-api"
                            ? "var(--accent-secondary)"
                            : "#4facfe",
                        }}>
                          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "currentColor" }} />
                          {account.publishMethod === "manual" ? "Manual Post" : account.publishMethod === "x-api" ? "Direct X API" : "Typefully"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Editor Mode */
          <div style={{ maxWidth: "680px", display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* General Configuration */}
            <div className="card animate-fade-in" style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "16px" }}>
                General Settings
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label className="label">Account Display Name</label>
                  <input
                    className="input"
                    value={selectedAccount.name}
                    onChange={(e) => setSelectedAccount({ ...selectedAccount, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Twitter Handle</label>
                  <input
                    className="input"
                    value={selectedAccount.handle}
                    onChange={(e) => setSelectedAccount({ ...selectedAccount, handle: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">Mapped Persona File ID</label>
                <select
                  className="select"
                  value={selectedAccount.personaId || ""}
                  onChange={(e) => setSelectedAccount({ ...selectedAccount, personaId: e.target.value || null })}
                >
                  <option value="">None / Unmapped</option>
                  {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                    <option key={num} value={`${num}`}>
                      persona-{num}.md
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Content Mix Ratios */}
            <div className="card animate-fade-in" style={{ padding: "24px", animationDelay: "0.05s" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                Content Mix Ratio (Sum must equal 100%)
              </h3>
              <p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "20px" }}>
                Enforced dynamically at the weekly batch planning level. Slider changes auto-adjust other values.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Capx */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--pillar-capx)" }}>
                      Capx Awareness
                    </span>
                    <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                      {selectedAccount.contentMix.capx}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedAccount.contentMix.capx}
                    onChange={(e) => handleMixChange("capx", parseInt(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--pillar-capx)" }}
                  />
                </div>

                {/* Niche */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--pillar-niche)" }}>
                      Niche Domain (Interests)
                    </span>
                    <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                      {selectedAccount.contentMix.niche}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedAccount.contentMix.niche}
                    onChange={(e) => handleMixChange("niche", parseInt(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--pillar-niche)" }}
                  />
                </div>

                {/* Personal */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--pillar-personal)" }}>
                      Personal / Life continuity
                    </span>
                    <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                      {selectedAccount.contentMix.personal}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedAccount.contentMix.personal}
                    onChange={(e) => handleMixChange("personal", parseInt(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--pillar-personal)" }}
                  />
                </div>
              </div>
            </div>

            {/* Publishing Settings */}
            <div className="card animate-fade-in" style={{ padding: "24px", animationDelay: "0.1s" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "16px" }}>
                Publishing Method
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                {[
                  { id: "manual", label: "Manual Copy/Paste", desc: "No API keys needed. Review, copy, and post manually" },
                  { id: "x-api", label: "Direct X API v2", desc: "Publish directly using per-account X developer credentials" },
                  { id: "typefully", label: "Typefully Scheduling Integration", desc: "Sync drafts to Typefully schedule via Typefully API keys" },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedAccount({ ...selectedAccount, publishMethod: method.id as any })}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 16px",
                      background: selectedAccount.publishMethod === method.id ? "var(--accent-primary-muted)" : "var(--bg-secondary)",
                      border: `1px solid ${selectedAccount.publishMethod === method.id ? "var(--accent-primary)" : "var(--border-primary)"}`,
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                      transition: "all var(--transition-fast)",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: selectedAccount.publishMethod === method.id ? "var(--accent-primary)" : "var(--text-primary)" }}>
                        {method.label}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                        {method.desc}
                      </div>
                    </div>
                    <div style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      border: `2px solid ${selectedAccount.publishMethod === method.id ? "var(--accent-primary)" : "var(--border-primary)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {selectedAccount.publishMethod === method.id && (
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--accent-primary)" }} />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Publish credentials panels */}
              {selectedAccount.publishMethod === "x-api" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid var(--border-secondary)", paddingTop: "20px" }}>
                  <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
                    X API Credentials
                  </h4>
                  <div style={{
                    padding: "12px 14px",
                    background: selectedAccount.apiKeyConfigured ? "var(--accent-secondary-muted)" : "var(--bg-tertiary)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                  }}>
                    {selectedAccount.apiKeyConfigured ? (
                      <>✓ Credentials found in server environment. Use <strong>Verify Connections</strong> on the accounts list to test them against the X API.</>
                    ) : (
                      <>Credentials are read from server environment variables — set these in <code style={{ color: "var(--accent-primary)" }}>.env.local</code> (dev) or your hosting provider&apos;s env settings (prod), then redeploy:</>
                    )}
                    <pre style={{ margin: "8px 0 0", fontSize: "11px", color: "var(--text-tertiary)", whiteSpace: "pre-wrap" }}>
{`X_ACCOUNT_${selectedAccount.id}_API_KEY
X_ACCOUNT_${selectedAccount.id}_API_SECRET
X_ACCOUNT_${selectedAccount.id}_ACCESS_TOKEN
X_ACCOUNT_${selectedAccount.id}_ACCESS_TOKEN_SECRET`}
                    </pre>
                  </div>
                </div>
              )}

              {selectedAccount.publishMethod === "typefully" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid var(--border-secondary)", paddingTop: "20px" }}>
                  <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
                    Typefully API Integration
                  </h4>
                  <div style={{
                    padding: "12px 14px",
                    background: selectedAccount.typefullyConfigured ? "var(--accent-secondary-muted)" : "var(--bg-tertiary)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                  }}>
                    {selectedAccount.typefullyConfigured ? (
                      <>✓ Typefully API key found in server environment.</>
                    ) : (
                      <>Set <code style={{ color: "var(--accent-primary)" }}>TYPEFULLY_ACCOUNT_{selectedAccount.id}_API_KEY</code> in <code style={{ color: "var(--accent-primary)" }}>.env.local</code> (dev) or your hosting provider&apos;s env settings (prod), then redeploy.</>
                    )}
                  </div>
                </div>
              )}
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
