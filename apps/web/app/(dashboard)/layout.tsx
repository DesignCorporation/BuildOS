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
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/projects" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">
                B
              </div>
              <span className="text-xl font-bold text-gray-900">BuildOS</span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-6">
              <Link
                href="/projects"
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                Projects
              </Link>
              <Link
                href="/estimates"
                className="text-gray-400 cursor-not-allowed"
                aria-disabled="true"
              >
                Estimates
              </Link>
              <Link
                href="/settings"
                className="text-gray-400 cursor-not-allowed"
                aria-disabled="true"
              >
                Settings
              </Link>
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Demo User ({roleLabel})
              </div>
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-medium">
                DU
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>
      {showDevTools && <DevDemoSwitcher />}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-600">
          BuildOS v1.0 - Construction Management Platform
        </div>
      </footer>
    </div>
  );
}
