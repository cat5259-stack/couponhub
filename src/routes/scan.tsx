import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { sql, dbAvailable } from "~/db";
import { useState, useRef, useCallback, useEffect } from "react";
import { runScan, saveScan, getScanHistory } from "~/lib/scan";
import type { Coupon, ScanResult, ScanHistoryEntry } from "~/lib/types";

// ─── Sample coupons (same as dashboard, for when DB is unavailable) ────────────

const SAMPLE_COUPONS: Coupon[] = [
  {
    id: 1, user_id: 1, retailer: "target",
    description: "$5 off any laundry detergent 50oz+",
    discount_type: "fixed", discount_value: "5.00", code: "TARGET5LD",
    barcode_image_url: null, expiration_date: "2026-08-15",
    image_url: null, is_clipped: true, created_at: "2026-07-20T10:30:00Z",
  },
  {
    id: 2, user_id: 1, retailer: "cvs",
    description: "25% off all skincare products",
    discount_type: "percentage", discount_value: "25", code: null,
    barcode_image_url: null, expiration_date: "2026-07-28",
    image_url: null, is_clipped: true, created_at: "2026-07-21T14:00:00Z",
  },
  {
    id: 3, user_id: 1, retailer: "walgreens",
    description: "Buy 1 Get 1 Free on any toothpaste",
    discount_type: "bogo", discount_value: "", code: "BOGOPASTE",
    barcode_image_url: null, expiration_date: "2026-09-01",
    image_url: null, is_clipped: true, created_at: "2026-07-22T09:15:00Z",
  },
  {
    id: 4, user_id: 1, retailer: "heb",
    description: "$0.75 off H-E-B brand chips",
    discount_type: "fixed", discount_value: "0.75", code: null,
    barcode_image_url: null, expiration_date: "2026-07-25",
    image_url: null, is_clipped: true, created_at: "2026-07-23T16:45:00Z",
  },
  {
    id: 5, user_id: 1, retailer: "dollar_general",
    description: "10% off your entire purchase",
    discount_type: "percentage", discount_value: "10", code: "DG10OFF",
    barcode_image_url: null, expiration_date: "2026-08-10",
    image_url: null, is_clipped: true, created_at: "2026-07-24T08:00:00Z",
  },
  {
    id: 6, user_id: 1, retailer: "target",
    description: "20% off any toy purchase",
    discount_type: "percentage", discount_value: "20", code: null,
    barcode_image_url: null, expiration_date: "2026-07-26",
    image_url: null, is_clipped: true, created_at: "2026-07-25T11:20:00Z",
  },
];

// ─── Server function to get coupons ───────────────────────────────────────────

const getCoupons = createServerFn({ method: "GET" }).handler(async () => {
  if (!dbAvailable()) return [] as Coupon[];
  const rows = await sql`
    SELECT id, user_id, retailer, description, discount_type, discount_value,
           code, barcode_image_url, expiration_date, image_url, is_clipped, created_at
    FROM coupons WHERE user_id = 1 ORDER BY created_at DESC
  `;
  return rows.map((r) => ({
    ...r,
    expiration_date: String(r.expiration_date).slice(0, 10),
    created_at: String(r.created_at),
    is_clipped: Boolean(r.is_clipped),
  })) as Coupon[];
});

// ─── Retailer display helpers ─────────────────────────────────────────────────

const RETAILER_COLORS: Record<string, string> = {
  target: "bg-red-100 text-red-700",
  cvs: "bg-red-100 text-red-800",
  walgreens: "bg-blue-100 text-blue-700",
  heb: "bg-red-100 text-red-600",
  dollar_general: "bg-yellow-100 text-yellow-800",
  other: "bg-gray-100 text-gray-600",
};

function retailerLabel(r: string): string {
  return r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function confidenceColor(conf: number): string {
  if (conf >= 0.9) return "text-green-600 bg-green-50";
  if (conf >= 0.7) return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
}

function confidenceLabel(conf: number): string {
  if (conf >= 0.9) return "High confidence";
  if (conf >= 0.7) return "Medium confidence";
  return "Low confidence";
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/scan")({
  loader: async () => {
    const [coupons, history] = await Promise.all([
      getCoupons(),
      getScanHistory(),
    ]);
    return { coupons, history };
  },
  component: Scan,
});

