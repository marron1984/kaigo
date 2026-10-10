import { RecordsView } from "@/components/views/RecordsView";
import { readFilters, type SP } from "@/lib/filters";

export default async function RecordsPage({ searchParams }: { searchParams: SP }) {
  return <RecordsView f={readFilters(await searchParams)} />;
}
