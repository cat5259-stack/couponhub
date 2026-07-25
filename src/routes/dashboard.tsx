import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
        Coming Soon
      </span>
      <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
        Your Coupon Dashboard
      </h1>
      <p className="mt-4 text-lg text-gray-600">
        Manage all your coupons in one place. Track savings, check expiration
        dates, and find the best deals across stores.
      </p>
      <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-emerald-50 text-3xl font-bold text-emerald-600">
          0
        </div>
        <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-amber-50 text-3xl font-bold text-amber-600">
          0
        </div>
        <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-blue-50 text-3xl font-bold text-blue-600">
          0
        </div>
      </div>
      <p className="mt-4 text-sm text-gray-400">
        Active coupons &middot; Expiring soon &middot; Total savings
      </p>
    </div>
  );
}
