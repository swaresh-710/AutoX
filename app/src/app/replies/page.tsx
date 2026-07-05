"use client";

import { useEffect, useState } from "react";
import { Account, ReplyDraft } from "@/types";

const colors = [
  "var(--account-1)",
  "var(--account-2)",
  "var(--account-3)",
  "var(--account-4)",
  "var(--account-5)",
  "var(--account-6)",
  "var(--account-7)",
];

export default function RepliesPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [tweetUrl, setTweetUrl] = useState<string>("");
  const [tweetText, setTweetText] = useState<string>("");
  
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  
  const [variants, setVariants] = useState<string[]>([]);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number>(0);
  const [activeText, setActiveText] = useState<string>("");
  const [draftId, setDraftId] = useState<string | null>(null);

  const [history, setHistory] = useState<ReplyDraft[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Load accounts and history
  const loadInitialData = async () => {
    try {
      // 1. Fetch accounts
      const accRes = await fetch("/api/accounts");
      const accData = await accRes.json();
      if (accData.success) {
        const mapped = accData.accounts.filter((a: Account) => !!a.personaId);
        setAccounts(mapped);
        if (mapped.length > 0) setSelectedAccountId(mapped[0].id);
      }

      // 2. Fetch history
      fetchHistory();
    } catch (err) {
      console.error("Failed to load initial replies data:", err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/replies");
      const data = await res.json();
      if (data.success) {
        setHistory(data.replies || []);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Generate replies
  const handleGenerate = async () => {
    if (!selectedAccountId || !tweetText) {
      showToast("Please fill in the target tweet text and select a replying persona.", "error");
      return;
    }

    try {
      setGenerating(true);
      setVariants([]);
      
      const res = await fetch("/api/generate/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId: selectedAccountId,
          tweetText,
        }),
      });
      const data = await res.json();

      if (data.success && data.variants.length > 0) {
        setVariants(data.variants);
        setSelectedVariantIdx(0);
        setActiveText(data.variants[0]);
        
        // Create draft id
        const newDraftId = `reply-draft-${Date.now()}`;
        setDraftId(newDraftId);

        // Save draft in backend history list
        const activeAcc = accounts.find((a) => a.id === selectedAccountId);
        const newReply: ReplyDraft = {
          id: newDraftId,
          sourceTweetUrl: tweetUrl || "https://x.com/user/status/12345",
          sourceTweetText: tweetText,
          personaId: activeAcc?.personaId || "1",
          variants: data.variants,
          selectedVariant: data.variants[0],
          status: "drafted",
          createdAt: new Date().toISOString(),
        };

        await fetch("/api/replies", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reply: newReply }),
        });

        showToast("Generated 3 reply drafts successfully!", "success");
        fetchHistory();
      } else {
        showToast(data.error || "Failed to generate reply options", "error");
      }
    } catch (err: any) {
      showToast(err.message || "An error occurred", "error");
    } finally {
      setGenerating(false);
    }
  };

  // Select variant
  const handleSelectVariant = (idx: number) => {
    setSelectedVariantIdx(idx);
    setActiveText(variants[idx] || "");
  };

  // Post reply
  const handleSend = async () => {
    if (!draftId || !activeText) return;
    try {
      setSending(true);
      const res = await fetch("/api/replies/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          replyId: draftId,
          selectedVariant: activeText,
        }),
      });
      const data = await res.json();

      if (data.success) {
        showToast("Reply published successfully!", "success");
        // Reset inputs
        setTweetUrl("");
        setTweetText("");
        setVariants([]);
        setDraftId(null);
        fetchHistory();
      } else {
        showToast(data.error || "Failed to publish reply", "error");
        fetchHistory();
      }
    } catch (err: any) {
      showToast(err.message || "An error occurred", "error");
    } finally {
      setSending(false);
    }
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

      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Reply Studio</h1>
        <p className="page-subtitle">Craft in-character replies for any tweet — paste text, pick a persona, publish</p>
      </div>

      {/* Body */}
      <div className="page-body">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start", marginBottom: "32px" }}>
          {/* Left panel: Form Input */}
          <div className="card" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "16px" }}>
              Reply Generator Inputs
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Replying Account */}
              <div>
                <label className="label">Replying Persona</label>
                <select
                  className="select"
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.handle}) — Mapped to persona-{a.personaId}.md
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Tweet URL */}
              <div>
                <label className="label">Target Tweet URL (Optional)</label>
                <input
                  className="input"
                  placeholder="https://x.com/elonmusk/status/..."
                  value={tweetUrl}
                  onChange={(e) => setTweetUrl(e.target.value)}
                />
              </div>

              {/* Target Tweet Text */}
              <div>
                <label className="label">Target Tweet Content (Paste here)</label>
                <textarea
                  className="textarea"
                  placeholder="Paste the text content of the target tweet you want to reply to..."
                  value={tweetText}
                  onChange={(e) => setTweetText(e.target.value)}
                  style={{ height: "110px" }}
                />
              </div>

              {/* Action */}
              <button
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={generating || !selectedAccountId}
                style={{ width: "100%", marginTop: "8px" }}
              >
                {generating ? "Generating in-character replies..." : "Generate Reply Options"}
              </button>
            </div>
          </div>

          {/* Right panel: Draft outputs */}
          <div className="card" style={{ padding: "24px", minHeight: "394px", display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "16px" }}>
              Draft Review Workspace
            </h3>

            {variants.length === 0 ? (
              <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-tertiary)",
                fontSize: "14px",
                textAlign: "center",
                padding: "48px 0",
              }}>
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>✍️</div>
                No reply drafts generated yet. Paste content on the left to start.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
                {/* Variants selectors */}
                <div style={{ display: "flex", gap: "10px" }}>
                  {variants.map((v, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectVariant(i)}
                      className={`btn btn-sm ${selectedVariantIdx === i ? "btn-primary" : "btn-secondary"}`}
                      style={{
                        flex: 1,
                        background: selectedVariantIdx === i ? activeAccount?.color : "transparent",
                        borderColor: selectedVariantIdx === i ? activeAccount?.color : "var(--border-primary)",
                        color: selectedVariantIdx === i ? "var(--text-inverse)" : "var(--text-secondary)",
                      }}
                    >
                      Option {i + 1}
                    </button>
                  ))}
                </div>

                {/* Main text editor */}
                <div style={{ flex: 1 }}>
                  <label className="label">Edit Active Reply</label>
                  <textarea
                    className="textarea"
                    value={activeText}
                    onChange={(e) => setActiveText(e.target.value)}
                    style={{ height: "120px", fontSize: "14px" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
                    <span style={{ fontSize: "11px", color: activeText.length > 280 ? "var(--accent-danger)" : "var(--text-tertiary)" }}>
                      {activeText.length} / 280 characters
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                      Replying as {activeAccount?.handle}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "12px", borderTop: "1px solid var(--border-secondary)", paddingTop: "16px" }}>
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setVariants([]);
                      setDraftId(null);
                    }}
                  >
                    Discard Draft
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, background: activeAccount?.color, borderColor: activeAccount?.color }}
                    onClick={handleSend}
                    disabled={sending}
                  >
                    {sending ? "Posting..." : activeAccount?.publishMethod === "manual" ? "Mark as Sent" : "Publish Reply"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* History Log */}
        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "16px" }}>
          Recent Replies History
        </h2>
        <div className="card" style={{ padding: "0", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-primary)", color: "var(--text-secondary)" }}>
                <th style={{ textAlign: "left", padding: "12px 20px", fontWeight: 600 }}>Persona</th>
                <th style={{ textAlign: "left", padding: "12px 20px", fontWeight: 600 }}>Target Tweet Context</th>
                <th style={{ textAlign: "left", padding: "12px 20px", fontWeight: 600 }}>Drafted Reply</th>
                <th style={{ textAlign: "left", padding: "12px 20px", fontWeight: 600 }}>Status</th>
                <th style={{ textAlign: "left", padding: "12px 20px", fontWeight: 600 }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "var(--text-tertiary)" }}>
                    No reply history found.
                  </td>
                </tr>
              ) : (
                history.map((item, i) => (
                  <tr key={item.id} style={{ borderBottom: i === history.length - 1 ? "none" : "1px solid var(--border-secondary)" }}>
                    <td style={{ padding: "14px 20px", fontWeight: 500, color: "var(--text-primary)" }}>
                      persona-{item.personaId}.md
                    </td>
                    <td style={{ padding: "14px 20px", color: "var(--text-secondary)", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <a href={item.sourceTweetUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent-primary)", marginRight: "6px" }}>
                        🔗 URL
                      </a>
                      {item.sourceTweetText}
                    </td>
                    <td style={{ padding: "14px 20px", color: "var(--text-secondary)", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.selectedVariant || item.variants[0]}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span className={`badge ${
                        item.status === "sent" ? "badge-success" : item.status === "failed" ? "badge-danger" : "badge-niche"
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px", color: "var(--text-tertiary)" }}>
                      {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
