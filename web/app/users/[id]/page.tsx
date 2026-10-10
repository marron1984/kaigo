import { UserView } from "@/components/views/UserView";
import type { SP } from "@/lib/filters";

export default async function UserPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const sp = await searchParams;
  return <UserView id={decodeURIComponent((await params).id)} month={typeof sp.month === "string" ? sp.month : undefined} />;
}
