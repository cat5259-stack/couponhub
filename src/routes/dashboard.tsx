import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { sql, dbAvailable } from "~/db";
import { useState, useMemo, useEffect } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Retailer = "target" | "cvs" | "walgreens" | "heb" | "dollar_general" | "other";
type DiscountType = "percentage" | "fixed" | "bogo" | "other";
type SortKey = "expiration" | "retailer" | "created";

interface Coupon {
  id: number;
  user_id: number;
  retailer: Retailer;
  description: string;
  discount_type: DiscountType;
  discount_value: string;
  code: string | null;
  barcode_image_url: string | null;
  expiration_date: string; // ISO date
  image_url: string | null;
  is_clipped: boolean;
  created_at: string; // ISO timestamp
}

// ─── Sample data (used when no DB is available) ──────────────────────────────

const SAMPLE_COUPONS: Coupon[] = [
  {
    id: 1,
    user_id: 1,
    retailer: "target",
    description: "$5 off any laundry detergent 50oz+",
    discount_type: "fixed",
    discount_value: "5.00",
    code: "TARGET5LD",
    barcode_image_url: null,
    expiration_date: "2026-08-15",
    image_url: null,
    is_clipped: true,
    created_at: "2026-07-20T10:30:00Z",
  },
  {
    id: 2,
    user_id: 1,
    retailer: "cvs",
    description: "25% off all skincare products",
    discount_type: "percentage",
    discount_value: "25",
    code: null,
    barcode_image_url: null,
    expiration_date: "2026-07-28",
    image_url: null,
    is_clipped: true,
    created_at: "2026-07-21T14:00:00Z",
  },
  {
    id: 3,
    user_id: 1,
    retailer: "walgreens",
    description: "Buy 1 Get 1 Free on any toothpaste",
    discount_type: "bogo",
    discount_value: "",
    code: "BOGOPASTE",
    barcode_image_url: null,
    expiration_date: "2026-09-01",
    image_url: null,
    is_clipped: true,
    created_at: "2026-07-22T09:15:00Z",
  },
  {
    id: 4,
    user_id: 1,
    retailer: "heb",
    description: "$0.75 off H-E-B brand chips",
    discount_type: "fixed",
    discount_value: "0.75",
    code: null,
    barcode_image_url: null,
    expiration_date: "2026-07-25",
    image_url: null,
    is_clipped: true,
    created_at: "2026-07-23T16:45:00Z",
  },
  {
    id: 5,
    user_id: 1,
    retailer: "dollar_general",
    description: "10% off your entire purchase",
    discount_type: "percentage",
    discount_value: "10",
    code: "DG10OFF",
    barcode_image_url: null,
    expiration_date: "2026-08-10",
    image_url: null,
    is_clipped: true,
    created_at: "2026-07-24T08:00:00Z",
  },
  {
    id: 6,
    user_id: 1,
    retailer: "target",
    description: "20% off any toy purchase",
    discount_type: "percentage",
    discount_value: "20",
    code: null,
    barcode_image_url: null,
    expiration_date: "2026-07-26",
    image_url: null,
    is_clipped: true,
    created_at: "2026-07-25T11:20:00Z",
  },
];

// ─── Server Functions ────────────────────────────────────────────────────────

const getCoupons = createServerFn({ method: "GET" }).handler(async () => {
  if (!dbAvailable()) return [] as Coupon[];

  const rows = await sql`
    SELECT id, user_id, retailer, description, discount_type, discount_value,
           code, barcode_image_url, expiration_date, image_url, is_clipped, created_at
    FROM coupons
    WHERE user_id = 1
    ORDER BY created_at DESC
  `;
  return rows.map((r) => ({
    ...r,
    expiration_date: String(r.expiration_date).slice(0, 10),
    created_at: String(r.created_at),
    is_clipped: Boolean(r.is_clipped),
  })) as Coupon[];
});

const addCouponFn = createServerFn({ method: "POST" })
  .validator((data: {
    retailer: Retailer;
    description: string;
    discount_type: DiscountType;
    discount_value: string;
    code: string;
    expiration_date: string;
  }) => data)
  .handler(async ({ data }) => {
    if (!dbAvailable()) {
      // Return a mock success with fake id
      return { success: true, id: Date.now() };
    }
    const rows = await sql`
      INSERT INTO coupons (user_id, retailer, description, discount_type, discount_value, code, expiration_date)
      VALUES (1, ${data.retailer}, ${data.description}, ${data.discount_type}, ${data.discount_value}, ${data.code || null}, ${data.expiration_date})
      RETURNING id
    `;
    return { success: true, id: rows[0].id as number };
  });

