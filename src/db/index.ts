import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

function getClient() {
  if (!databaseUrl) return null;
  return neon(databaseUrl);
}

/**
 * Tagged template helper for SQL queries.
 * Throws if DATABASE_URL is not set.
 */
export function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  const client = getClient();
  if (!client) {
    throw new Error("DATABASE_URL not set — database features are disabled");
  }
  return client(strings, ...values);
}

/**
 * Returns true if the database is available.
 */
export function dbAvailable(): boolean {
  return !!databaseUrl;
}

/**
 * Run schema setup. Safe to call multiple times (uses IF NOT EXISTS).
 */
export async function seed(): Promise<void> {
  const client = getClient();
  if (!client) {
    console.warn("DATABASE_URL not set — skipping seed");
    return;
  }

  await client`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      name          TEXT NOT NULL DEFAULT '',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      stripe_customer_id TEXT,
      subscription_tier TEXT NOT NULL DEFAULT 'free'
        CHECK (subscription_tier IN ('free', 'premium'))
    )
  `;

  await client`
    CREATE TABLE IF NOT EXISTS coupons (
      id              SERIAL PRIMARY KEY,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      retailer        TEXT NOT NULL
        CHECK (retailer IN ('target', 'cvs', 'walgreens', 'heb', 'dollar_general', 'other')),
      description     TEXT NOT NULL,
      discount_type   TEXT NOT NULL
        CHECK (discount_type IN ('percentage', 'fixed', 'bogo', 'other')),
      discount_value  TEXT NOT NULL DEFAULT '',
      code            TEXT,
      barcode_image_url TEXT,
      expiration_date DATE NOT NULL,
      image_url       TEXT,
      is_clipped      BOOLEAN NOT NULL DEFAULT TRUE,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await client`CREATE INDEX IF NOT EXISTS idx_coupons_user_id ON coupons(user_id)`;
  await client`CREATE INDEX IF NOT EXISTS idx_coupons_retailer ON coupons(retailer)`;
  await client`CREATE INDEX IF NOT EXISTS idx_coupons_expiration ON coupons(expiration_date)`;

  await client`
    CREATE TABLE IF NOT EXISTS scan_history (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      image_url   TEXT NOT NULL,
      results_json TEXT NOT NULL DEFAULT '{}',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await client`CREATE INDEX IF NOT EXISTS idx_scan_history_user_id ON scan_history(user_id)`;

  console.log("Database seeded successfully");
}
