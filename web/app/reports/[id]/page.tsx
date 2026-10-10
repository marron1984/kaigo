import { ReportView } from "@/components/views/ReportView";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  return <ReportView id={decodeURIComponent((await params).id)} />;
}
