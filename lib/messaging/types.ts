/** Shared types for the internal MT Store messenger. */

export type MessageKind = "text" | "order" | "image" | "video" | "audio" | "file";

export type OrderLine = {
  productId: string;
  title: string;
  image?: string;
  url?: string;
  options?: Record<string, string>;
  quantity: number;
  price: number;
  currency: string;
};

export type OrderPayload = {
  /** Human-readable reference shown to both sides. */
  reference: string;
  lines: OrderLine[];
  totals: Record<string, number>;
  currency: string;
};

export type Attachment = {
  url: string;
  name: string;
  contentType: string;
  size: number;
};

export type PublicMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: "customer" | "admin";
  senderName: string;
  senderPhoto?: string;
  kind: MessageKind;
  text: string;
  attachment?: Attachment;
  order?: OrderPayload;
  /** Server time the message was written. */
  createdAt: string;
  /** When the other side's device fetched it. */
  deliveredAt: string | null;
  readAt: string | null;
};

export type ConversationCustomer = {
  uid: string;
  name: string;
  email?: string;
  phone?: string;
  photoURL?: string;
  address?: string;
};

export type PublicConversation = {
  id: string;
  customer: ConversationCustomer;
  lastMessage: {
    text: string;
    at: string | null;
    senderRole: "customer" | "admin";
    kind: MessageKind;
  };
  unreadForAdmin: number;
  unreadForCustomer: number;
  /** True when the newest message came from the customer (admin owes a reply). */
  awaitingAdminReply: boolean;
  messageCount: number;
  adminReadAt: string | null;
  customerReadAt: string | null;
  updatedAt: string | null;
  lastActiveAt: string | null;
};

export type AdminStats = {
  conversations: number;
  customers: number;
  messages: number;
  unread: number;
  awaitingReply: number;
  active: number;
  today: number;
};

export type AdminPermissions = {
  email: string;
  role: "admin";
  allowedConversationIds: "all";
};
