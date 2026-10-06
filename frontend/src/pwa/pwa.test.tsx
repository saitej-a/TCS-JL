/**
 * PWA suite (§10.1, Task 8).
 *
 * The plan's `fails_when` conditions are asserted here: the registration body
 * carries an FCM token + FIREBASE_WEB device type, `requestPermission` fires only after
 * the primer's "Enable Alerts", a denied permission never re-prompts, the
 * offline banner tracks the browser's events, and the install banner needs a
 * real trigger (never the first visit).
 *
 * No mocking library (D8): the native APIs are stubbed by hand on `window` /
 * `navigator`, and the API layer goes through the shared routed adapter, so the
 * POST body under test is the one the real axios client sends.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const firebasePushMocks = vi.hoisted(() => ({
  isConfigured: vi.fn(),
  getToken: vi.fn(),
}));

vi.mock("@/pwa/firebaseMessaging", () => ({
  isFirebaseMessagingConfigured: firebasePushMocks.isConfigured,
  getFirebaseMessagingToken: firebasePushMocks.getToken,
}));

import { OfflineBanner } from "@/pwa/OfflineBanner";
import { InstallPrompt } from "@/pwa/InstallPrompt";
import { isValidVapidPublicKey } from "@/pwa/vapid";
import {
  ACCOUNT_CREATED_KEY,
  INSTALL_DISMISSED_KEY,
  MILESTONE_ADDED_KEY,
  VISIT_DATES_KEY,
  installTriggerMet,
  recordCommunityVisit,
} from "@/pwa/installSignals";
import { PushPrimer, PRIMER_SESSION_KEY, primerDismissedThisSession } from "@/pwa/PushPrimer";
import {
  PUSH_DENIED_FLAG,
  describeBrowser,
  isPushDenied,
  markPushDenied,
  subscribeToPush,
} from "@/pwa/pushClient";
import { resolveClickAction, SW_URL } from "@/pwa/registerSW";
import { routeAdapter } from "@/test/axiosTestHelper";

function mockNotification(
  permission: NotificationPermission = "default",
  /** What `requestPermission()` resolves to (defaults to the current state). */
  resolves: NotificationPermission = permission,
): ReturnType<typeof vi.fn> {
  const requestPermission = vi.fn(async () => resolves);
  class FakeNotification {}
  Object.assign(FakeNotification, { permission, requestPermission });
  vi.stubGlobal("Notification", FakeNotification);
  return requestPermission;
}

/** `requestPermission()` throwing (a locked-down or non-promptable context). */
function mockNotificationRejecting(): ReturnType<typeof vi.fn> {
  const requestPermission = vi.fn(async () => {
    throw new TypeError("permission request unavailable");
  });
  class FakeNotification {}
  Object.assign(FakeNotification, { permission: "default", requestPermission });
  vi.stubGlobal("Notification", FakeNotification);
  return requestPermission;
}

function mockServiceWorker(): {
  register: ReturnType<typeof vi.fn>;
  registration: object;
} {
  const registration = {
    pushManager: {},
  };
  const register = vi.fn(async () => registration);
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      register,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  });
  return { register, registration };
}

function setOnline(online: boolean): void {
  Object.defineProperty(navigator, "onLine", { configurable: true, value: online });
}

