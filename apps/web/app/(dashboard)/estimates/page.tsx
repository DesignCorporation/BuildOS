// BuildOS - Estimates page (placeholder)

import Link from "next/link";

export default function EstimatesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Estimates</h1>
        <p className="text-sm text-muted-foreground">
          Estimates live under each project for now.
        </p>
      </div>
      <Link
        href="/projects"
        className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
      >
        Go to projects
      </Link>
    </div>
  );
}
