import { SummaryView } from "@/components/views/SummaryView";
import type { SP } from "@/lib/filters";

export default async function SummaryPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  return <SummaryView month={typeof sp.month === "string" ? sp.month : undefined} />;
}
