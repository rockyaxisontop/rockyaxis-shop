import type { Metadata } from "next";

import { MessagePage } from "@/components/messaging/message-page";

export const metadata: Metadata = {
  title: "Chat with MT Store",
  robots: { index: false, follow: false },
};

export default function MessageRoute() {
  return <MessagePage />;
}
