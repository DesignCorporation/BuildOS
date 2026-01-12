// BuildOS - Dashboard Layout
// Layout with navigation for authenticated users

import Link from "next/link";
import { cookies } from "next/headers";
import { DevDemoSwitcher } from "@/components/dev-demo-switcher";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const showDevTools = process.env.NODE_ENV !== "production";
  const cookieStore = showDevTools ? await cookies() : undefined;
  const cookieRole = cookieStore?.get("demo_role")?.value;
  const roleLabel =
    cookieRole === "pm" ? "PM" : cookieRole === "client" ? "Client" : "Owner";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="md:flex">
        <aside className="hidden md:flex md:w-16 lg:w-64 md:flex-col md:justify-between md:border-r md:border-gray-200 md:bg-white">
          <div className="px-4 lg:px-6 py-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">
                B
              </div>
              <span className="hidden lg:inline text-lg font-semibold text-gray-900">
                BuildOS
              </span>
            </Link>

            <nav className="mt-10 space-y-1 text-sm">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-lg px-2 lg:px-3 py-2 text-gray-900 bg-gray-100"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center text-gray-500">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-6v6H4.5A1.5 1.5 0 0 1 3 19.5v-9Z"
                    />
                  </svg>
                </span>
                <span className="hidden lg:inline">Dashboard</span>
              </Link>
              <Link
                href="/projects"
                className="flex items-center gap-3 rounded-lg px-2 lg:px-3 py-2 text-gray-600 hover:bg-gray-50"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center text-gray-500">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 5h15a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm0 0V3.5h6V5"
                    />
                  </svg>
                </span>
                <span className="hidden lg:inline">Projects</span>
              </Link>
              <Link
                href="/catalog/work-types"
                className="flex items-center gap-3 rounded-lg px-2 lg:px-3 py-2 text-gray-600 hover:bg-gray-50"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center text-gray-500">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 6.5h16M4 12h16M4 17.5h16"
                    />
                  </svg>
                </span>
                <span className="hidden lg:inline">Catalog</span>
              </Link>
              <span className="flex items-center gap-3 rounded-lg px-2 lg:px-3 py-2 text-gray-400">
                <span className="inline-flex h-5 w-5 items-center justify-center text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7 7h10M7 11h10M7 15h6"
                    />
                  </svg>
                </span>
                <span className="hidden lg:inline">Estimates</span>
              </span>
              <span className="flex items-center gap-3 rounded-lg px-2 lg:px-3 py-2 text-gray-400">
                <span className="inline-flex h-5 w-5 items-center justify-center text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.121-6.879-2.121 2.12M8 16l-2 2m12 0-2-2M8 8 6 6"
                    />
                  </svg>
                </span>
                <span className="hidden lg:inline">Settings</span>
              </span>
            </nav>

            <div className="hidden lg:block mt-10 border-t border-gray-200 pt-6 text-xs text-gray-500 space-y-2">
              <p className="uppercase tracking-wide text-gray-400">Support</p>
              <Link href="/settings" className="block text-gray-500 hover:text-gray-700">
                Help center
              </Link>
              <Link href="/settings" className="block text-gray-500 hover:text-gray-700">
                Changelog
              </Link>
            </div>
          </div>

          <div className="px-4 lg:px-6 py-6 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                DU
              </div>
              <div className="hidden lg:block">
                <div className="text-sm font-medium text-gray-900">Demo User</div>
                <div className="text-xs text-gray-500">{roleLabel}</div>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <header className="md:hidden bg-white border-b border-gray-200">
            <div className="flex items-center justify-between px-4 py-4">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">
                  B
                </div>
                <span className="text-lg font-semibold text-gray-900">BuildOS</span>
              </Link>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span>Demo User</span>
                <span className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                  DU
                </span>
              </div>
            </div>
            <nav className="px-4 pb-4 flex gap-3 text-sm overflow-x-auto">
              <Link
                href="/dashboard"
                className="rounded-full bg-gray-100 px-3 py-1 text-gray-700"
              >
                Dashboard
              </Link>
              <Link
                href="/projects"
                className="rounded-full bg-gray-100 px-3 py-1 text-gray-700"
              >
                Projects
              </Link>
              <Link
                href="/catalog/work-types"
                className="rounded-full bg-gray-100 px-3 py-1 text-gray-700"
              >
                Catalog
              </Link>
              <span className="rounded-full bg-gray-50 px-3 py-1 text-gray-400">
                Estimates
              </span>
              <span className="rounded-full bg-gray-50 px-3 py-1 text-gray-400">
                Settings
              </span>
            </nav>
          </header>

          <main>{children}</main>
          {showDevTools && <DevDemoSwitcher />}

          <footer className="bg-white border-t border-gray-200 mt-12">
            <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-600">
              BuildOS v1.0 - Construction Management Platform
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