const markUsedFn = createServerFn({ method: "POST" })
  .validator((data: { id: number; is_clipped: boolean }) => data)
  .handler(async ({ data }) => {
    if (!dbAvailable()) return { success: true };
    await sql`
      UPDATE coupons SET is_clipped = ${data.is_clipped}
      WHERE id = ${data.id} AND user_id = 1
    `;
    return { success: true };
  });

const removeCouponFn = createServerFn({ method: "POST" })
  .validator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    if (!dbAvailable()) return { success: true };
    await sql`
      DELETE FROM coupons WHERE id = ${data.id} AND user_id = 1
    `;
    return { success: true };
  });

// ─── Constants ───────────────────────────────────────────────────────────────

const RETAILERS: { value: Retailer | "all"; label: string; color: string }[] = [
  { value: "all", label: "All", color: "bg-gray-100 text-gray-700" },
  { value: "target", label: "Target", color: "bg-red-100 text-red-700" },
  { value: "cvs", label: "CVS", color: "bg-red-100 text-red-800" },
  { value: "walgreens", label: "Walgreens", color: "bg-blue-100 text-blue-700" },
  { value: "heb", label: "H-E-B", color: "bg-red-100 text-red-600" },
  { value: "dollar_general", label: "Dollar General", color: "bg-yellow-100 text-yellow-800" },
  { value: "other", label: "Other", color: "bg-gray-100 text-gray-600" },
];

const RETAILER_COLORS: Record<Retailer, string> = {
  target: "bg-red-100 text-red-700",
  cvs: "bg-red-100 text-red-800",
  walgreens: "bg-blue-100 text-blue-700",
  heb: "bg-red-100 text-red-600",
  dollar_general: "bg-yellow-100 text-yellow-800",
  other: "bg-gray-100 text-gray-600",
};

const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  percentage: "% off",
  fixed: "$ off",
  bogo: "BOGO",
  other: "Special",
};

function formatDiscount(coupon: Coupon): string {
  if (coupon.discount_type === "percentage") return `${coupon.discount_value}% off`;
  if (coupon.discount_type === "fixed") return `$${coupon.discount_value} off`;
  if (coupon.discount_type === "bogo") return "Buy 1 Get 1";
  return coupon.discount_value || "Special offer";
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/dashboard")({
  loader: () => getCoupons(),
  component: Dashboard,
});

// ─── Main Component ──────────────────────────────────────────────────────────

