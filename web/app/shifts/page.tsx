import { ShiftsView } from "@/components/views/ShiftsView";
import type { SP } from "@/lib/filters";

export default async function ShiftsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  return <ShiftsView month={typeof sp.month === "string" ? sp.month : undefined} />;
}
