import type { Config, Context } from "@netlify/functions";
import { clearSessionCookie, json } from "./_admin-auth";

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  return json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": clearSessionCookie(),
      },
    }
  );
};

export const config: Config = {
  path: "/api/admin-logout",
};
