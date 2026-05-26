import type { Handler, HandlerContext, HandlerEvent } from "@netlify/functions";

const ownerEmail = "decanma1985@gmail.com";

const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  const { user } = JSON.parse(event.body || "{}");
  const appMetadata = user?.app_metadata || {};
  const currentRoles = Array.isArray(appMetadata.roles) ? appMetadata.roles : [];
  const roles =
    user?.email === ownerEmail
      ? Array.from(new Set([...currentRoles, "admin"]))
      : currentRoles.filter((role: string) => role !== "admin");

  return {
    statusCode: 200,
    body: JSON.stringify({
      app_metadata: {
        ...appMetadata,
        roles,
      },
    }),
  };
};

export { handler };
