import { getDatabase } from "@netlify/database";
import { getUser } from "@netlify/identity";
import type { Config, Context } from "@netlify/functions";

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...init.headers,
    },
  });
}

function hasAdminRole(user: any) {
  const roles = user?.app_metadata?.roles || user?.appMetadata?.roles || [];
  return Array.isArray(roles) && roles.includes("admin");
}

function isOwner(user: any) {
  return user?.email === "decanma1985@gmail.com" && hasAdminRole(user);
}

function normalizeProduct(row: any) {
  return {
    id: row.id,
    badge: row.badge,
    name: row.name,
    description: row.description,
    price: String(Number(row.price || 0)),
    priceLabel: row.price_label,
    mediaClass: row.media_class,
    url: row.url,
    visible: row.visible,
  };
}

export default async (req: Request, _context: Context) => {
  const db = getDatabase();

  if (req.method === "GET") {
    const [settingsRow] = await db.sql`
      SELECT data FROM site_settings WHERE id = ${"current"} LIMIT 1
    `;
    const products = await db.sql`
      SELECT * FROM products ORDER BY position ASC, created_at ASC
    `;

    if (!settingsRow && products.length === 0) return json(null);

    return json({
      ...(settingsRow?.data || {}),
      products: products.map(normalizeProduct),
    });
  }

  if (req.method === "POST") {
    const user = await getUser();
    if (!isOwner(user)) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await req.json();
    const products = Array.isArray(settings.products) ? settings.products : [];
    const settingsData = { ...settings };
    delete settingsData.products;

    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `
          INSERT INTO site_settings (id, data, updated_at)
          VALUES ('current', $1::jsonb, NOW())
          ON CONFLICT (id)
          DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
        `,
        [JSON.stringify(settingsData)]
      );

      await client.query("DELETE FROM products");

      for (const [index, product] of products.entries()) {
        await client.query(
          `
            INSERT INTO products (
              id, position, badge, name, description, price, price_label,
              media_class, url, visible, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
          `,
          [
            product.id || `product-${index + 1}`,
            index,
            product.badge || "",
            product.name || "",
            product.description || "",
            Number(product.price || 0),
            product.priceLabel || "",
            product.mediaClass || "media-ink",
            product.url || "",
            product.visible !== false,
          ]
        );
      }

      await client.query("COMMIT");
      return json({ ok: true });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(error);
      return json({ error: "Failed to save settings" }, { status: 500 });
    } finally {
      client.release();
    }
  }

  return json({ error: "Method not allowed" }, { status: 405 });
};

export const config: Config = {
  path: "/api/site-settings",
};
