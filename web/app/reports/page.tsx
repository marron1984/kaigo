import { ReportsView } from "@/components/views/ReportsView";
import type { SP } from "@/lib/filters";

export default async function ReportsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  return <ReportsView month={typeof sp.month === "string" ? sp.month : undefined} />;
}
