"use server";

import { cookies } from "next/headers";

const ALLOWED_ROLES = ["owner", "pm", "client"] as const;
export type DemoRole = (typeof ALLOWED_ROLES)[number];

export async function demoLoginAction(role: DemoRole) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Demo login is disabled in production");
  }

  if (!ALLOWED_ROLES.includes(role)) {
    throw new Error("Invalid demo role");
  }

  const cookieStore = await cookies();
  cookieStore.set("demo_role", role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}
