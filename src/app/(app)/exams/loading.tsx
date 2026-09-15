import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function Loading() {
  return <PageSkeleton maxWidth="2xl" variant="list" rows={4} />;
}
