import { getDatabase } from "@netlify/database";
import type { Config, Context } from "@netlify/functions";
import { hasAllowedOrigin, isAdminRequest, json } from "./_admin-auth";

export default async (req: Request, _context: Context) => {
  const db = getDatabase();

  if (req.method === "POST") {
    if (!hasAllowedOrigin(req)) {
      return json({ error: "Forbidden origin" }, { status: 403 });
    }

    const body = await req.json();
    const items = Array.isArray(body.items) ? body.items : [];
    const total = items.reduce((sum: number, item: any) => sum + Number(item.price || 0), 0);

    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `
          INSERT INTO orders (customer_name, email, message, total_amount)
          VALUES ($1, $2, $3, $4)
          RETURNING id, created_at
        `,
        [body.name || "", body.email || "", body.message || "", total]
      );
      const order = result.rows[0];

      for (const item of items) {
        await client.query(
          `
            INSERT INTO order_items (order_id, product_name, price, quantity)
            VALUES ($1, $2, $3, 1)
          `,
          [order.id, item.name || "未命名商品", Number(item.price || 0)]
        );
      }

      await client.query("COMMIT");
      return json({ ok: true, orderId: order.id, createdAt: order.created_at });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(error);
      return json({ error: "Failed to create order" }, { status: 500 });
    } finally {
      client.release();
    }
  }

  if (req.method === "GET") {
    if (!(await isAdminRequest(req))) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const orders = await db.sql`
      SELECT
        o.*,
        COALESCE(
          json_agg(
            json_build_object(
              'name', oi.product_name,
              'price', oi.price,
              'quantity', oi.quantity
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'
        ) AS items
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT 100
    `;

    return json({ orders });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
};

export const config: Config = {
  path: "/api/orders",
};
