import { notFound } from "next/navigation";

// Any /dashboard address no page matches: the dashboard's own not-found (../not-found.tsx), inside its frame, instead of the public one.
export default function MissingDashboardPage() {
  notFound();
}
