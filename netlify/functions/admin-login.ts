import type { Config, Context } from "@netlify/functions";
import {
  createSessionCookie,
  getAdminPassword,
  hasAllowedOrigin,
  json,
  ownerEmail,
  verifyPassword,
} from "./_admin-auth";

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  if (!hasAllowedOrigin(req)) {
    return json({ error: "Forbidden origin" }, { status: 403 });
  }

  const adminPassword = getAdminPassword();
  if (!adminPassword) {
    return json({ error: "Admin password is not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (email !== ownerEmail || !verifyPassword(password, adminPassword)) {
    return json({ error: "Invalid credentials" }, { status: 401 });
  }

  return json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": createSessionCookie(ownerEmail),
      },
    }
  );
};

export const config: Config = {
  path: "/api/admin-login",
};
