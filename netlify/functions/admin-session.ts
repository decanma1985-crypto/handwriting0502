import type { Config, Context } from "@netlify/functions";
import { isAdminRequest, json, ownerEmail } from "./_admin-auth";

export default async (req: Request, _context: Context) => {
  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  if (!(await isAdminRequest(req))) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  return json({ ok: true, email: ownerEmail });
};

export const config: Config = {
  path: "/api/admin-session",
};
