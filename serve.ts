import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

// Use TanStack Start's built-in server handler
async function main() {
  // Dynamic import the built server entry
  const { default: serverEntry } = await import(
    "./dist/server/server.js"
  );

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(
        req.url ?? "/",
        `http://${req.headers.host ?? "localhost"}`
      );

      // Build a Web Request from the Node request
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) {
          if (Array.isArray(value)) {
            headers.set(key, value.join(", "));
          } else {
            headers.set(key, value);
          }
        }
      }

      const webReq = new Request(url, {
        method: req.method,
        headers,
        body:
          req.method !== "GET" && req.method !== "HEAD"
            ? req
            : undefined,
      });

      const webRes = await serverEntry.fetch(webReq);

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
    } catch (err) {
      console.error("Server error:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  const port = Number(process.env.PORT) || 3000;
  server.listen(port, "0.0.0.0", () => {
    const addr = server.address() as AddressInfo;
    console.log(`Server listening on http://0.0.0.0:${addr.port}`);
  });
}

main().catch(console.error);
