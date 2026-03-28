import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") || "";
  const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);

  if (!isMobile) {
    return NextResponse.redirect(new URL("/api/auth/signin/discord", request.url));
  }

  // Make an internal request to NextAuth's Discord signin endpoint so it
  // generates a state token and sets the state cookie, then capture the
  // resulting Discord OAuth URL so we can swap the scheme to discord://.
  const signinUrl = new URL("/api/auth/signin/discord", request.url);

  let discordOAuthUrl: string | null = null;
  let stateCookies: string[] = [];

  try {
    const response = await fetch(signinUrl.toString(), {
      headers: {
        cookie: request.headers.get("cookie") || "",
        host: request.headers.get("host") || "",
        // x-forwarded-host carries the real public hostname on Vercel/proxies;
        // NextAuth v5 needs it to build the correct OAuth callback URL.
        "x-forwarded-host":
          request.headers.get("x-forwarded-host") ||
          request.headers.get("host") ||
          "",
        // Use a non-mobile UA so this internal call isn't intercepted again
        "user-agent": "internal",
        "x-forwarded-proto": request.headers.get("x-forwarded-proto") || "https",
      },
      redirect: "manual",
    });

    discordOAuthUrl = response.headers.get("location");

    // getSetCookie() is Node 18+ / undici; fall back to get() for older runtimes
    if (typeof (response.headers as any).getSetCookie === "function") {
      stateCookies = (response.headers as any).getSetCookie() as string[];
    } else {
      const raw = response.headers.get("set-cookie");
      if (raw) stateCookies = [raw];
    }
  } catch {
    return NextResponse.redirect(new URL("/api/auth/signin/discord", request.url));
  }

  if (!discordOAuthUrl || !discordOAuthUrl.includes("discord.com/oauth2/authorize")) {
    return NextResponse.redirect(new URL("/api/auth/signin/discord", request.url));
  }

  // Replace the https scheme with the Discord app deep-link scheme
  const appUrl = discordOAuthUrl.replace("https://discord.com", "discord://discord.com");

  // Escape for safe inline JS string interpolation
  const safeAppUrl = JSON.stringify(appUrl);
  const safeWebUrl = JSON.stringify(discordOAuthUrl);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Signing in with Discord...</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      text-align: center;
      padding: 60px 20px;
      background: #1a1a2e;
      color: #e2e8f0;
      margin: 0;
    }
    h2 { margin-bottom: 10px; font-size: 1.4rem; }
    p { color: #94a3b8; margin-bottom: 32px; }
    .btn {
      display: inline-block;
      padding: 12px 28px;
      background: #5865F2;
      color: white;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      margin: 6px;
    }
    .btn-secondary {
      background: transparent;
      border: 1px solid #374151;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <h2>Opening Discord...</h2>
  <p>Attempting to open the Discord app for sign-in.</p>
  <a href="${appUrl}" class="btn">Open Discord App</a><br>
  <a href="${discordOAuthUrl}" class="btn btn-secondary">Use Browser Instead</a>
  <script>
    var appUrl = ${safeAppUrl};
    var webUrl = ${safeWebUrl};
    var fallbackTimer;

    // Cancel the fallback if the page hides (app opened successfully)
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) clearTimeout(fallbackTimer);
    });

    // If app doesn't open within 2.5 s, fall back to browser OAuth
    fallbackTimer = setTimeout(function () {
      window.location.replace(webUrl);
    }, 2500);

    window.location.replace(appUrl);
  </script>
</body>
</html>`;

  const htmlResponse = new NextResponse(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });

  // Forward the NextAuth state cookies so the callback can verify the state
  stateCookies.forEach((cookie) => {
    htmlResponse.headers.append("set-cookie", cookie);
  });

  return htmlResponse;
}
