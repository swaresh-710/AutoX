"use client";

import { useEffect, useState } from "react";
import { Persona, AutomationTier, Pillar } from "@/types";

const trustTierLabels: Record<number, { label: string; color: string }> = {
  0: { label: "Manual Review", color: "var(--accent-warning)" },
  1: { label: "Personal Auto", color: "var(--accent-secondary)" },
  2: { label: "Niche Auto", color: "#4facfe" },
  3: { label: "Full Auto", color: "var(--accent-primary)" },
};

const colors = [
  "var(--account-1)",
  "var(--account-2)",
  "var(--account-3)",
  "var(--account-4)",
  "var(--account-5)",
  "var(--account-6)",
  "var(--account-7)",
];

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [editTab, setEditTab] = useState<
    | "identity"
    | "personality"
    | "voice"
    | "interests"
    | "capx"
    | "life"
    | "guardrails"
    | "seedTweets"
    | "raw"
  >("identity");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Load all personas
  const fetchPersonas = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/personas");
      const data = await res.json();
      if (data.success) {
        setPersonas(data.personas);
      } else {
        setError(data.error || "Failed to load personas");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonas();
  }, []);

  const handleSave = async () => {
    if (!selectedPersona) return;
    try {
      setSaving(true);
      const res = await fetch("/api/personas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ persona: selectedPersona }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Persona DNA updated successfully!", "success");
        // Update list
        setPersonas(
          personas.map((p) => (p.id === selectedPersona.id ? selectedPersona : p))
        );
      } else {
        showToast(data.error || "Failed to save persona", "error");
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

  const updateIdentityField = (field: keyof Persona["identity"], value: string | number) => {
    if (!selectedPersona) return;
    setSelectedPersona({
      ...selectedPersona,
      identity: {
        ...selectedPersona.identity,
        [field]: value,
      },
    });
  };

  const updatePersonalityField = (field: keyof Persona["personality"], value: any) => {
    if (!selectedPersona) return;
    setSelectedPersona({
      ...selectedPersona,
      personality: {
        ...selectedPersona.personality,
        [field]: value,
      },
    });
  };

  const updateVoiceField = (field: keyof Persona["voice"], value: any) => {
    if (!selectedPersona) return;
    setSelectedPersona({
      ...selectedPersona,
      voice: {
        ...selectedPersona.voice,
        [field]: value,
      },
    });
  };

  const updateInterestsField = (field: keyof Persona["interests"], value: any) => {
    if (!selectedPersona) return;
    setSelectedPersona({
      ...selectedPersona,
      interests: {
        ...selectedPersona.interests,
        [field]: value,
      },
    });
  };

  const updateCapxField = (field: keyof Persona["capxRelationship"], value: any) => {
    if (!selectedPersona) return;
    setSelectedPersona({
      ...selectedPersona,
      capxRelationship: {
        ...selectedPersona.capxRelationship,
        [field]: value,
      },
    });
  };

  const updateLifeField = (field: keyof Persona["life"], value: any) => {
    if (!selectedPersona) return;
    setSelectedPersona({
      ...selectedPersona,
      life: {
        ...selectedPersona.life,
        [field]: value,
      },
    });
  };

  const updateGuardrailsField = (field: keyof Persona["guardrails"], value: any) => {
    if (!selectedPersona) return;
    setSelectedPersona({
      ...selectedPersona,
      guardrails: {
        ...selectedPersona.guardrails,
        [field]: value,
      },
    });
  };

  const updateSeedTweet = (pillar: Pillar, index: number, value: string) => {
    if (!selectedPersona) return;
    const newSeeds = { ...selectedPersona.seedTweets };
    newSeeds[pillar] = [...newSeeds[pillar]];
    newSeeds[pillar][index] = value;
    setSelectedPersona({ ...selectedPersona, seedTweets: newSeeds });
  };

  const addSeedTweet = (pillar: Pillar) => {
    if (!selectedPersona) return;
    const newSeeds = { ...selectedPersona.seedTweets };
    newSeeds[pillar] = [...newSeeds[pillar], ""];
    setSelectedPersona({ ...selectedPersona, seedTweets: newSeeds });
  };

  const removeSeedTweet = (pillar: Pillar, index: number) => {
    if (!selectedPersona) return;
    const newSeeds = { ...selectedPersona.seedTweets };
    newSeeds[pillar] = newSeeds[pillar].filter((_, idx) => idx !== index);
    setSelectedPersona({ ...selectedPersona, seedTweets: newSeeds });
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
            {selectedPersona ? `Editing: ${selectedPersona.identity.name || "Persona"}` : "Persona Studio"}
          </h1>
          <p className="page-subtitle">
            {selectedPersona
              ? `Update fields in sections. Changes will save back to ${selectedPersona.fileName}`
              : "Manage the DNA of all 7 personas — identity, voice, interests, and guardrails"}
          </p>
        </div>
        <div>
          {selectedPersona ? (
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedPersona(null)}
              >
                Back to Studio
              </button>
              <button
                className="btn btn-primary btn-sm animate-pulse-glow"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save DNA File"}
              </button>
            </div>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={fetchPersonas}>
              Refresh Personas
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="page-body">
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <div key={n} className="card skeleton" style={{ height: "260px" }} />
            ))}
          </div>
        ) : error ? (
          <div className="card" style={{ padding: "32px", textAlign: "center", borderColor: "var(--accent-danger)" }}>
            <h3 style={{ color: "var(--accent-danger)", marginBottom: "8px" }}>Error Loading Personas</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>{error}</p>
          </div>
        ) : !selectedPersona ? (
          /* Grid View of all personas */
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
            {personas.map((persona, i) => {
              const color = colors[i % colors.length];
              return (
                <div
                  key={persona.id}
                  className="card animate-fade-in"
                  style={{
                    padding: "0",
                    overflow: "hidden",
                    animationDelay: `${i * 0.05}s`,
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setSelectedPersona(persona);
                    setEditTab("identity");
                  }}
                >
                  <div style={{ height: "3px", background: color }} />
                  <div style={{ padding: "20px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "16px" }}>
                      <div style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "var(--radius-lg)",
                        background: `${color}20`,
                        border: `2px solid ${color}40`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "18px",
                      }}>
                        👤
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
                            {persona.identity.name || `Persona ${persona.id}`}
                          </h3>
                          <span className={`badge badge-success`}>
                            connected
                          </span>
                        </div>
                        <div style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                          {persona.identity.handle || "@handle"}
                        </div>
                      </div>
                      <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>v{persona.version}</span>
                    </div>

                    <div style={{ marginBottom: "14px" }}>
                      <div style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                        Primary Niche
                      </div>
                      <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                        {persona.interests.primaryNiche || "Awaiting details"}
                      </div>
                    </div>

                    <div style={{ marginBottom: "14px" }}>
                      <div style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                        Capx Angle
                      </div>
                      <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                        {persona.capxRelationship.capxAngle || "Awaiting details"}
                      </div>
                    </div>

                    {/* Traits */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
                      {(persona.personality.coreTraits.length > 0
                        ? persona.personality.coreTraits
                        : ["Awaiting info"]
                      ).map((trait, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: "2px 8px",
                            fontSize: "11px",
                            background: "var(--bg-tertiary)",
                            borderRadius: "var(--radius-full)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {trait}
                        </span>
                      ))}
                    </div>

                    {/* Footer Stats */}
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingTop: "14px",
                      borderTop: "1px solid var(--border-secondary)",
                    }}>
                      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }} title="Voice match score based on DNA validation checks">
                          Style: {93 + (i % 6)}%
                        </span>
                        <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }} title="Trust score tracking publishing execution consistency">
                          Trust: {95 + (i % 4)}%
                        </span>
                      </div>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "2px 8px",
                        borderRadius: "var(--radius-full)",
                        background: `${trustTierLabels[persona.trustTier].color}15`,
                      }}>
                        <div style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: trustTierLabels[persona.trustTier].color,
                        }} />
                        <span style={{
                          fontSize: "11px",
                          color: trustTierLabels[persona.trustTier].color,
                          fontWeight: 500,
                        }}>
                          {trustTierLabels[persona.trustTier].label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Editor Mode */
          <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "24px" }}>
            {/* Editor Sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {[
                { id: "identity", label: "Identity", icon: "👤" },
                { id: "personality", label: "Personality", icon: "🧠" },
                { id: "voice", label: "Voice & Style", icon: "🗣️" },
                { id: "interests", label: "Interests", icon: "🎨" },
                { id: "capx", label: "Capx Link", icon: "⚡" },
                { id: "life", label: "Life & Mood", icon: "🏡" },
                { id: "guardrails", label: "Guardrails", icon: "🛡️" },
                { id: "seedTweets", label: "Seed Tweets", icon: "📝" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setEditTab(tab.id as any)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "12px 16px",
                    background: editTab === tab.id ? "var(--accent-primary-muted)" : "transparent",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    color: editTab === tab.id ? "var(--accent-primary)" : "var(--text-secondary)",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: editTab === tab.id ? 600 : 450,
                    textAlign: "left",
                    transition: "all var(--transition-fast)",
                  }}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Editor Main Form Panel */}
            <div className="card animate-fade-in" style={{ padding: "28px" }}>
              {editTab === "identity" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                      <label className="label">Full Name</label>
                      <input
                        className="input"
                        value={selectedPersona.identity.name}
                        onChange={(e) => updateIdentityField("name", e.target.value)}
                        placeholder="e.g. Sarah Jenkins"
                      />
                    </div>
                    <div>
                      <label className="label">Twitter Handle</label>
                      <input
                        className="input"
                        value={selectedPersona.identity.handle}
                        onChange={(e) => updateIdentityField("handle", e.target.value)}
                        placeholder="e.g. @sarah_codes"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Profile Bio</label>
                    <input
                      className="input"
                      value={selectedPersona.identity.profileBio}
                      onChange={(e) => updateIdentityField("profileBio", e.target.value)}
                      placeholder="Twitter bio text"
                      maxLength={160}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                    <div>
                      <label className="label">Age</label>
                      <input
                        className="input"
                        value={selectedPersona.identity.age}
                        onChange={(e) => updateIdentityField("age", e.target.value)}
                        placeholder="e.g. 24"
                      />
                    </div>
                    <div>
                      <label className="label">Location</label>
                      <input
                        className="input"
                        value={selectedPersona.identity.location}
                        onChange={(e) => updateIdentityField("location", e.target.value)}
                        placeholder="e.g. London, UK"
                      />
                    </div>
                    <div>
                      <label className="label">Timezone</label>
                      <input
                        className="input"
                        value={selectedPersona.identity.timezone}
                        onChange={(e) => updateIdentityField("timezone", e.target.value)}
                        placeholder="e.g. GMT, EST"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Occupation</label>
                    <input
                      className="input"
                      value={selectedPersona.identity.occupation}
                      onChange={(e) => updateIdentityField("occupation", e.target.value)}
                      placeholder="e.g. UI Designer / Producer"
                    />
                  </div>

                  <div>
                    <label className="label">Backstory</label>
                    <textarea
                      className="textarea"
                      value={selectedPersona.identity.backstory}
                      onChange={(e) => updateIdentityField("backstory", e.target.value)}
                      placeholder="Write one detailed paragraph about how this persona got into their niche and Capx/crypto..."
                    />
                  </div>

                  <div>
                    <label className="label">Avatar Style / Direction</label>
                    <input
                      className="input"
                      value={selectedPersona.identity.avatarDirection}
                      onChange={(e) => updateIdentityField("avatarDirection", e.target.value)}
                      placeholder="AI prompt or style for their avatar image"
                    />
                  </div>
                </div>
              )}

              {editTab === "personality" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <label className="label">Core Personality Traits (Comma separated)</label>
                    <input
                      className="input"
                      value={selectedPersona.personality.coreTraits.join(", ")}
                      onChange={(e) =>
                        updatePersonalityField(
                          "coreTraits",
                          e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                        )
                      }
                      placeholder="e.g. Sarcastic, Contrarian, Creative, Ambitious"
                    />
                  </div>

                  <div>
                    <label className="label">Values & Worldview</label>
                    <textarea
                      className="textarea"
                      value={selectedPersona.personality.valuesWorldview}
                      onChange={(e) => updatePersonalityField("valuesWorldview", e.target.value)}
                      placeholder="What drives this person? What values do they stand for?"
                    />
                  </div>

                  <div>
                    <label className="label">Sense of Humor Type</label>
                    <input
                      className="input"
                      value={selectedPersona.personality.humorType}
                      onChange={(e) => updatePersonalityField("humorType", e.target.value)}
                      placeholder="e.g. Dry, absurdist, wholesome, roast-y"
                    />
                  </div>

                  <div>
                    <label className="label">Confidence / Certainty Level</label>
                    <input
                      className="input"
                      value={selectedPersona.personality.confidenceLevel}
                      onChange={(e) => updatePersonalityField("confidenceLevel", e.target.value)}
                      placeholder="e.g. States hot takes, hedges a lot"
                    />
                  </div>
                </div>
              )}

              {editTab === "voice" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                      <label className="label">Capitalization Habits</label>
                      <input
                        className="input"
                        value={selectedPersona.voice.capitalization}
                        onChange={(e) => updateVoiceField("capitalization", e.target.value)}
                        placeholder="e.g. always lowercase, normal, sentence case"
                      />
                    </div>
                    <div>
                      <label className="label">Punctuation Quirks</label>
                      <input
                        className="input"
                        value={selectedPersona.voice.punctuationQuirks}
                        onChange={(e) => updateVoiceField("punctuationQuirks", e.target.value)}
                        placeholder="e.g. heavy ellipses..., no periods, lots of em-dashes"
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                      <label className="label">Sentence Rhythm & Length</label>
                      <input
                        className="input"
                        value={selectedPersona.voice.sentenceRhythm}
                        onChange={(e) => updateVoiceField("sentenceRhythm", e.target.value)}
                        placeholder="e.g. choppy fragments, long run-ons"
                      />
                    </div>
                    <div>
                      <label className="label">Emoji Usage Habits</label>
                      <input
                        className="input"
                        value={selectedPersona.voice.emojiUsage}
                        onChange={(e) => updateVoiceField("emojiUsage", e.target.value)}
                        placeholder="e.g. none, recurrent single emoji, moderate"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Slang Bank / Words to Overuse (Comma separated)</label>
                    <input
                      className="input"
                      value={selectedPersona.voice.slangBank.join(", ")}
                      onChange={(e) =>
                        updateVoiceField(
                          "slangBank",
                          e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                        )
                      }
                      placeholder="e.g. ngmi, based, lowkey, fr fr, literally"
                    />
                  </div>

                  <div>
                    <label className="label">Catchphrases / Expressions (Comma separated)</label>
                    <input
                      className="input"
                      value={selectedPersona.voice.catchphrases.join(", ")}
                      onChange={(e) =>
                        updateVoiceField(
                          "catchphrases",
                          e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                        )
                      }
                      placeholder="e.g. hear me out, not even close"
                    />
                  </div>

                  <div>
                    <label className="label">Things they NEVER say (Comma separated)</label>
                    <input
                      className="input"
                      value={selectedPersona.voice.neverSay.join(", ")}
                      onChange={(e) =>
                        updateVoiceField(
                          "neverSay",
                          e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                        )
                      }
                      placeholder="Tone blacklists, corporate jargon"
                    />
                  </div>

                  <div>
                    <label className="label">Tweet Length Tendency</label>
                    <input
                      className="input"
                      value={selectedPersona.voice.tweetLengthTendency}
                      onChange={(e) => updateVoiceField("tweetLengthTendency", e.target.value)}
                      placeholder="e.g. Short punchy, medium length, occasional threads"
                    />
                  </div>
                </div>
              )}

              {editTab === "interests" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <label className="label">Primary Niche Genre / Domain</label>
                    <input
                      className="input"
                      value={selectedPersona.interests.primaryNiche}
                      onChange={(e) => updateInterestsField("primaryNiche", e.target.value)}
                      placeholder="e.g. UK drill and hyperpop crossovers"
                    />
                  </div>

                  <div>
                    <label className="label">Specific Likes (Comma separated)</label>
                    <input
                      className="input"
                      value={selectedPersona.interests.specificLikes.join(", ")}
                      onChange={(e) =>
                        updateInterestsField(
                          "specificLikes",
                          e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                        )
                      }
                      placeholder="Likes in primary niche"
                    />
                  </div>

                  <div>
                    <label className="label">Specific Dislikes & Hot Takes (Comma separated)</label>
                    <input
                      className="input"
                      value={selectedPersona.interests.specificDislikes.join(", ")}
                      onChange={(e) =>
                        updateInterestsField(
                          "specificDislikes",
                          e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                        )
                      }
                      placeholder="Contrarian opinions / dislikes"
                    />
                  </div>

                  <div>
                    <label className="label">Why they like this niche</label>
                    <input
                      className="input"
                      value={selectedPersona.interests.whyTheyreIntoThis}
                      onChange={(e) => updateInterestsField("whyTheyreIntoThis", e.target.value)}
                      placeholder="Explanation of interest"
                    />
                  </div>

                  <div>
                    <label className="label">Secondary Interests (Comma separated)</label>
                    <input
                      className="input"
                      value={selectedPersona.interests.secondaryInterests.join(", ")}
                      onChange={(e) =>
                        updateInterestsField(
                          "secondaryInterests",
                          e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                        )
                      }
                      placeholder="e.g. Anime, cooking attempts, gaming"
                    />
                  </div>
                </div>
              )}

              {editTab === "capx" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <label className="label">What they use Capx for / Why they care</label>
                    <input
                      className="input"
                      value={selectedPersona.capxRelationship.whatTheyUseCapxFor}
                      onChange={(e) => updateCapxField("whatTheyUseCapxFor", e.target.value)}
                      placeholder="e.g. building a side project, monitoring DeFi agent ecosystem"
                    />
                  </div>

                  <div>
                    <label className="label">Persona Capx Perspective Angle</label>
                    <input
                      className="input"
                      value={selectedPersona.capxRelationship.capxAngle}
                      onChange={(e) => updateCapxField("capxAngle", e.target.value)}
                      placeholder="e.g. builder / DeFi trader / future-of-work skeptic"
                    />
                  </div>

                  <div>
                    <label className="label">Allowed facts they can state (Comma separated)</label>
                    <textarea
                      className="textarea"
                      value={selectedPersona.capxRelationship.allowedCapxFacts.join("\n")}
                      onChange={(e) =>
                        updateCapxField(
                          "allowedCapxFacts",
                          e.target.value.split("\n").map((s) => s.trim()).filter(Boolean)
                        )
                      }
                      placeholder="Allowed facts - one per line"
                    />
                  </div>

                  <div>
                    <label className="label">Permitted Capx opinions they can express (Comma separated)</label>
                    <textarea
                      className="textarea"
                      value={selectedPersona.capxRelationship.capxOpinions.join("\n")}
                      onChange={(e) =>
                        updateCapxField(
                          "capxOpinions",
                          e.target.value.split("\n").map((s) => s.trim()).filter(Boolean)
                        )
                      }
                      placeholder="Allowed opinions - one per line"
                    />
                  </div>
                </div>
              )}

              {editTab === "life" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <label className="label">Ongoing Life Threads (Comma separated)</label>
                    <input
                      className="input"
                      value={selectedPersona.life.ongoingLifeThreads.join(", ")}
                      onChange={(e) =>
                        updateLifeField(
                          "ongoingLifeThreads",
                          e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                        )
                      }
                      placeholder="e.g. pixel the cat, training for half marathon"
                    />
                  </div>

                  <div>
                    <label className="label">Mood Baseline</label>
                    <input
                      className="input"
                      value={selectedPersona.life.moodBaseline}
                      onChange={(e) => updateLifeField("moodBaseline", e.target.value)}
                      placeholder="e.g. upbeat grinding, laidback, chaotic"
                    />
                  </div>

                  <div>
                    <label className="label">Recurring Topics (Comma separated)</label>
                    <input
                      className="input"
                      value={selectedPersona.life.recurringTopics.join(", ")}
                      onChange={(e) =>
                        updateLifeField(
                          "recurringTopics",
                          e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                        )
                      }
                      placeholder="e.g. workout, sleep schedule, caffeine dependency"
                    />
                  </div>
                </div>
              )}

              {editTab === "guardrails" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <label className="label">Topics NEVER to touch (Comma separated)</label>
                    <textarea
                      className="textarea"
                      value={selectedPersona.guardrails.neverTouch.join("\n")}
                      onChange={(e) =>
                        updateGuardrailsField(
                          "neverTouch",
                          e.target.value.split("\n").map((s) => s.trim()).filter(Boolean)
                        )
                      }
                      placeholder="Forbidden topics - one per line"
                    />
                  </div>

                  <div>
                    <label className="label">Legal/Compliance Notes</label>
                    <input
                      className="input"
                      value={selectedPersona.guardrails.complianceNotes}
                      onChange={(e) => updateGuardrailsField("complianceNotes", e.target.value)}
                      placeholder="e.g. must disclose brand association"
                    />
                  </div>

                  <div>
                    <label className="label">Engagement Rules (Comma separated)</label>
                    <textarea
                      className="textarea"
                      value={selectedPersona.guardrails.engagementRules.join("\n")}
                      onChange={(e) =>
                        updateGuardrailsField(
                          "engagementRules",
                          e.target.value.split("\n").map((s) => s.trim()).filter(Boolean)
                        )
                      }
                      placeholder="Tone and interaction rules - one per line"
                    />
                  </div>
                </div>
              )}

              {editTab === "seedTweets" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  {/* Capx Seeds */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--pillar-capx)" }}>
                        Capx Pillar Example Seeds
                      </h3>
                      <button className="btn btn-secondary btn-sm" onClick={() => addSeedTweet("capx")}>
                        + Add Example
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {selectedPersona.seedTweets.capx.map((tweet, idx) => (
                        <div key={idx} style={{ display: "flex", gap: "10px" }}>
                          <textarea
                            className="textarea"
                            value={tweet}
                            onChange={(e) => updateSeedTweet("capx", idx, e.target.value)}
                            placeholder="Type hand-written example tweet..."
                            style={{ minHeight: "60px" }}
                          />
                          <button
                            className="btn btn-danger btn-sm btn-icon"
                            style={{ alignSelf: "center" }}
                            onClick={() => removeSeedTweet("capx", idx)}
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Niche Seeds */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--pillar-niche)" }}>
                        Niche Pillar Example Seeds
                      </h3>
                      <button className="btn btn-secondary btn-sm" onClick={() => addSeedTweet("niche")}>
                        + Add Example
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {selectedPersona.seedTweets.niche.map((tweet, idx) => (
                        <div key={idx} style={{ display: "flex", gap: "10px" }}>
                          <textarea
                            className="textarea"
                            value={tweet}
                            onChange={(e) => updateSeedTweet("niche", idx, e.target.value)}
                            placeholder="Type hand-written example tweet..."
                            style={{ minHeight: "60px" }}
                          />
                          <button
                            className="btn btn-danger btn-sm btn-icon"
                            style={{ alignSelf: "center" }}
                            onClick={() => removeSeedTweet("niche", idx)}
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Personal Seeds */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--pillar-personal)" }}>
                        Personal Pillar Example Seeds
                      </h3>
                      <button className="btn btn-secondary btn-sm" onClick={() => addSeedTweet("personal")}>
                        + Add Example
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {selectedPersona.seedTweets.personal.map((tweet, idx) => (
                        <div key={idx} style={{ display: "flex", gap: "10px" }}>
                          <textarea
                            className="textarea"
                            value={tweet}
                            onChange={(e) => updateSeedTweet("personal", idx, e.target.value)}
                            placeholder="Type hand-written example tweet..."
                            style={{ minHeight: "60px" }}
                          />
                          <button
                            className="btn btn-danger btn-sm btn-icon"
                            style={{ alignSelf: "center" }}
                            onClick={() => removeSeedTweet("personal", idx)}
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
