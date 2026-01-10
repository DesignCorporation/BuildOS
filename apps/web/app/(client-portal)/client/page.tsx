// BuildOS - Client Portal Root

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ClientRootPage() {
  redirect("/client/projects");
}