/** The device registration response. */
function deviceRoutes(deviceStatus = 201) {
  return routeAdapter([
    { url: "/devices/", answers: [{ status: deviceStatus, data: { id: "d1" } }] },
  ]);
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  setOnline(true);
  vi.stubGlobal("PushManager", function PushManagerStub() {});
  firebasePushMocks.isConfigured.mockReturnValue(true);
  firebasePushMocks.getToken.mockResolvedValue("firebase-web-registration-token");
  mockNotification("default");
  mockServiceWorker();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("§10.1 service worker and connectivity", () => {
  it("registers the generated worker at the site root", async () => {
    mockNotification("granted");
    deviceRoutes();
    const { register } = mockServiceWorker();

    await expect(subscribeToPush()).resolves.toBe("subscribed");
    // The URL is the plugin's worker (build: /sw.js; dev: /dev-sw.js?dev-sw).
    expect(register).toHaveBeenCalledWith(SW_URL, { scope: "/" });
  });

  it("shows the offline banner only while the browser reports offline", async () => {
    setOnline(true);
    render(<OfflineBanner />);
    expect(screen.queryByTestId("offline-banner")).not.toBeInTheDocument();

    setOnline(false);
    window.dispatchEvent(new Event("offline"));
    const banner = await screen.findByTestId("offline-banner");
    // Phase 12 (PWA-states composition) split the line and dropped the v1
    // "Actions will sync when online" promise — this app has no Background
    // Sync queue, so the copy now states what is actually true.
    expect(banner).toHaveTextContent("Offline mode.");
    expect(banner).toHaveTextContent(
      "Showing cached data. Changes you make now are not saved until you reconnect.",
    );
    expect(banner).not.toHaveTextContent("sync when online");

    setOnline(true);
    window.dispatchEvent(new Event("online"));
    await waitFor(() => {
      expect(screen.queryByTestId("offline-banner")).not.toBeInTheDocument();
    });
  });
});

describe("§10.1 push subscription", () => {
  it("accepts a valid 65-byte VAPID key and rejects placeholders or malformed values", () => {
    const validKey = "B" + "Q".repeat(86);
    expect(isValidVapidPublicKey(validKey)).toBe(true);
    expect(isValidVapidPublicKey("replace-with-the-firebase-web-push-public-key")).toBe(false);
    expect(isValidVapidPublicKey("!not-base64url!")).toBe(false);
    expect(isValidVapidPublicKey(undefined)).toBe(false);
  });

  it("registers a Firebase web token as a FIREBASE_WEB device", async () => {
    const { calls } = deviceRoutes();
    mockNotification("granted");
    const { register, registration } = mockServiceWorker();
    const requestPermission = mockNotification("granted");

    await expect(subscribeToPush()).resolves.toBe("subscribed");

    // Never call the native prompt when permission was already granted.
    expect(requestPermission).not.toHaveBeenCalled();
    expect(firebasePushMocks.getToken).toHaveBeenCalledWith(registration);
    expect(register).toHaveBeenCalledWith(SW_URL, { scope: "/" });

    // The FCM token is write-only and identifies the Firebase browser device.
    const deviceCall = calls.find(
      (call) => String(call.url).includes("/devices/") && call.method?.toLowerCase() === "post",
    );
    const body = JSON.parse(String(deviceCall?.data)) as Record<string, unknown>;
    expect(body.device_type).toBe("FIREBASE_WEB");
    expect(body.fcm_token).toBe("firebase-web-registration-token");
    expect(body.browser).toBe("Browser");
  });

  it("asks for permission only when the primer's Enable Alerts is pressed", async () => {
    // Not yet granted — the prompt only becomes reachable through the primer.
    const requestPermission = mockNotification("default", "granted");
    deviceRoutes();
    const onClose = vi.fn();

    const { unmount } = render(<PushPrimer open onClose={onClose} />);
    expect(requestPermission).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId("primer-dismiss"));
    expect(requestPermission).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledWith(null);

    unmount();
    render(<PushPrimer open onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Enable Alerts" }));
    await waitFor(() => {
      expect(requestPermission).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledWith("subscribed");
    });
  });

  it("does not ask for permission when Firebase build config is incomplete", async () => {
    firebasePushMocks.isConfigured.mockReturnValue(false);
    const requestPermission = mockNotification("granted");

    await expect(subscribeToPush()).resolves.toBe("unconfigured");
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("never re-prompts after a denial, on this load or the next", async () => {
    // A `default` origin answering "denied" — the one case where the prompt is
    // the only way to learn the answer.
    const requestPermission = mockNotification("default", "denied");
    deviceRoutes();

    await expect(subscribeToPush()).resolves.toBe("denied");
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(isPushDenied()).toBe(true);
    expect(localStorage.getItem(PUSH_DENIED_FLAG)).toBe("1");

    // A later load: the stored denial short-circuits before any prompt.
    mockNotification("default");
    const laterPrompt = mockNotification("default");
    await expect(subscribeToPush()).resolves.toBe("denied");
    expect(laterPrompt).not.toHaveBeenCalled();
  });

  it("treats an already-denied origin as the answer instead of asking again", async () => {
    // Deliberate supersession (9.4 F-94-2): this assertion used to read
    // `toHaveBeenCalledTimes(1)`. In a real browser `requestPermission()` on an
    // origin that is already blocked may never settle — the jsdom stub resolved
    // instantly, so the suite stayed green while the live primer wedged, with the
    // denial unpersisted and the modal's button disabled forever.
    const requestPermission = mockNotification("denied");
    deviceRoutes();

    await expect(subscribeToPush()).resolves.toBe("denied");
    expect(requestPermission).not.toHaveBeenCalled();
    expect(isPushDenied()).toBe(true);
    expect(localStorage.getItem(PUSH_DENIED_FLAG)).toBe("1");
  });

  it("closes the primer on a blocked origin rather than leaving it disabled", async () => {
    const requestPermission = mockNotification("denied");
    deviceRoutes();
    const onClose = vi.fn();

    render(<PushPrimer open onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Enable Alerts" }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledWith("denied");
    });
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("reports a failed ask without recording a decision the user never made", async () => {
    const requestPermission = mockNotificationRejecting();
    deviceRoutes();
    const onClose = vi.fn();

    render(<PushPrimer open onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Enable Alerts" }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledWith("failed");
    });
    expect(requestPermission).toHaveBeenCalledTimes(1);
    // Nothing was persisted: an ask that threw is not a refusal, so a later
    // session may legitimately offer the primer again.
    expect(isPushDenied()).toBe(false);
  });

  it("reports unsupported browsers instead of throwing", async () => {
    // No PushManager — Firebase Messaging cannot create a browser subscription.
    Reflect.deleteProperty(window, "PushManager");

    await expect(subscribeToPush()).resolves.toBe("unsupported");
  });

  it("labels the device with a bounded browser name", () => {
    expect(describeBrowser("Mozilla/5.0 Firefox/131.0")).toBe("Firefox");
    expect(describeBrowser("")).toBe("Browser");
    expect(describeBrowser("x".repeat(500)).length).toBeLessThanOrEqual(64);
  });

  it("routes a push click to an in-app path and refuses anything else", () => {
    expect(resolveClickAction("/community/posts/p1")).toBe("/community/posts/p1");
    expect(resolveClickAction("/dashboard")).toBe("/dashboard");
    // No target, junk, protocol-relative and absolute URLs all land home.
    expect(resolveClickAction(undefined)).toBe("/dashboard");
    expect(resolveClickAction("")).toBe("/dashboard");
    expect(resolveClickAction("//evil.example")).toBe("/dashboard");
    expect(resolveClickAction("https://evil.example/x")).toBe("/dashboard");
  });
});

describe("§10.1 install promotion", () => {
  function fireInstallEvent(outcome: "accepted" | "dismissed" = "dismissed"): void {
    const event = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string }>;
    };
    event.prompt = vi.fn(async () => undefined);
    event.userChoice = Promise.resolve({ outcome });
    window.dispatchEvent(event);
  }

  it("stays hidden on a first visit, with no trigger recorded", async () => {
    render(<InstallPrompt />);
    fireInstallEvent();
    await waitFor(() => {
      expect(screen.queryByTestId("install-prompt")).not.toBeInTheDocument();
    });
    expect(installTriggerMet()).toBe(false);
  });

  it("promotes after an account is created and a milestone is added", async () => {
    localStorage.setItem(ACCOUNT_CREATED_KEY, "1");
    localStorage.setItem(MILESTONE_ADDED_KEY, "1");
    render(<InstallPrompt />);
    fireInstallEvent();

    expect(await screen.findByTestId("install-prompt")).toHaveTextContent("Install TJT Tracker");
    expect(screen.getByText("Install App")).toBeInTheDocument();
    expect(screen.getByText("Not now")).toBeInTheDocument();
  });

  it("promotes after the community is visited on two distinct days", async () => {
    recordCommunityVisit("2026-09-01");
    expect(installTriggerMet()).toBe(false); // one day is not enough
    recordCommunityVisit("2026-09-02");
    expect(installTriggerMet()).toBe(true);
    // Re-visiting the same day does not multiply the signal.
    recordCommunityVisit("2026-09-02");
    expect(JSON.parse(localStorage.getItem(VISIT_DATES_KEY) ?? "[]")).toEqual([
      "2026-09-01",
      "2026-09-02",
    ]);

    render(<InstallPrompt />);
    fireInstallEvent();
    expect(await screen.findByTestId("install-prompt")).toBeInTheDocument();
  });

  it("never offers an install it cannot perform", async () => {
    localStorage.setItem(ACCOUNT_CREATED_KEY, "1");
    localStorage.setItem(MILESTONE_ADDED_KEY, "1");
    render(<InstallPrompt />);
    // No beforeinstallprompt captured: the trigger alone is not enough.
    expect(screen.queryByTestId("install-prompt")).not.toBeInTheDocument();
  });

  it('treats "Not now" as final and persists it', async () => {
    localStorage.setItem(ACCOUNT_CREATED_KEY, "1");
    localStorage.setItem(MILESTONE_ADDED_KEY, "1");
    const { unmount } = render(<InstallPrompt />);
    fireInstallEvent();
    await screen.findByTestId("install-prompt");

    await userEvent.click(screen.getByTestId("install-dismiss"));
    expect(screen.queryByTestId("install-prompt")).not.toBeInTheDocument();
    expect(localStorage.getItem(INSTALL_DISMISSED_KEY)).toBe("1");

    // A fresh mount on the same device stays quiet.
    unmount();
    render(<InstallPrompt />);
    fireInstallEvent();
    await waitFor(() => {
      expect(screen.queryByTestId("install-prompt")).not.toBeInTheDocument();
    });
  });
});

describe("§10.1 primer session memory", () => {
  it("dismisses for the session, not forever", () => {
    expect(primerDismissedThisSession()).toBe(false);
    sessionStorage.setItem(PRIMER_SESSION_KEY, "1");
    expect(primerDismissedThisSession()).toBe(true);
    // A persisted denial is a different, permanent state.
    expect(isPushDenied()).toBe(false);
    markPushDenied();
    expect(isPushDenied()).toBe(true);
  });
});
