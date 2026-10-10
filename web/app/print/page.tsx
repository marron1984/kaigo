import { PrintView } from "@/components/views/PrintView";
import { readFilters, type SP } from "@/lib/filters";

export default async function PrintPage({ searchParams }: { searchParams: SP }) {
  return <PrintView f={readFilters(await searchParams)} />;
}
