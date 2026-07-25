import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.warn("DATABASE_URL not set — database features are disabled");
}

const client = databaseUrl ? neon(databaseUrl) : null;

export function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  if (!client) {
    throw new Error("DATABASE_URL not set — database features are disabled");
  }
  return client(strings, ...values);
}
