import type { Metadata } from "next";

import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata: Metadata = {
  title: "Admin",
  // A private dashboard must never be indexed.
  robots: { index: false, follow: false },
};

export default function AdminHackerRoute() {
  return <AdminDashboard />;
}
