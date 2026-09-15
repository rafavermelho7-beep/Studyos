import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function Loading() {
  return <PageSkeleton maxWidth="4xl" variant="grid" rows={6} />;
}