// ─── Main Component ───────────────────────────────────────────────────────────

function Scan() {
  const { coupons: dbCoupons, history: dbHistory } = Route.useLoaderData();

  const [coupons] = useState<Coupon[]>(
    dbCoupons && dbCoupons.length > 0 ? dbCoupons : SAMPLE_COUPONS
  );
  const [history, setHistory] = useState<ScanHistoryEntry[]>(dbHistory ?? []);

  const [image, setImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>("");
  const [results, setResults] = useState<ScanResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // ── Image handling ──────────────────────────────────────────────────────

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (JPEG, PNG, etc.)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImage(dataUrl);
      // Extract base64 portion
      const b64 = dataUrl.split(",")[1] ?? "";
      setImageBase64(b64);
      setResults(null);
      setError(null);
    };
    reader.onerror = () => setError("Failed to read the image file.");
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleTakePhoto = () => {
    fileInputRef.current?.click();
  };

  const clearImage = () => {
    setImage(null);
    setImageBase64(null);
    setResults(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Scan trigger ────────────────────────────────────────────────────────

  const handleScan = async () => {
    if (!imageBase64) return;
    setIsScanning(true);
    setScanStep("Identifying products on the shelf...");
    setError(null);

    try {
      const scanResults = await runScan({
        data: { imageBase64, coupons },
      });
      setScanStep("Matching against your coupons...");
      // Small pause to show the transition message
      await new Promise((r) => setTimeout(r, 600));
      setResults(scanResults);

      // Save to history
      try {
        await saveScan({ data: { imageBase64, results: scanResults } });
        // Refresh history
        const fresh = await getScanHistory();
        setHistory(fresh ?? []);
      } catch {
        // Non-critical: history save can fail silently
      }
    } catch (err) {
      setError("Scan failed. Please try again with a clearer photo.");
      console.error("Scan error:", err);
    } finally {
      setIsScanning(false);
      setScanStep("");
    }
  };

  const matchedCount = results?.filter((r) => r.matchedCouponId != null).length ?? 0;
  const totalCount = results?.length ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              AI Aisle Scan
            </h1>
            <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700">
              AI-Powered
            </span>
          </div>
          <p className="mt-1 text-gray-500">
            Snap a photo of any store aisle — we'll match products to your
            coupons instantly.
          </p>
        </div>

        {/* Scan history toggle */}
        {history.length > 0 && (
          <button
            type="button"
            onClick={() => setHistoryOpen(!historyOpen)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Recent Scans ({history.length})
          </button>
        )}
      </div>

      {/* ── Scan History Panel ───────────────────────────────────────────── */}
      {historyOpen && history.length > 0 && (
        <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Recent Scans
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="flex-shrink-0 w-40 rounded-xl border border-gray-100 bg-gray-50 p-3"
              >
                <div className="h-20 w-full rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                  {/* Show a camera icon instead of the tiny base64 preview */}
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </span>
                  <span className="font-semibold text-emerald-600">
                    {entry.matchCount} match{entry.matchCount !== 1 ? "es" : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main content area ────────────────────────────────────────────── */}
      <div className="mt-8 grid gap-8 lg:grid-cols-5">
        {/* Left: upload area */}
        <div className="lg:col-span-2">
          {/* Drop zone / preview */}
          {!image ? (
            <div
              ref={dropZoneRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={handleTakePhoto}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-all duration-200 ${
                isDragging
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-gray-200 bg-gray-50 hover:border-emerald-300 hover:bg-emerald-50/30"
              }`}
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200">
                <svg className="h-10 w-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="mt-6 text-base font-medium text-gray-700">
                Drop a shelf photo here or{" "}
                <span className="text-emerald-600">browse</span>
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Supports JPEG, PNG — any image format
              </p>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTakePhoto();
                }}
                className="btn-primary mt-8"
              >
                <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Take Photo
              </button>
            </div>
          ) : (
            /* Image preview */
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <img
                src={image}
                alt="Aisle shelf preview"
                className="w-full h-64 object-cover"
              />
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-gray-500">Photo ready</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={clearImage}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                    disabled={isScanning}
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={handleScan}
                    disabled={isScanning}
                    className="btn-primary text-sm px-5 py-2"
                  >
                    {isScanning ? (
                      <>
                        <Spinner />
                        <span className="ml-2">Scanning...</span>
                      </>
                    ) : (
                      <>
                        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Scan Aisle
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isScanning && (
            <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-center">
              <Spinner className="mx-auto" />
              <p className="mt-4 text-sm font-medium text-emerald-800">
                {scanStep || "Analyzing your photo..."}
              </p>
              <p className="mt-1 text-xs text-emerald-600">
                Our AI is identifying products and matching coupons
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Right: results */}
        <div className="lg:col-span-3">
          {results === null && !isScanning && (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 p-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-700">
                Ready to scan
              </h3>
              <p className="mt-1 text-sm text-gray-500 max-w-sm">
                Upload a photo of any store aisle and our AI will identify
                products and match them to your {coupons.length} clipped
                coupons.
              </p>
            </div>
          )}

          {results !== null && (
            <>
              {/* Results header */}
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Scan Results
                  </h2>
                  <p className="text-sm text-gray-500">
                    {totalCount} products identified &middot;{" "}
                    {matchedCount} coupon match
                    {matchedCount !== 1 ? "es" : ""} found
                  </p>
                </div>
                {matchedCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    You could save!
                  </span>
                )}
              </div>

              {results.length === 0 ? (
                /* No-match state */
                <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mx-auto">
                    <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-700">
                    No matching coupons found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
                    No matching coupons found for the products in this photo.
                    Try a different angle or aisle!
                  </p>
                </div>
              ) : (
                /* Results grid */
                <div className="grid gap-4 sm:grid-cols-2">
                  {results.map((result, i) => (
                    <ScanResultCard key={i} result={result} />
                  ))}
                </div>
              )}

              {/* Scan again button */}
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={clearImage}
                  className="btn-secondary text-sm"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Scan Another Aisle
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── AI disclaimer ────────────────────────────────────────────────── */}
      <p className="mt-12 text-center text-xs text-gray-400">
        AI-powered product recognition — results may vary. Always verify
        coupon terms before checkout.
      </p>
    </div>
  );
}

// ─── ScanResultCard ───────────────────────────────────────────────────────────

function ScanResultCard({ result }: { result: ScanResult }) {
  const isMatch = result.matchedCouponId != null;

  return (
    <div
      className={`rounded-2xl border p-5 transition-all duration-200 hover:shadow-md ${
        isMatch
          ? "border-emerald-200 bg-white"
          : "border-gray-100 bg-gray-50/50"
      }`}
    >
      {/* Product name + confidence */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900 leading-snug flex-1">
          {result.productName}
        </h3>
        <span
          className={`inline-flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${confidenceColor(result.confidence)}`}
          title={`Confidence: ${Math.round(result.confidence * 100)}%`}
        >
          {Math.round(result.confidence * 100)}%
        </span>
      </div>

      {isMatch ? (
        <>
          {/* Matched coupon */}
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs font-semibold text-emerald-700">
                Matched Coupon
              </span>
            </div>
            <p className="mt-1.5 text-sm font-medium text-gray-800">
              {result.matchedCouponDescription}
            </p>
            <p className="mt-1 text-lg font-bold text-emerald-700">
              {result.matchedDiscount}
            </p>
            {result.matchedRetailer && (
              <span
                className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  RETAILER_COLORS[result.matchedRetailer] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {retailerLabel(result.matchedRetailer)}
              </span>
            )}
          </div>

          {/* Clip button */}
          <button
            type="button"
            className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-emerald-700 active:scale-[0.98]"
          >
            Clip This Coupon
          </button>
        </>
      ) : (
        /* No match */
        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 text-center">
          <p className="text-xs text-gray-400">
            No matching coupon found for this product.
          </p>
        </div>
      )}

      {/* AI confidence note */}
      <p className="mt-3 text-[11px] text-gray-400 italic">
        {confidenceLabel(result.confidence)} AI match
      </p>
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={`h-8 w-8 animate-spin text-emerald-600 ${className ?? ""}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
