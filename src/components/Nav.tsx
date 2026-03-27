"use client";

import { usePathname } from "next/navigation";

const links = [
  { href: "/create", label: "Create" },
  { href: "/manage", label: "Manage" },
  { href: "/play", label: "Play" },
  { href: "/settings", label: "Settings" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav style={{
      padding: "12px 24px",
      borderBottom: "1px solid var(--border)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    }}>
      <a href="/" style={{ fontSize: "1.3rem", fontWeight: 700, textDecoration: "none", color: "var(--accent)" }}>
        Pokédoku
      </a>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
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
      </div>
    </nav>
  );
}
