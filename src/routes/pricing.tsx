import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/pricing")({
  component: Pricing,
});

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For casual couponers getting started.",
    features: [
      "Save up to 25 coupons",
      "3 AI aisle scans per month",
      "Basic expiration alerts",
      "Single retailer support",
    ],
    cta: "Get Started",
    featured: false,
  },
  {
    name: "Premium",
    price: "$4.99",
    period: "/month",
    description: "For serious savers who want it all.",
    features: [
      "Unlimited coupon storage",
      "Unlimited AI aisle scans",
      "Smart expiration alerts & push notifications",
      "All major retailers supported",
      "Coupon stacking suggestions",
      "Family sharing (up to 4 members)",
      "Lifetime savings dashboard",
    ],
    cta: "Coming Soon",
    featured: true,
  },
];

function Pricing() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
          Pricing
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Start free. Upgrade when you're ready to supercharge your savings.
        </p>
      </div>

      <div className="mx-auto mt-16 grid max-w-3xl gap-8 lg:grid-cols-2">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative rounded-2xl border p-8 ${
              plan.featured
                ? "border-emerald-600 bg-white shadow-xl shadow-emerald-100/50 ring-1 ring-emerald-600"
                : "border-gray-200 bg-white"
            }`}
          >
            {plan.featured && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-4 py-1 text-sm font-semibold text-white">
                Best Value
              </span>
            )}
            <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
            <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
            <p className="mt-6">
              <span className="text-4xl font-bold text-gray-900">
                {plan.price}
              </span>
              <span className="text-gray-500">{plan.period}</span>
            </p>
            <ul className="mt-8 space-y-3">
              {plan.features.map((feat) => (
                <li key={feat} className="flex items-start gap-3">
                  <svg
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-gray-600">{feat}</span>
                </li>
              ))}
            </ul>
            <Link
              to={plan.name === "Free" ? "/dashboard" : "/"}
              className={`mt-8 block w-full rounded-xl px-6 py-3 text-center font-semibold transition-all duration-150 ${
                plan.featured
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"
                  : "border border-emerald-600 text-emerald-600 hover:bg-emerald-50"
              }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
