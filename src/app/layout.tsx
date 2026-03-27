import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pokédoku - Discord Edition",
  description: "Create and solve Pokédoku grids with your Discord friends!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <a href="/" style={{ fontSize: "1.3rem", fontWeight: 700, textDecoration: "none", color: "var(--accent)" }}>
            Pokédoku
          </a>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <a href="/rounds" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Rounds</a>
            <a href="/api/auth/signin" className="btn btn-primary" style={{ padding: "6px 16px", fontSize: "0.85rem" }}>
              Sign In
            </a>
          </div>
        </nav>
        <main style={{ maxWidth: "900px", margin: "0 auto", padding: "24px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
