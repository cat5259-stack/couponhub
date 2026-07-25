import { createRequestHandler } from "@tanstack/react-start/server";
import { createServer, type ServerOptions } from "node:http";
import type { AddressInfo } from "node:net";

const handler = createRequestHandler({
  requestHandler: (ctx) => {
    const app = ctx.router.lookup(ctx.request);
    if (!app?.serverHandler) {
      return new Response("Not found", { status: 404 });
    }
    return app.serverHandler(ctx);
  },
});

const server = createServer(
  // TanStack's createRequestHandler returns a Node request listener
  handler as unknown as ServerOptions["requestListener"],
);

const port = Number(process.env.PORT) || 3000;
server.listen(port, "0.0.0.0", () => {
  const addr = server.address() as AddressInfo;
  console.log(`Server listening on http://0.0.0.0:${addr.port}`);
});
