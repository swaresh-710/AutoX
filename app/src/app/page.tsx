"use client";

import { useEffect, useState } from "react";
import { Account, WeeklyPlan, Pillar, ContentSlot } from "@/types";

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

interface AccountWithStats extends Account {
  tweetsThisWeek: number;
  pendingReview: number;
}

export default function DashboardPage() {
  const [weekStart, setWeekStart] = useState<string>("");
  const [accounts, setAccounts] = useState<AccountWithStats[]>([]);
  const [stats, setStats] = useState({
    totalTweets: 0,
    pendingReview: 0,
    publishedThisWeek: 0,
    scheduledToday: 0,
    engagementRate: 4.2, // mock baseline
    clickThroughs: 156, // mock baseline
  });
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [runningCron, setRunningCron] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [recentActivity, setRecentActivity] = useState<Array<{ id: string; action: string; account: string; pillar: Pillar; time: string }>>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  // Find Monday of the current week on mount
  useEffect(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    setWeekStart(monday.toISOString().split("T")[0]);
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    if (!weekStart) return;
    try {
      setLoading(true);
      // Fetch alerts
      const alertsRes = await fetch("/api/alerts");
      const alertsData = await alertsRes.json();
      if (alertsData.success) {
        setAlerts(alertsData.alerts || []);
      }

      // 1. Fetch all accounts
      const accountsRes = await fetch("/api/accounts");
      const accountsData = await accountsRes.json();
      if (!accountsData.success) throw new Error(accountsData.error);

      const rawAccounts: Account[] = accountsData.accounts;

      let totalDrafts = 0;
      let totalPending = 0;
      let totalPublished = 0;
      let totalScheduledToday = 0;
      const todayStr = new Date().toISOString().split("T")[0];

      const accountsWithStats: AccountWithStats[] = await Promise.all(
        rawAccounts.map(async (account) => {
          // Fetch plan for each account for this week
          const planRes = await fetch(`/api/plans?accountId=${account.id}&weekStart=${weekStart}`);
          const planData = await planRes.json();
          
          let tweetsThisWeek = 0;
          let pendingReview = 0;

          if (planData.success && planData.plan) {
            const plan: WeeklyPlan = planData.plan;
            tweetsThisWeek = plan.slots.length;
            
            plan.slots.forEach((slot) => {
              if (slot.status === "draft") {
                totalDrafts++;
                pendingReview++;
                totalPending++;
              } else if (slot.status === "published") {
                totalPublished++;
              } else if (slot.status === "approved" || slot.status === "scheduled") {
                if (slot.date === todayStr) {
                  totalScheduledToday++;
                }
              }
            });
          }

          return {
            ...account,
            tweetsThisWeek,
            pendingReview,
          };
        })
      );

      setAccounts(accountsWithStats);
      setStats({
        totalTweets: totalDrafts + totalPublished + totalScheduledToday,
        pendingReview: totalPending,
        publishedThisWeek: totalPublished,
        scheduledToday: totalScheduledToday,
        engagementRate: 4.2,
        clickThroughs: 156,
      });

      // Construct Mock/Real recent activities based on plans data
      const activities: typeof recentActivity = [];
      let actId = 1;
      accountsWithStats.forEach((act) => {
        if (act.tweetsThisWeek > 0) {
          activities.push({
            id: `${actId++}`,
            action: "Week generated",
            account: act.handle,
            pillar: "capx",
            time: "Today",
          });
          if (act.pendingReview > 0) {
            activities.push({
              id: `${actId++}`,
              action: "Drafts awaiting review",
              account: act.handle,
              pillar: "niche",
              time: "Today",
            });
          }
        }
      });

      if (activities.length === 0) {
        activities.push({
          id: "1",
          action: "System Initialized",
          account: "@all",
          pillar: "capx",
          time: "Just now",
        });
      }

      setRecentActivity(activities.slice(0, 5));
    } catch (err: any) {
      console.error("Failed to load dashboard data:", err);
      showToast(err.message || "Failed to load dashboard data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [weekStart]);

  const handleGenerateAll = async () => {
    if (accounts.length === 0 || !weekStart) return;
    try {
      setGenerating(true);
      let successCount = 0;
      
      for (const account of accounts) {
        const res = await fetch("/api/generate/week", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountId: account.id,
            weekStart,
          }),
        });
        const data = await res.json();
        if (data.success) {
          successCount++;
        }
      }

      showToast(`Successfully generated content batches for ${successCount}/7 accounts!`, "success");
      loadData(); // Refresh UI stats
    } catch (err: any) {
      showToast(err.message || "Failed to generate week batches", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleRunCron = async () => {
    try {
      setRunningCron(true);
      const res = await fetch("/api/publish/cron", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        const count = data.processedCount || 0;
        if (count > 0) {
          showToast(`Cron ran successfully! Published ${data.published.length} tweets. Failed: ${data.failed.length}`, "success");
        } else {
          showToast("Cron executed successfully. No scheduled posts were due.", "success");
        }
        loadData(); // Refresh UI stats
      } else {
        showToast(data.error || "Failed to run cron task", "error");
      }
    } catch (err: any) {
      showToast(err.message || "An error occurred during cron task", "error");
    } finally {
      setRunningCron(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Loading dynamic stats...</p>
        </div>
        <div className="page-body">
          <div className="card skeleton" style={{ height: "400px" }} />
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

      {/* Header */}
      <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Manage your 7-account AI persona network</p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleRunCron}
            disabled={runningCron}
          >
            {runningCron ? "Publishing due..." : "Run Cron Service"}
          </button>
          
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            background: "var(--bg-tertiary)",
            borderRadius: "var(--radius-md)",
            fontSize: "13px",
            color: "var(--text-secondary)",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Week of {weekStart}
          </div>
          
          <button
            className="btn btn-primary"
            onClick={handleGenerateAll}
            disabled={generating}
          >
            {generating ? "Generating all..." : "Generate All Weeks"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="page-body">
        {/* Alerts banner if any are active */}
        {alerts.length > 0 && (
          <div
            className="animate-fade-in"
            style={{
              padding: "16px 20px",
              background: "rgba(255, 75, 75, 0.12)",
              border: "1px solid rgba(255, 75, 75, 0.3)",
              borderRadius: "var(--radius-lg)",
              marginBottom: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--accent-danger)", fontWeight: 600, fontSize: "14px" }}>
                <span>⚠️</span>
                System Alert Log — Publishing Failures ({alerts.length})
              </div>
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: "12px", color: "var(--text-secondary)", padding: "2px 8px" }}
                onClick={async () => {
                  await fetch("/api/alerts/clear", { method: "POST" });
                  setAlerts([]);
                  showToast("Alerts log cleared", "success");
                }}
              >
                Clear Log
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {alerts.slice(0, 3).map((alert) => (
                <div key={alert.id} style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  <strong style={{ color: alert.severity === "error" ? "var(--accent-danger)" : "var(--accent-warning)" }}>
                    [{alert.accountHandle}]
                  </strong>{" "}
                  {alert.message} — <span style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
              {alerts.length > 3 && (
                <div style={{ fontSize: "11px", color: "var(--text-tertiary)", italic: "true" } as any}>
                  + {alerts.length - 3} more errors logged. Clear log or check X API credentials.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}>
          <div className="stat-card animate-fade-in">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-md)",
                background: "var(--accent-primary-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
            </div>
            <div className="stat-value">{stats.totalTweets}</div>
            <div className="stat-label">Total Drafts</div>
          </div>

          <div className="stat-card animate-fade-in" style={{ animationDelay: "0.05s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-md)",
                background: "var(--accent-warning-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
            </div>
            <div className="stat-value">{stats.pendingReview}</div>
            <div className="stat-label">Pending Review</div>
          </div>

          <div className="stat-card animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-md)",
                background: "var(--accent-secondary-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
            <div className="stat-value">{stats.publishedThisWeek}</div>
            <div className="stat-label">Published This Week</div>
          </div>

          <div className="stat-card animate-fade-in" style={{ animationDelay: "0.15s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-md)",
                background: "rgba(79, 172, 254, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4facfe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
            </div>
            <div className="stat-value">{stats.scheduledToday}</div>
            <div className="stat-label">Scheduled Today</div>
          </div>

          <div className="stat-card animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-md)",
                background: "rgba(240, 147, 251, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f093fb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
            </div>
            <div className="stat-value">{stats.engagementRate}%</div>
            <div className="stat-label">Engagement Rate</div>
            <div className="stat-change positive">↑ 0.8% from last week</div>
          </div>

          <div className="stat-card animate-fade-in" style={{ animationDelay: "0.25s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-md)",
                background: "var(--accent-secondary-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </div>
            </div>
            <div className="stat-value">{stats.clickThroughs}</div>
            <div className="stat-label">Capx Click-Throughs</div>
            <div className="stat-change positive">↑ 23 from last week</div>
          </div>
        </div>

        {/* Two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "24px" }}>
          {/* Accounts Grid */}
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "16px" }}>
              Account Overview
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {accounts.map((account, i) => {
                const color = colors[i % colors.length];
                return (
                  <div
                    key={account.id}
                    className="card animate-fade-in"
                    style={{
                      padding: "16px 20px",
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      animationDelay: `${i * 0.05}s`,
                    }}
                  >
                    {/* Account color dot */}
                    <div style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "var(--radius-md)",
                      background: `${color}20`,
                      border: `2px solid ${color}40`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: 700,
                      color: color,
                      flexShrink: 0,
                    }}>
                      {account.id}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                          {account.name}
                        </span>
                        <span style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
                          {account.handle}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "16px", marginTop: "4px" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                          {account.tweetsThisWeek}/7 scheduled
                        </span>
                        {account.pendingReview > 0 && (
                          <span style={{ fontSize: "12px", color: "var(--accent-warning)" }}>
                            {account.pendingReview} drafts
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div className="status-dot status-online" />
                      <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                        {account.publishMethod === "manual" ? "manual" : "ready"}
                      </span>
                    </div>

                    {/* Content Mix Bar */}
                    <div style={{ width: "80px", height: "6px", borderRadius: "3px", overflow: "hidden", display: "flex", flexShrink: 0 }}>
                      <div style={{ width: `${account.contentMix.capx}%`, background: pillarColors.capx, height: "100%" }} />
                      <div style={{ width: `${account.contentMix.niche}%`, background: pillarColors.niche, height: "100%" }} />
                      <div style={{ width: `${account.contentMix.personal}%`, background: pillarColors.personal, height: "100%" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column — Activity + Quick Actions */}
          <div>
            {/* Quick Actions */}
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "16px" }}>
              Quick Actions
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "28px" }}>
              <button
                className="btn btn-secondary"
                style={{ justifyContent: "flex-start", width: "100%" }}
                onClick={handleGenerateAll}
                disabled={generating}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                {generating ? "Generating..." : "Generate All Batches"}
              </button>
              
              <button
                className="btn btn-secondary"
                style={{ justifyContent: "flex-start", width: "100%" }}
                onClick={handleRunCron}
                disabled={runningCron}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {runningCron ? "Executing cron..." : "Trigger Publishing Cron"}
              </button>

              <a href="/content" className="btn btn-secondary" style={{ justifyContent: "flex-start", width: "100%" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Open Review Studio
              </a>

              <a href="/personas" className="btn btn-secondary" style={{ justifyContent: "flex-start", width: "100%" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f093fb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
                Edit Persona DNA Files
              </a>
            </div>

            {/* Recent Activity */}
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "16px" }}>
              Recent Activity
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {recentActivity.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "12px 16px",
                    borderRadius: "var(--radius-md)",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <span
                    className={`badge ${item.pillar === "capx" ? "badge-capx" : item.pillar === "niche" ? "badge-niche" : "badge-personal"}`}
                    style={{ fontSize: "11px", textTransform: "uppercase" }}
                  >
                    {item.pillar}
                  </span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>
                      {item.action}
                    </span>
                    <span style={{ fontSize: "13px", color: "var(--text-tertiary)", marginLeft: "6px" }}>
                      {item.account}
                    </span>
                  </div>
                  <span style={{ fontSize: "12px", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                    {item.time}
                  </span>
                </div>
              ))}
            </div>

            {/* Content Mix Legend */}
            <div style={{
              marginTop: "28px",
              padding: "16px",
              background: "var(--bg-card)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-primary)",
            }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "12px" }}>
                Content Mix (Default)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { label: "Capx", pct: 55, color: pillarColors.capx },
                  { label: "Niche", pct: 30, color: pillarColors.niche },
                  { label: "Personal", pct: 15, color: pillarColors.personal },
                ].map((p) => (
                  <div key={p.label} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                    <span style={{ fontSize: "13px", color: "var(--text-secondary)", width: "60px" }}>{p.label}</span>
                    <div style={{ flex: 1, height: "4px", background: "var(--bg-tertiary)", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{ width: `${p.pct}%`, height: "100%", background: p.color, borderRadius: "2px" }} />
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--text-tertiary)", width: "30px", textAlign: "right" }}>{p.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
