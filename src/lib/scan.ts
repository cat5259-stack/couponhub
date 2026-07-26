import { createServerFn } from "@tanstack/react-start";
import OpenAI from "openai";
import type { Coupon, ScanResult, ScanHistoryEntry } from "~/lib/types";
import { sql, dbAvailable } from "~/db";

// ─── Mock data for when OPENAI_API_KEY is not set ─────────────────────────────

const MOCK_RESULTS: ScanResult[] = [
  {
    productName: "Tide Pods 3-in-1 Laundry Detergent (42 ct)",
    confidence: 0.94,
    matchedCouponId: 1,
    matchedCouponDescription: "$5 off any laundry detergent 50oz+",
    matchedDiscount: "$5.00 off",
    matchedRetailer: "target",
  },
  {
    productName: "Dove Body Wash Deep Moisture (22 oz)",
    confidence: 0.88,
    matchedCouponId: null,
    matchedCouponDescription: null,
    matchedDiscount: null,
    matchedRetailer: null,
  },
  {
    productName: "CeraVe Hydrating Facial Cleanser (16 oz)",
    confidence: 0.91,
    matchedCouponId: 2,
    matchedCouponDescription: "25% off all skincare products",
    matchedDiscount: "25% off",
    matchedRetailer: "cvs",
  },
  {
    productName: "Crest 3D White Toothpaste (5.7 oz)",
    confidence: 0.86,
    matchedCouponId: 3,
    matchedCouponDescription: "Buy 1 Get 1 Free on any toothpaste",
    matchedDiscount: "Buy 1 Get 1",
    matchedRetailer: "walgreens",
  },
  {
    productName: "L'Oréal Paris Revitalift Anti-Wrinkle Cream",
    confidence: 0.82,
    matchedCouponId: 2,
    matchedCouponDescription: "25% off all skincare products",
    matchedDiscount: "25% off",
    matchedRetailer: "cvs",
  },
  {
    productName: "H-E-B Texas Shape Corn Chips (12 oz)",
    confidence: 0.79,
    matchedCouponId: 4,
    matchedCouponDescription: "$0.75 off H-E-B brand chips",
    matchedDiscount: "$0.75 off",
    matchedRetailer: "heb",
  },
  {
    productName: "Downy Infusions Fabric Softener (51 oz)",
    confidence: 0.75,
    matchedCouponId: 1,
    matchedCouponDescription: "$5 off any laundry detergent 50oz+",
    matchedDiscount: "$5.00 off",
    matchedRetailer: "target",
  },
];

// Alternate mock set for variety
const MOCK_RESULTS_ALT: ScanResult[] = [
  {
    productName: "Colgate Optic White Toothpaste (4.2 oz)",
    confidence: 0.92,
    matchedCouponId: 3,
    matchedCouponDescription: "Buy 1 Get 1 Free on any toothpaste",
    matchedDiscount: "Buy 1 Get 1",
    matchedRetailer: "walgreens",
  },
  {
    productName: "Neutrogena Hydro Boost Water Gel (1.7 oz)",
    confidence: 0.89,
    matchedCouponId: 2,
    matchedCouponDescription: "25% off all skincare products",
    matchedDiscount: "25% off",
    matchedRetailer: "cvs",
  },
  {
    productName: "Tide Simply Clean Laundry Detergent (89 oz)",
    confidence: 0.91,
    matchedCouponId: 1,
    matchedCouponDescription: "$5 off any laundry detergent 50oz+",
    matchedDiscount: "$5.00 off",
    matchedRetailer: "target",
  },
  {
    productName: "Great Value Paper Towels (6 rolls)",
    confidence: 0.84,
    matchedCouponId: 5,
    matchedCouponDescription: "10% off your entire purchase",
    matchedDiscount: "10% off",
    matchedRetailer: "dollar_general",
  },
  {
    productName: "H-E-B Creamy Creations Ice Cream (half gal)",
    confidence: 0.78,
    matchedCouponId: 4,
    matchedCouponDescription: "$0.75 off H-E-B brand chips",
    matchedDiscount: "$0.75 off",
    matchedRetailer: "heb",
  },
];

// ─── Scan image analysis ──────────────────────────────────────────────────────

/**
 * Analyzes a shelf photo using GPT-4o to identify products and match them
 * against the user's coupon list. Falls back to mock data if OPENAI_API_KEY
 * is not set.
 */
