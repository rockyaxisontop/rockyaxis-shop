import type { Metadata } from "next";

import { ProfilePage } from "@/components/profile-page";

export const metadata: Metadata = { title: "Your Profile" };

export default function ProfileRoute() {
  return <ProfilePage />;
}