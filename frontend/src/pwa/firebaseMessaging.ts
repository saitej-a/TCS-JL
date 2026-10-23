import type { MessagePayload, Messaging } from "firebase/messaging";

import { isValidVapidPublicKey } from "@/pwa/vapid";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const FIREBASE_APP_NAME = "tcs-joining-tracker";

export function isFirebaseMessagingConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId &&
      isValidVapidPublicKey(vapidKey),
  );
}

async function getMessagingInstance(): Promise<Messaging> {
  const [{ getApp, getApps, initializeApp }, { getMessaging, isSupported }] =
    await Promise.all([import("firebase/app"), import("firebase/messaging")]);

  if (!(await isSupported())) {
    throw new Error("Firebase Cloud Messaging is not supported in this browser.");
  }

  const app = getApps().some(({ name }) => name === FIREBASE_APP_NAME)
    ? getApp(FIREBASE_APP_NAME)
    : initializeApp(firebaseConfig, FIREBASE_APP_NAME);
  return getMessaging(app);
}

export async function getFirebaseMessagingToken(
  serviceWorkerRegistration: ServiceWorkerRegistration,
): Promise<string> {
  if (!isFirebaseMessagingConfigured()) {
    throw new Error("Firebase Messaging configuration is incomplete.");
  }
  const [{ getToken }, messaging] = await Promise.all([
    import("firebase/messaging"),
    getMessagingInstance(),
  ]);
  return getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration,
  });
}

export async function subscribeToForegroundMessages(
  serviceWorkerRegistration: ServiceWorkerRegistration,
): Promise<() => void> {
  if (
    typeof Notification === "undefined" ||
    !isFirebaseMessagingConfigured() ||
    Notification.permission !== "granted"
  ) {
    return () => undefined;
  }

  const [{ onMessage }, messaging] = await Promise.all([
    import("firebase/messaging"),
    getMessagingInstance(),
  ]);
  return onMessage(messaging, (payload) =>
    showForegroundNotification(serviceWorkerRegistration, payload),
  );
}

function showForegroundNotification(
  registration: ServiceWorkerRegistration,
  payload: MessagePayload,
): void {
  const title = payload.notification?.title ?? "TCS Joining Tracker";
  const body = payload.notification?.body ?? "";
  const data = payload.data ?? {};
  void registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag,
    data,
  });
}
