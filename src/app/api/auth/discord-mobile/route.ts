import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Redirect all users to NextAuth's Discord sign-in endpoint.
  // The previous approach made a server-side fetch to capture the OAuth URL
  // and then served a deep-link HTML page trying to open the Discord app.
  // This broke sign-in for users who have Discord installed: the Discord app
  // would complete OAuth and open the callback URL in the phone's default
  // browser, which is a different session from where the authjs.state cookie
  // was set, causing NextAuth's state validation to fail.
  // Redirecting to the standard sign-in endpoint keeps the entire OAuth flow
  // in the same browser session so the state cookie is always present on the
  // callback request.
  return NextResponse.redirect(new URL("/api/auth/signin/discord", request.url));
}
