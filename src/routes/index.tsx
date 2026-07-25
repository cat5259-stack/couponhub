import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { readFile } from "node:fs/promises";
import { useState } from "react";

const getBusinessName = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const cfg = JSON.parse(await readFile("site.json", "utf8")) as {
      businessName?: string;
    };
    return cfg.businessName?.trim() ?? "";
  } catch {
    return "";
  }
});

export const Route = createFileRoute("/")({
  loader: () => getBusinessName(),
  component: Home,
});

function Home() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <WaitlistSection />
    </>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50 via-white to-white">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="absolute -right-40 top-20 h-96 w-96 rounded-full bg-green-100/40 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6 sm:pb-28 sm:pt-28 lg:px-8 lg:pb-32 lg:pt-36">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-semibold text-emerald-800">
            🎯 The smarter way to save
          </span>

          <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            All your coupons.{" "}
            <span className="text-emerald-600">One app.</span>{" "}
            <span className="text-emerald-600">One photo.</span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-gray-600 sm:text-xl">
            Clip, organize, and track coupons from Target, CVS, Walgreens,
            H-E-B, Dollar General, and more. Snap a photo of any aisle to see
            which products match your saved coupons — instantly.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="#waitlist"
              className="btn-primary text-lg px-8 py-4 rounded-xl shadow-lg shadow-emerald-200/50"
            >
              Join the Waitlist
              <svg
                className="ml-2 h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </a>
            <a
              href="#features"
              className="btn-secondary text-lg px-8 py-4 rounded-xl"
            >
              See How It Works
            </a>
          </div>

          {/* Social proof badge */}
          <p className="mt-8 text-sm text-gray-500">
            One app for all your coupons — across every store you love.
          </p>
        </div>
      </div>
    </section>
  );
}

const features = [
  {
    title: "Universal Coupon Wallet",
    description:
      "No more juggling Target Circle, CVS ExtraCare, Walgreens, and paper inserts. Store every coupon from every retailer in one beautiful, organized wallet.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
    ),
  },
  {
    title: "AI Aisle Scan",
    description:
      "Snap a photo of any store aisle and our AI instantly matches products on the shelf to your saved coupons. No barcode scanning — just point, shoot, and save.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    title: "Smart Expiration Alerts",
    description:
      "Never lose a deal again. Get notified before your coupons expire so you can plan your shopping trips around maximum savings.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
    ),
  },
  {
    title: "Coupon Stacking Suggestions",
    description:
      "Our AI understands each retailer's coupon policy and automatically finds stacking opportunities — combine manufacturer + store coupons for maximum discounts.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything you need to save more
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            ClipWise brings together every feature serious couponers need — in
            one beautifully designed app.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:mt-20">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative rounded-2xl border border-gray-100 bg-white p-8 transition-all duration-200 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50"
            >
              <div className="mb-4 inline-flex rounded-lg bg-emerald-100 p-3 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                {feature.title}
              </h3>
              <p className="mt-3 text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const steps = [
  {
    step: "1",
    title: "Clip Your Coupons",
    description:
      "Import coupons from your favorite retailers and manufacturers into one universal wallet.",
  },
  {
    step: "2",
    title: "Shop Like Normal",
    description:
      "Walk into any supported store and browse the aisles as you always do.",
  },
  {
    step: "3",
    title: "Snap & Save",
    description:
      "Take a photo of the aisle. ClipWise instantly shows which products match your coupons.",
  },
];

function HowItWorksSection() {
  return (
    <section className="bg-gray-50 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            How ClipWise works
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Three simple steps to couponing smarter — not harder.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-3 lg:mt-20">
          {steps.map((item) => (
            <div key={item.step} className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-xl font-bold text-white shadow-md shadow-emerald-200">
                {item.step}
              </div>
              <h3 className="mt-6 text-lg font-semibold text-gray-900">
                {item.title}
              </h3>
              <p className="mt-3 text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder action — backend coming soon
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <section id="waitlist" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-2xl rounded-3xl bg-gradient-to-br from-emerald-600 to-green-700 p-10 text-center shadow-xl shadow-emerald-200/50 sm:p-14">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Be first in line
          </h2>
          <p className="mt-4 text-lg text-emerald-100">
            ClipWise is launching soon. Join the waitlist for early access and a
            free premium trial.
          </p>

          {submitted ? (
            <div className="mt-8 rounded-xl bg-white/15 p-6 backdrop-blur-sm">
              <svg
                className="mx-auto h-12 w-12 text-emerald-200"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="mt-3 text-lg font-semibold text-white">
                You're on the list!
              </p>
              <p className="mt-1 text-emerald-200">
                We'll let you know when ClipWise launches.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 rounded-xl border-0 bg-white/20 px-5 py-4 text-white placeholder-emerald-200 backdrop-blur-sm ring-1 ring-inset ring-white/20 transition focus:outline-none focus:ring-2 focus:ring-white"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-white px-8 py-4 font-semibold text-emerald-700 shadow-md transition-all duration-150 hover:bg-emerald-50 active:scale-[0.98]"
                >
                  Notify Me
                </button>
              </div>
              <p className="mt-3 text-sm text-emerald-200">
                No spam, ever. Just launch updates and early access details.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
