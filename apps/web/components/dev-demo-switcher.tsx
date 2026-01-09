"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { demoLoginAction, type DemoRole } from "@/app/actions/demo-login";

const roles: { id: DemoRole; label: string }[] = [
  { id: "owner", label: "Owner" },
  { id: "pm", label: "PM" },
  { id: "client", label: "Client" },
];

export function DevDemoSwitcher() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogin = (role: DemoRole) => {
    startTransition(async () => {
      await demoLoginAction(role);
      router.refresh();
    });
  };

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-200 rounded-lg shadow p-3 text-sm z-50">
      <div className="font-semibold mb-2 text-yellow-900">Demo Login</div>
      <div className="flex gap-2">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => handleLogin(role.id)}
            disabled={isPending}
            className="bg-white text-yellow-900 border border-yellow-300 px-2 py-1 rounded hover:bg-yellow-50 disabled:opacity-60"
          >
            {role.label}
          </button>
        ))}
      </div>
    </div>
  );
}
