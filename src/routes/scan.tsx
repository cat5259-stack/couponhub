import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/scan")({
  component: Scan,
});

function Scan() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
      <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700">
        AI-Powered
      </span>
      <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
        AI Aisle Scan
      </h1>
      <p className="mt-4 text-lg text-gray-600">
        Snap a photo of any store aisle and instantly see which products match
        your saved coupons. No barcode scanning required.
      </p>

      <div className="mx-auto mt-12 flex max-w-sm flex-col items-center gap-6 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-12">
        <svg
          className="h-16 w-16 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <p className="text-gray-400">Photo upload coming soon</p>
      </div>
    </div>
  );
}
