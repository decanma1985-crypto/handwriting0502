import type { Handler, HandlerContext, HandlerEvent } from "@netlify/functions";

const ownerEmail = "decanma1985@gmail.com";

const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  const { user } = JSON.parse(event.body || "{}");
  const appMetadata = user?.app_metadata || {};
  const roles = user?.email === ownerEmail ? ["admin"] : [];

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
