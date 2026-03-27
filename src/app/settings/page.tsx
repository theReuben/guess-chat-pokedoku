"use client";

import { useEffect, useState } from "react";

interface UserProfile {
  id: string;
  discord_username: string;
  display_name: string;
  avatar_url: string | null;
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/users/me")
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else {
          setUser(data);
          setDisplayName(data.display_name);
        }
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError("");

    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName }),
    });

    if (res.ok) {
      const data = await res.json();
      setUser(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save");
    }
    setSaving(false);
  }

  if (loading) return <p style={{ color: "var(--text-secondary)" }}>Loading...</p>;

  if (!user) {
    return (
      <div style={{ textAlign: "center", paddingTop: "48px" }}>
        <h2 style={{ fontWeight: 700, marginBottom: "12px" }}>Not Signed In</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
          Sign in with Discord to manage your profile.
        </p>
        <a href="/api/auth/signin" className="btn btn-primary">Sign in with Discord</a>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "24px" }}>Settings</h1>

      <div className="card">
        <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "24px" }}>
          {user.avatar_url && (
            <img
              src={user.avatar_url}
              alt=""
              style={{ width: 48, height: 48, borderRadius: "50%" }}
            />
          )}
          <div>
            <div style={{ fontWeight: 600 }}>{user.discord_username}</div>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Discord account</div>
          </div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: "8px" }}>
            Display Name
          </label>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "8px" }}>
            This is how your name appears in the guess dropdown and on grids you create.
          </p>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            maxLength={32}
            style={{ maxWidth: "400px" }}
          />
        </div>

        {error && (
          <div style={{ color: "var(--accent)", marginBottom: "12px" }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            className="btn btn-primary"
            onClick={save}
            disabled={saving || displayName === user.display_name}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          {saved && <span style={{ color: "var(--success)" }}>Saved!</span>}
        </div>
      </div>

      <div className="card" style={{ marginTop: "16px" }}>
        <a href="/api/auth/signout" className="btn btn-secondary">Sign Out</a>
      </div>
    </div>
  );
}