function Dashboard() {
  const dbCoupons = Route.useLoaderData();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [retailerFilter, setRetailerFilter] = useState<Retailer | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("expiration");
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Merge DB data with sample data (DB takes priority)
  useEffect(() => {
    if (dbCoupons && dbCoupons.length > 0) {
      setCoupons(dbCoupons);
    } else {
      setCoupons(SAMPLE_COUPONS);
    }
  }, [dbCoupons]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Filter and sort
  const filtered = useMemo(() => {
    let list = [...coupons];
    if (retailerFilter !== "all") {
      list = list.filter((c) => c.retailer === retailerFilter);
    }
    list.sort((a, b) => {
      if (sortKey === "expiration") {
        return new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime();
      }
      if (sortKey === "retailer") {
        return a.retailer.localeCompare(b.retailer);
      }
      // created
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }, [coupons, retailerFilter, sortKey]);

  const handleMarkUsed = async (coupon: Coupon) => {
    const newVal = !coupon.is_clipped;
    setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? { ...c, is_clipped: newVal } : c)));
    try {
      await markUsedFn({ data: { id: coupon.id, is_clipped: newVal } });
      showToast(newVal ? "Coupon clipped!" : "Coupon marked as used");
    } catch {
      // Revert on error
      setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? { ...c, is_clipped: !newVal } : c)));
    }
  };

  const handleRemove = async (coupon: Coupon) => {
    setCoupons((prev) => prev.filter((c) => c.id !== coupon.id));
    try {
      await removeCouponFn({ data: { id: coupon.id } });
      showToast("Coupon removed");
    } catch {
      setCoupons((prev) => [...prev, coupon]);
    }
  };

  const handleAddCoupon = async (data: {
    retailer: Retailer;
    description: string;
    discount_type: DiscountType;
    discount_value: string;
    code: string;
    expiration_date: string;
  }) => {
    const newCoupon: Coupon = {
      id: Date.now(),
      user_id: 1,
      retailer: data.retailer,
      description: data.description,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      code: data.code || null,
      barcode_image_url: null,
      expiration_date: data.expiration_date,
      image_url: null,
      is_clipped: true,
      created_at: new Date().toISOString(),
    };

    // Optimistic add
    setCoupons((prev) => [newCoupon, ...prev]);
    setShowAddModal(false);
    showToast("Coupon added!");

    try {
      const result = await addCouponFn({ data });
      // Update with real ID from DB
      if (result.id && result.id !== newCoupon.id) {
        setCoupons((prev) =>
          prev.map((c) => (c.id === newCoupon.id ? { ...c, id: result.id } : c))
        );
      }
    } catch {
      showToast("Failed to add coupon — please try again");
    }
  };

  // Stats
  const activeCount = coupons.filter((c) => c.is_clipped).length;
  const expiringCount = coupons.filter((c) => c.is_clipped && daysUntil(c.expiration_date) <= 7).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 animate-slide-in rounded-lg bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">My Coupons</h1>
          <p className="mt-1 text-gray-500">
            {activeCount} active &middot; {expiringCount} expiring soon
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
        >
          <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Coupon
        </button>
      </div>

      {/* Filters & Sort */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Retailer filter pills */}
        <div className="flex flex-wrap gap-2">
          {RETAILERS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRetailerFilter(r.value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
                retailerFilter === r.value
                  ? "bg-emerald-600 text-white shadow-sm"
                  : `${r.color} hover:opacity-80`
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-sm text-gray-500">Sort by</label>
          <select
            id="sort"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="expiration">Expiration (soonest)</option>
            <option value="retailer">Store</option>
            <option value="created">Date added</option>
          </select>
        </div>
      </div>

      {/* Coupon grid / Empty state */}
      {filtered.length === 0 ? (
        <EmptyState onAdd={() => setShowAddModal(true)} />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((coupon) => (
            <CouponCard
              key={coupon.id}
              coupon={coupon}
              onMarkUsed={() => handleMarkUsed(coupon)}
              onRemove={() => handleRemove(coupon)}
            />
          ))}
        </div>
      )}

      {/* Add Coupon Modal */}
      {showAddModal && (
        <AddCouponModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddCoupon}
        />
      )}
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-16 flex flex-col items-center justify-center text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
        <svg className="h-10 w-10 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      </div>
      <h3 className="mt-6 text-lg font-semibold text-gray-900">No coupons yet</h3>
      <p className="mt-1 text-gray-500">Clip your first coupon to get started!</p>
      <button type="button" onClick={onAdd} className="btn-primary mt-6">
        <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Your First Coupon
      </button>
    </div>
  );
}

// ─── Coupon Card ─────────────────────────────────────────────────────────────

