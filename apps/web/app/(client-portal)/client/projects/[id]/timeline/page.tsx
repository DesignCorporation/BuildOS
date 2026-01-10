// BuildOS - Client Project Timeline (alias to photos)

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientProjectTimelinePage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/client/projects/${id}/photos`);
}
