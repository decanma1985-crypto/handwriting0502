import { createHmac, timingSafeEqual } from "node:crypto";

export const ownerEmail = "decanma1985@gmail.com";
export const sessionCookieName = "admin_session";
const sessionMaxAge = 60 * 60 * 24 * 7;

export function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...init.headers,
    },
  });
}

export function hasAllowedOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(req.url).origin;
}

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || "";
}

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "";
}

function base64Url(input: string) {
  return Buffer.from(input).toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function parseCookies(req: Request) {
  return Object.fromEntries(
    (req.headers.get("cookie") || "")
      .split(";")
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const [name, ...value] = cookie.split("=");
        return [name, value.join("=")];
      })
  );
}

export function verifyPassword(input: string, expected: string) {
  const inputBuffer = Buffer.from(input);
  const expectedBuffer = Buffer.from(expected);
  return inputBuffer.length === expectedBuffer.length && timingSafeEqual(inputBuffer, expectedBuffer);
}

export function createSessionCookie(email: string) {
  const payload = base64Url(JSON.stringify({ email, exp: Math.floor(Date.now() / 1000) + sessionMaxAge }));
  const token = `${payload}.${sign(payload)}`;
  return `${sessionCookieName}=${token}; Path=/; Max-Age=${sessionMaxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie() {
  return `${sessionCookieName}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

function hasValidSession(req: Request) {
  const token = parseCookies(req)[sessionCookieName];
  const [payload, signature] = token?.split(".") || [];
  if (!payload || !signature || !getSessionSecret()) return false;
  if (signature !== sign(payload)) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.email === ownerEmail && Number(data.exp || 0) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function isAdminRequest(req: Request) {
  return hasValidSession(req);
}
