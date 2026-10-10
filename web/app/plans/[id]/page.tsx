import { PlanView } from "@/components/views/PlanView";

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  return <PlanView id={decodeURIComponent((await params).id)} />;
}
