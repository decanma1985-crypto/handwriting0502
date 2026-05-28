import { getDatabase } from "@netlify/database";
import type { Config, Context } from "@netlify/functions";
import { isAdminRequest, json } from "./_admin-auth";

export default async (req: Request, _context: Context) => {
  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  if (!(await isAdminRequest(req))) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDatabase();
  const customers = await db.sql`
    SELECT
      c.*,
      COUNT(o.id)::int AS order_count,
      COALESCE(SUM(o.total_amount), 0)::numeric AS total_spent,
      MAX(o.created_at) AS last_order_at
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id
    GROUP BY c.id
    ORDER BY last_order_at DESC NULLS LAST, c.updated_at DESC
    LIMIT 200
  `;

  return json({ customers });
};

export const config: Config = {
  path: "/api/customers",
};
