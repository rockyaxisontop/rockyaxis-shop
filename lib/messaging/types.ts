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
  /** Seconds, for audio messages. */
  duration?: number;
};

/** Snapshot of the message being replied to, so the quote survives edits. */
export type ReplyPreview = {
  messageId: string;
  senderName: string;
  kind: MessageKind;
  snippet: string;
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
  /** Set when this message replies to another. */
  replyTo?: ReplyPreview;
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

/** Everything the admin panel shows about one customer. */
export type AdminCustomerProfile = {
  uid: string;
  conversation: PublicConversation;
  profile: {
    fullName: string;
    email: string | null;
    phoneNumber: string;
    buildingStreet: string;
    locality: string;
    region: string;
    city: string;
    area: string;
    address: string;
    label: string;
    birthday: string;
    gender: string;
    photoURL: string | null;
    coordinates: { latitude: number; longitude: number } | null;
    role: string;
    createdAt: string | null;
  };
  orders: Array<{
    id: string;
    reference: string;
    total: number;
    currency: string;
    itemCount: number;
    createdAt: string | null;
  }>;
};