function CouponCard({
  coupon,
  onMarkUsed,
  onRemove,
}: {
  coupon: Coupon;
  onMarkUsed: () => void;
  onRemove: () => void;
}) {
  const days = daysUntil(coupon.expiration_date);
  const expiringSoon = days <= 7;
  const expired = days < 0;
  const critical = days <= 3;

  const expiryBadge = expired
    ? "bg-red-100 text-red-700"
    : critical
      ? "bg-red-50 text-red-600"
      : expiringSoon
        ? "bg-amber-50 text-amber-600"
        : "bg-green-50 text-green-600";

  const expiryLabel = expired
    ? "Expired"
    : days === 0
      ? "Expires today"
      : days === 1
        ? "1 day left"
        : `${days} days left`;

  const retailerLabel = coupon.retailer
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div
      className={`group relative rounded-2xl border bg-white p-5 transition-all duration-200 hover:shadow-md ${
        coupon.is_clipped
          ? "border-gray-100"
          : "border-gray-100 bg-gray-50 opacity-70"
      }`}
    >
      {/* Dashed top edge — coupon aesthetic */}
      <div className="absolute -top-px left-4 right-4 h-px border-t-2 border-dashed border-gray-200" />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              RETAILER_COLORS[coupon.retailer]
            }`}
          >
            {retailerLabel}
          </span>
          <span className="text-xs text-gray-400">
            {DISCOUNT_TYPE_LABELS[coupon.discount_type]}
          </span>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${expiryBadge}`}
        >
          {expiryLabel}
        </span>
      </div>

      <p className="mt-3 text-sm font-medium text-gray-900 leading-snug">
        {coupon.description}
      </p>

      <p className="mt-1.5 text-2xl font-bold text-emerald-700">
        {formatDiscount(coupon)}
      </p>

      {coupon.code && (
        <div className="mt-3 flex items-center gap-2">
          <code className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-mono font-semibold text-gray-700 tracking-wide">
            {coupon.code}
          </code>
          <span className="text-xs text-gray-400">online/in-store</span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3">
        <button
          type="button"
          onClick={onMarkUsed}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150 ${
            coupon.is_clipped
              ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
              : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
          }`}
        >
          {coupon.is_clipped ? "Mark Used" : "Re-clip"}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg px-3 py-2 text-xs font-semibold text-red-500 transition-all duration-150 hover:bg-red-50"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

// ─── Add Coupon Modal ────────────────────────────────────────────────────────

function AddCouponModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: {
    retailer: Retailer;
    description: string;
    discount_type: DiscountType;
    discount_value: string;
    code: string;
    expiration_date: string;
  }) => void;
}) {
  const [retailer, setRetailer] = useState<Retailer>("target");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("fixed");
  const [discountValue, setDiscountValue] = useState("");
  const [code, setCode] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!description.trim()) errs.description = "Description is required";
    if (!expirationDate) errs.expiration_date = "Expiration date is required";
    if (discountType !== "bogo" && !discountValue.trim()) {
      errs.discount_value = "Value is required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      retailer,
      description: description.trim(),
      discount_type: discountType,
      discount_value: discountValue.trim(),
      code: code.trim(),
      expiration_date: expirationDate,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Coupon</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
          {/* Retailer */}
          <div>
            <label htmlFor="modal-retailer" className="block text-sm font-medium text-gray-700">
              Retailer
            </label>
            <select
              id="modal-retailer"
              value={retailer}
              onChange={(e) => setRetailer(e.target.value as Retailer)}
              className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="target">Target</option>
              <option value="cvs">CVS</option>
              <option value="walgreens">Walgreens</option>
              <option value="heb">H-E-B</option>
              <option value="dollar_general">Dollar General</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="modal-desc" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <input
              id="modal-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='e.g. "$5 off any laundry detergent"'
              className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 ${
                errors.description
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-500">{errors.description}</p>
            )}
          </div>

          {/* Discount type + value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="modal-dtype" className="block text-sm font-medium text-gray-700">
                Discount Type
              </label>
              <select
                id="modal-dtype"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="fixed">$ Off</option>
                <option value="percentage">% Off</option>
                <option value="bogo">BOGO</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="modal-dval" className="block text-sm font-medium text-gray-700">
                Value
              </label>
              <input
                id="modal-dval"
                type="text"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === "percentage" ? "25" : "5.00"}
                disabled={discountType === "bogo"}
                className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 disabled:bg-gray-100 disabled:text-gray-400 ${
                  errors.discount_value
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                }`}
              />
              {errors.discount_value && (
                <p className="mt-1 text-xs text-red-500">{errors.discount_value}</p>
              )}
            </div>
          </div>

          {/* Code */}
          <div>
            <label htmlFor="modal-code" className="block text-sm font-medium text-gray-700">
              Coupon Code <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="modal-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. SAVE10"
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Expiration */}
          <div>
            <label htmlFor="modal-expiry" className="block text-sm font-medium text-gray-700">
              Expiration Date
            </label>
            <input
              id="modal-expiry"
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 ${
                errors.expiration_date
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
              }`}
            />
            {errors.expiration_date && (
              <p className="mt-1 text-xs text-red-500">{errors.expiration_date}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-all duration-150 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-emerald-700 active:scale-[0.98]"
            >
              Clip Coupon
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
