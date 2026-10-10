import { StaffShiftView } from "@/components/views/StaffShiftView";
import type { SP } from "@/lib/filters";

export default async function StaffShiftPage({ params, searchParams }: { params: Promise<{ staffId: string }>; searchParams: SP }) {
  const sp = await searchParams;
  return <StaffShiftView staffId={decodeURIComponent((await params).staffId)} month={typeof sp.month === "string" ? sp.month : undefined} />;
}
