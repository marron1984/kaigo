import { RecordView } from "@/components/views/RecordView";

export default async function RecordPage({ params }: { params: Promise<{ no: string }> }) {
  return <RecordView no={decodeURIComponent((await params).no)} />;
}
