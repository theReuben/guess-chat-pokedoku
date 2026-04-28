"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/create", label: "Create" },
  { href: "/manage", label: "Manage" },
  { href: "/play", label: "Play" },
  { href: "/settings", label: "Settings" },
];

interface NavUser {
  discord_username: string;
  avatar_url: string | null;
}

export default function Nav() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<NavUser | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/admin/check")
      .then(r => r.json())
      .then(data => setIsAdmin(data.isAdmin === true))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/users/me")
      .then(r => r.status === 401 ? null : r.json())
      .then(data => setUser(data && !data.error ? data : null))
      .catch(() => setUser(null));
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <nav style={{
      padding: "12px 16px",
      borderBottom: "1px solid var(--border)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      position: "sticky",
      top: 0,
      backgroundColor: "var(--bg-primary)",
      zIndex: 100,
    }}>
      <a href="/" style={{ fontSize: "1.3rem", fontWeight: 700, textDecoration: "none", color: "var(--accent)" }}>
        Pokédoku
      </a>

      {/* Hamburger button - visible on mobile via CSS */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMenuOpen(true)}
        aria-label="Open menu"
      >
        &#9776;
      </button>

      {/* Overlay */}
      <div
        className={`mobile-overlay ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(false)}
      />

      {/* Nav links */}
      <div className={`nav-links ${menuOpen ? "open" : ""}`}>
        {menuOpen && (
          <button
            className="mobile-close-btn"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            &#10005;
          </button>
        )}
        {links.map(link => (
          <a
            key={link.href}
            href={link.href}
            className={`btn ${pathname?.startsWith(link.href) ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "6px 14px", fontSize: "0.85rem" }}
          >
            {link.label}
          </a>
        ))}
        {isAdmin && (
          <a
            href="/admin"
            className={`btn ${pathname === "/admin" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "6px 14px", fontSize: "0.85rem", borderColor: "var(--accent)" }}
          >
            Admin
          </a>
        )}
        {user === null && (
          <a
            href="/api/auth/discord-mobile"
            className="btn btn-primary"
            style={{ padding: "6px 14px", fontSize: "0.85rem" }}
          >
            Sign In
          </a>
        )}
        {user && (
          <a
            href="/settings"
            style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", color: "inherit" }}
          >
            {user.avatar_url && (
              <img
                src={user.avatar_url}
                alt=""
                style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid var(--border)" }}
              />
            )}
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{user.discord_username}</span>
          </a>
        )}
      </div>
    </nav>
  );
}
