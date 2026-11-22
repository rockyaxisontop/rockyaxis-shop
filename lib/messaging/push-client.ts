"use client";

import { getToken, isSupported, onMessage } from "firebase/messaging";
import { getMessaging, type Messaging } from "firebase/messaging";

import { firebaseApp } from "@/lib/firebase/client";

/**
 * Web-push registration for the internal messenger.
 *
 * The VAPID key identifies this sender to the browser's push service; without it
 * Chrome/Firefox refuse to issue a token. It is a public value (it ships in the
 * client bundle), so it lives in .env.local as NEXT_PUBLIC_*.
 */
const VAPID_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ??
  "BOHiiGCOhZPG9-ljPf9No8eUNLfhUYs9GSmW4H6YEpCU5t9HZ8J70EquZTy8E_75LhhTTckbgYaq-qH4AqBsI1c";

const SW_PATH = "/firebase-messaging-sw.js";

let messaging: Messaging | null = null;

function getClientMessaging() {
  if (messaging) return messaging;
  messaging = getMessaging(firebaseApp);
  return messaging;
}

export type PushStatus = "unsupported" | "default" | "granted" | "denied";

/** Current permission state, without asking for anything. */
export async function getPushStatus(): Promise<PushStatus> {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
  try {
    if (!(await isSupported())) return "unsupported";
  } catch {
    return "unsupported";
  }
  return Notification.permission as PushStatus;
}

/**
 * Asks for permission, registers the FCM worker and stores the token server-side.
 *
 * Must be called from a user gesture (a click): browsers reject permission
 * prompts that appear without one, and Safari especially requires it.
 */
export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === "undefined") return { ok: false, error: "Not available here." };

  if (!(await isSupported().catch(() => false))) {
    return { ok: false, error: "This browser doesn't support notifications." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, error: "Notifications were blocked in your browser settings." };
  }

  const registration = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
  await navigator.serviceWorker.ready;

  const token = await getToken(getClientMessaging(), {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  if (!token) return { ok: false, error: "Couldn't get a notification token." };

  // Save it through our API: the server decides admin vs customer placement.
  const { auth } = await import("@/lib/firebase/client");
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) return { ok: false, error: "Sign in first." };

  const response = await fetch("/api/messages/device-token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ token }),
  });
  if (!response.ok) return { ok: false, error: "Couldn't save your notification settings." };

  localStorage.setItem("mt-store:push-token", token);
  return { ok: true };
}

/** Stops notifications for this device (called on sign-out). */
export async function disablePush(): Promise<void> {
  if (typeof window === "undefined") return;
  const token = localStorage.getItem("mt-store:push-token");
  if (!token) return;

  try {
    const { auth } = await import("@/lib/firebase/client");
    const idToken = await auth.currentUser?.getIdToken();
    if (idToken) {
      await fetch("/api/messages/device-token", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ token }),
      });
    }
  } catch {
    /* best effort */
  }
  localStorage.removeItem("mt-store:push-token");
}

const ASKED_KEY = "mt-store:push-asked";

/**
 * One-time permission request, used when a customer first opens /message.
 *
 * Browsers ignore (or permanently block) prompts that fire without a gesture,
 * so this runs on the first *tap* in the page — any click counts. It asks once
 * per device: the answer, granted or denied, is remembered.
 *
 * `onSettled` fires when the prompt has been answered (or skipped). The install
 * banner waits for it, so a customer never gets two banners at once.
 */
export function askForPushOnce(onSettled?: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  let done = false;
  const finish = () => {
    try {
      onSettled?.();
    } catch {
      /* ignore */
    }
  };

  const tryAsk = async () => {
    if (done) return;
    done = true;
    cleanup();

    try {
      if (localStorage.getItem(ASKED_KEY)) return;
      const status = await getPushStatus();
      if (status !== "default") return;
      localStorage.setItem(ASKED_KEY, "1");
      await enablePush();
    } catch {
      /* never block the chat over a permission prompt */
    } finally {
      finish();
    }
  };

  const cleanup = () => {
    window.removeEventListener("pointerdown", tryAsk);
    window.removeEventListener("keydown", tryAsk);
  };

  window.addEventListener("pointerdown", tryAsk, { once: true });
  window.addEventListener("keydown", tryAsk, { once: true });

  return cleanup;
}

/**
 * Foreground pushes: when the tab is focused the browser shows nothing, so we
 * forward the payload to the page to refresh in place.
 */
export function listenForegroundPush(onPayload: (data: { title: string; body: string; url: string }) => void) {
  let unsubscribe: (() => void) | null = null;
  isSupported()
    .then((supported) => {
      if (!supported) return;
      unsubscribe = onMessage(getClientMessaging(), (payload) => {
        onPayload({
          title: payload.notification?.title ?? "MT Store",
          body: payload.notification?.body ?? "",
          url: payload.data?.url ?? "/message",
        });
      });
    })
    .catch(() => { });
  return () => unsubscribe?.();
}
