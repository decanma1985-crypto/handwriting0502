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
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const address = String(body.address || "").trim();
    const message = String(body.message || "").trim();

    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");
      const customerResult = await client.query(
        `
          INSERT INTO customers (name, email, phone, address, note, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (email)
          DO UPDATE SET
            name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            note = EXCLUDED.note,
            updated_at = NOW()
          RETURNING id
        `,
        [name, email, phone, address, message]
      );
      const customer = customerResult.rows[0];

      const result = await client.query(
        `
          INSERT INTO orders (customer_id, customer_name, email, message, total_amount)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, created_at
        `,
        [customer.id, name, email, message, total]
      );
      const order = result.rows[0];

      for (const item of items) {
        await client.query(
          `
            INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
            VALUES ($1, $2, $3, $4, 1)
          `,
          [order.id, item.id || null, item.name || "未命名商品", Number(item.price || 0)]
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
        json_build_object(
          'id', c.id,
          'name', c.name,
          'email', c.email,
          'phone', c.phone,
          'address', c.address,
          'note', c.note
        ) AS customer,
        COALESCE(
          json_agg(
            json_build_object(
              'productId', oi.product_id,
              'name', oi.product_name,
              'price', oi.price,
              'quantity', oi.quantity
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'
        ) AS items
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      GROUP BY o.id, c.id
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