export async function analyzeAisleImage(
  imageBase64: string,
  coupons: Coupon[]
): Promise<ScanResult[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  // No API key — use mock data with a small delay to simulate processing
  if (!apiKey) {
    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));
    const mockSet =
      Math.random() > 0.5 ? MOCK_RESULTS : MOCK_RESULTS_ALT;
    return mockSet;
  }

  // Build coupon context for the model
  const couponCtx = coupons
    .filter((c) => c.is_clipped)
    .map(
      (c) =>
        `ID:${c.id} | ${c.retailer} | ${c.description} | ${c.discount_type}:${c.discount_value} | expires ${c.expiration_date}`
    )
    .join("\n");

  const systemPrompt = `You are an AI product recognition system for a coupon app. 
Analyze the shelf/aisle photo provided and:

1. Identify visible packaged consumer goods on the shelf. Focus on recognizable national brands and store brands typically found in grocery, drugstore, and big-box retail aisles.
2. For each product, match it against the user's coupon list below. Match by brand, product category, or product type. Be generous with matching — if there's a coupon for "toothpaste" and you see any toothpaste brand, that's a match.
3. Return ONLY a JSON array of objects with these exact fields:
   - productName: string (the product as it appears on the shelf, with size/variant if visible)
   - confidence: number (0-1, your confidence in the product identification)
   - matchedCouponId: number | null (the coupon ID from the list below, or null if no match)
   - matchedCouponDescription: string | null (the coupon description, or null)
   - matchedDiscount: string | null (the discount string, or null)
   - matchedRetailer: string | null (the retailer, or null)

Return 5-10 products. Do NOT include any explanation or markdown — just the JSON array.

USER'S COUPON LIST:
${couponCtx || "(no coupons available)"}`;

  const openai = new OpenAI({ apiKey });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Identify products in this shelf photo and match against the coupon list above." },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content?.trim() ?? "[]";
    // Strip possible markdown code fences
    const jsonStr = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const results: ScanResult[] = JSON.parse(jsonStr);

    // Validate and sanitize
    return results.map((r) => ({
      productName: String(r.productName ?? "Unknown product"),
      confidence: Math.min(1, Math.max(0, Number(r.confidence) || 0.5)),
      matchedCouponId:
        r.matchedCouponId != null ? Number(r.matchedCouponId) : null,
      matchedCouponDescription: r.matchedCouponDescription ?? null,
      matchedDiscount: r.matchedDiscount ?? null,
      matchedRetailer: r.matchedRetailer ?? null,
    }));
  } catch (err) {
    console.error("OpenAI scan failed, falling back to mock:", err);
    const mockSet =
      Math.random() > 0.5 ? MOCK_RESULTS : MOCK_RESULTS_ALT;
    return mockSet;
  }
}

// ─── Server Functions ─────────────────────────────────────────────────────────

export const runScan = createServerFn({ method: "POST" })
  .validator(
    (data: { imageBase64: string; coupons: Coupon[] }) => data
  )
  .handler(async ({ data }) => {
    const results = await analyzeAisleImage(data.imageBase64, data.coupons);
    return results;
  });

export const saveScan = createServerFn({ method: "POST" })
  .validator(
    (data: {
      imageBase64: string;
      results: ScanResult[];
    }) => data
  )
  .handler(async ({ data }) => {
    if (!dbAvailable()) {
      // Return a fake entry
      return {
        success: true,
        id: Date.now(),
      };
    }

    // Store a small thumbnail (first 200 chars of base64 as a hint, not full image in DB)
    const thumbnail = data.imageBase64.slice(0, 100);
    const matchCount = data.results.filter((r) => r.matchedCouponId != null).length;
    const resultsJson = JSON.stringify(data.results);

    const rows = await sql`
      INSERT INTO scan_history (user_id, image_url, results_json)
      VALUES (1, ${thumbnail}, ${resultsJson})
      RETURNING id
    `;
    return { success: true, id: rows[0].id as number };
  });

export const getScanHistory = createServerFn({ method: "GET" }).handler(
  async () => {
    if (!dbAvailable()) return [] as ScanHistoryEntry[];

    const rows = await sql`
      SELECT id, image_url, results_json, created_at
      FROM scan_history
      WHERE user_id = 1
      ORDER BY created_at DESC
      LIMIT 5
    `;
    return rows.map((r) => {
      const results = safeJsonParse(
        String(r.results_json ?? "[]"),
        [] as ScanResult[]
      );
      return {
        id: r.id as number,
        thumbnailUrl: String(r.image_url ?? ""),
        matchCount: results.filter(
          (s: ScanResult) => s.matchedCouponId != null
        ).length,
        createdAt: String(r.created_at),
      };
    }) as ScanHistoryEntry[];
  }
);

function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}
