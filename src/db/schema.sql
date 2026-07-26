-- CouponHub Database Schema
-- Run this to set up tables on a fresh database.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stripe_customer_id TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'premium'))
);

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
);

CREATE INDEX IF NOT EXISTS idx_coupons_user_id ON coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_coupons_retailer ON coupons(retailer);
CREATE INDEX IF NOT EXISTS idx_coupons_expiration ON coupons(expiration_date);

CREATE TABLE IF NOT EXISTS scan_history (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,
  results_json TEXT NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_history_user_id ON scan_history(user_id);
