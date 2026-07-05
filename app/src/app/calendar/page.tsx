"use client";

import { useEffect, useState } from "react";
import { Pillar } from "@/types";
import { CalendarEvent } from "@/app/api/calendar/route";

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const pillarColors: Record<Pillar, string> = {
  capx: "var(--pillar-capx)",
  niche: "var(--pillar-niche)",
  personal: "var(--pillar-personal)",
};

const statusColors: Record<string, string> = {
  draft: "var(--accent-warning)",
  approved: "var(--accent-secondary)",
  scheduled: "#4facfe",
  published: "#4facfe",
  failed: "var(--accent-danger)",
};

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState<string>("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Find Monday of the current week on mount
  useEffect(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    setWeekStart(monday.toISOString().split("T")[0]);
  }, []);

  const fetchEvents = async () => {
    if (!weekStart) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/calendar?weekStart=${weekStart}`);
      const data = await res.json();
      if (data.success) {
        setEvents(data.events);
      }
    } catch (err) {
      console.error("Failed to fetch calendar events:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [weekStart]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handlePrevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().split("T")[0]);
  };

  const handleNextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d.toISOString().split("T")[0]);
  };

  const handleToday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    setWeekStart(monday.toISOString().split("T")[0]);
  };

  const handleOpenEventModal = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setEditBody(event.body);
    setEditTime(event.time);
    setEditStatus(event.status);
  };

  const handleSaveEventDetails = async () => {
    if (!selectedEvent) return;
    try {
      setSaving(true);
      
      // We load the plan for this event's account and week
      const planRes = await fetch(`/api/plans?accountId=${selectedEvent.accountId}&weekStart=${weekStart}`);
      const planData = await planRes.json();
      
      if (planData.success && planData.plan) {
        const planObj = planData.plan as WeeklyPlan;
        
        // Update the specific slot's details
        const updatedSlots = planObj.slots.map((slot) => {
          if (slot.id === selectedEvent.id) {
            const updatedVariants = slot.variants.map((v) => {
              if (v.id === slot.selectedVariantId) {
                return { ...v, body: editBody };
              }
              return v;
            });
            return {
              ...slot,
              scheduledTime: editTime,
              status: editStatus as any,
              variants: updatedVariants,
            };
          }
          return slot;
        });

        const updatedPlan = { ...planObj, slots: updatedSlots };
        
        const saveRes = await fetch("/api/plans", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ plan: updatedPlan }),
        });
        const saveData = await saveRes.json();

        if (saveData.success) {
          showToast("Event updated successfully!", "success");
          setSelectedEvent(null);
          fetchEvents(); // Refresh calendar grid
        } else {
          showToast(saveData.error || "Failed to save event details", "error");
        }
      } else {
        showToast("Failed to fetch event plan context", "error");
      }
    } catch (err: any) {
      showToast(err.message || "An error occurred", "error");
    } finally {
      setSaving(false);
    }
  };

  // Group events by day of week (0 to 6)
  const eventsByDay = Array.from({ length: 7 }, (_, idx) =>
    events.filter((e) => e.dayOfWeek === idx)
  );

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

      {/* Detail Modal */}
      {selectedEvent && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="card animate-scale-in"
            style={{
              width: "100%",
              maxWidth: "540px",
              background: "var(--bg-secondary)",
              padding: "24px",
              boxShadow: "var(--shadow-lg)",
              cursor: "default",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
              <div>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "var(--radius-full)",
                    background: `${selectedEvent.accountColor}20`,
                    color: selectedEvent.accountColor,
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  {selectedEvent.accountHandle}
                </span>
                <span
                  className="badge"
                  style={{
                    background: `${pillarColors[selectedEvent.pillar]}15`,
                    color: pillarColors[selectedEvent.pillar],
                    marginLeft: "8px",
                    fontSize: "11px",
                    textTransform: "uppercase",
                  }}
                >
                  {selectedEvent.pillar}
                </span>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSelectedEvent(null)}
                style={{ padding: "4px" }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label className="label">Scheduled Tweet Text</label>
                <textarea
                  className="textarea"
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  style={{ height: "120px", fontSize: "14px" }}
                  disabled={editStatus === "published"}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label className="label">Posting Time</label>
                  <input
                    type="time"
                    className="input"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    disabled={editStatus === "published"}
                  />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select
                    className="select"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    disabled={editStatus === "published"}
                  >
                    <option value="draft">Draft</option>
                    <option value="approved">Approved</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="published" disabled>Published</option>
                  </select>
                </div>
              </div>

              <div style={{
                marginTop: "12px",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                borderTop: "1px solid var(--border-secondary)",
                paddingTop: "16px",
              }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedEvent(null)}>
                  Close
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSaveEventDetails}
                  disabled={saving || editStatus === "published"}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-subtitle">Schedule and view posts across all 7 accounts in a consolidated weekly grid</p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button className="btn btn-secondary btn-sm" onClick={handlePrevWeek}>
            ← Prev Week
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleToday}>
            This Week
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleNextWeek}>
            Next Week →
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
            marginLeft: "8px",
          }}>
            Week of {weekStart}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="page-body">
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "10px", minHeight: "500px" }}>
            {daysOfWeek.map((day) => (
              <div key={day} className="card skeleton" style={{ minHeight: "100%" }} />
            ))}
          </div>
        ) : (
          /* Consolidated Calendar Grid */
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: "10px",
            minHeight: "500px",
            alignItems: "stretch",
          }}>
            {daysOfWeek.map((day, dayIdx) => {
              const dayEvents = eventsByDay[dayIdx] || [];
              
              return (
                <div
                  key={day}
                  className="animate-fade-in"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-primary)",
                    borderRadius: "var(--radius-lg)",
                    padding: "16px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    animationDelay: `${dayIdx * 0.05}s`,
                    minHeight: "100%",
                  }}
                >
                  {/* Day Header */}
                  <div style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    borderBottom: "1px solid var(--border-secondary)",
                    paddingBottom: "8px",
                    marginBottom: "4px",
                  }}>
                    {day.substring(0, 3)}
                  </div>

                  {/* Day Events Feed */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                    {dayEvents.length === 0 ? (
                      <div style={{
                        fontSize: "11px",
                        color: "var(--text-tertiary)",
                        textAlign: "center",
                        padding: "24px 0",
                        fontStyle: "italic",
                      }}>
                        No posts scheduled
                      </div>
                    ) : (
                      dayEvents.map((evt) => (
                        <div
                          key={evt.id}
                          onClick={() => handleOpenEventModal(evt)}
                          style={{
                            padding: "8px 10px",
                            background: "var(--bg-card)",
                            border: `1px solid ${evt.status === "approved" ? "rgba(0, 212, 170, 0.2)" : "var(--border-secondary)"}`,
                            borderRadius: "var(--radius-md)",
                            cursor: "pointer",
                            transition: "all var(--transition-fast)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = evt.accountColor;
                            e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = evt.status === "approved" ? "rgba(0, 212, 170, 0.2)" : "var(--border-secondary)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          {/* Event Header */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                color: evt.accountColor,
                                background: `${evt.accountColor}12`,
                                padding: "1px 6px",
                                borderRadius: "4px",
                                textOverflow: "ellipsis",
                                overflow: "hidden",
                                whiteSpace: "nowrap",
                                maxWidth: "76px",
                              }}
                            >
                              {evt.accountHandle}
                            </span>
                            <span style={{ fontSize: "10px", color: "var(--text-tertiary)", fontWeight: 500 }}>
                              {evt.time}
                            </span>
                          </div>

                          {/* Event Tweet Preview */}
                          <p style={{
                            fontSize: "11px",
                            color: "var(--text-secondary)",
                            lineHeight: "1.4",
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            textOverflow: "ellipsis",
                            margin: 0,
                          }}>
                            {evt.body || "Empty body"}
                          </p>

                          {/* Event Footer Status */}
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            borderTop: "1px solid var(--border-secondary)",
                            paddingTop: "4px",
                            marginTop: "2px",
                          }}>
                            <span
                              style={{
                                fontSize: "9px",
                                color: pillarColors[evt.pillar],
                                textTransform: "uppercase",
                                fontWeight: 600,
                                letterSpacing: "0.04em",
                              }}
                            >
                              {evt.pillar}
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <div
                                style={{
                                  width: "5px",
                                  height: "5px",
                                  borderRadius: "50%",
                                  background: statusColors[evt.status] || "var(--text-tertiary)",
                                }}
                              />
                              <span style={{ fontSize: "9px", color: "var(--text-tertiary)", textTransform: "capitalize" }}>
                                {evt.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}
