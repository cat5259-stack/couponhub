// ─── Shared types for CouponHub ───────────────────────────────────────────────

export type Retailer =
  | "target"
  | "cvs"
  | "walgreens"
  | "heb"
  | "dollar_general"
  | "other";

export type DiscountType = "percentage" | "fixed" | "bogo" | "other";

export interface Coupon {
  id: number;
  user_id: number;
  retailer: Retailer;
  description: string;
  discount_type: DiscountType;
  discount_value: string;
  code: string | null;
  barcode_image_url: string | null;
  expiration_date: string; // ISO date (YYYY-MM-DD)
  image_url: string | null;
  is_clipped: boolean;
  created_at: string; // ISO timestamp
}

export interface ScanResult {
  /** Name of the product identified on the shelf */
  productName: string;
  /** Confidence level 0-1 for the product identification */
  confidence: number;
  /** The coupon ID that matched this product (if any) */
  matchedCouponId: number | null;
  /** Human-readable reason for the match (e.g. "25% off skincare at CVS") */
  matchedCouponDescription: string | null;
  /** Discount string (e.g. "$5.00 off", "25% off") */
  matchedDiscount: string | null;
  /** Retailer for the matched coupon */
  matchedRetailer: Retailer | null;
}

export interface ScanHistoryEntry {
  id: number;
  /** Thumbnail / data URL of the scan image (small) */
  thumbnailUrl: string;
  /** Number of matches found */
  matchCount: number;
  /** ISO timestamp */
  createdAt: string;
}
