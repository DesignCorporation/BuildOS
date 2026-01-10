// BuildOS - Client Portal Unauthorized (403)

export default function ClientUnauthorizedPage() {
  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-8 text-center">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Access denied</h1>
      <p className="text-gray-600">
        You do not have permission to view this page. Please contact your company
        administrator if you believe this is a mistake.
      </p>
    </div>
  );
}
