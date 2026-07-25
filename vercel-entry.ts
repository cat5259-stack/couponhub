import { createRequestHandler } from "@tanstack/react-start/server";
import type { IncomingMessage, ServerResponse } from "node:http";

const handler = createRequestHandler({
  requestHandler: (ctx) => {
    const app = ctx.router.lookup(ctx.request);
    if (!app?.serverHandler) {
      return new Response("Not found", { status: 404 });
    }
    return app.serverHandler(ctx);
  },
});

export default async function vercelEntry(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const webReq = new Request(url, {
    method: req.method,
    headers: Object.entries(req.headers).reduce(
      (h, [k, v]) => {
        if (v) h.set(k, Array.isArray(v) ? v.join(", ") : v);
        return h;
      },
      new Headers(),
    ),
    body: req.method !== "GET" && req.method !== "HEAD" ? req : undefined,
  });

  const webRes = await handler(webReq);

  res.statusCode = webRes.status;
  webRes.headers.forEach((v, k) => res.setHeader(k, v));
  if (webRes.body) {
    const reader = webRes.body.getReader();
    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) {
        res.end();
        return;
      }
      res.write(value);
      await pump();
    };
    await pump();
  } else {
    res.end();
  }
}
