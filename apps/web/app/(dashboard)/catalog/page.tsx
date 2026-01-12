// BuildOS - Catalog Hub Page
// Lists available catalog sections

import Link from "next/link";

const catalogItems = [
  {
    title: "Work Types",
    description: "Labor catalog with pricing, units, and norms.",
    href: "/catalog/work-types",
    status: "Active",
  },
  {
    title: "Materials",
    description: "Material catalog (coming soon).",
    href: "/catalog/work-types",
    status: "Coming soon",
  },
  {
    title: "Subcontractors",
    description: "Subcontractor rates (coming soon).",
    href: "/catalog/work-types",
    status: "Coming soon",
  },
];

export default function CatalogPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Catalog</h1>
        <p className="text-sm text-gray-500">
          Manage pricing and reference data used in estimates.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {catalogItems.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{item.title}</h2>
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  item.status === "Active"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {item.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-600">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
