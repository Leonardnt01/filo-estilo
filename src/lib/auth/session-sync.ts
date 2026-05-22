"use client";

const AUTH_EVENT_KEY = "filo_estilo_auth_event";
const LOGOUT_EVENT = "logout";
const AUTH_CHANNEL = "filo-estilo-auth-events";

function emitStorageLogoutEvent() {
  const payload = JSON.stringify({
    type: LOGOUT_EVENT,
    ts: Date.now(),
  });
  localStorage.setItem(AUTH_EVENT_KEY, payload);
}

export function broadcastLogoutEvent() {
  emitStorageLogoutEvent();
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(AUTH_CHANNEL);
    channel.postMessage({ type: LOGOUT_EVENT, ts: Date.now() });
    channel.close();
  }
}

export function subscribeToLogoutEvent(onLogout: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== AUTH_EVENT_KEY || !event.newValue) return;

    try {
      const data = JSON.parse(event.newValue);
      if (data?.type === LOGOUT_EVENT) onLogout();
    } catch {
      // Ignore malformed events.
    }
  };

  window.addEventListener("storage", onStorage);

  let channel: BroadcastChannel | null = null;
  const onChannelMessage = (event: MessageEvent) => {
    if (event.data?.type === LOGOUT_EVENT) onLogout();
  };

  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(AUTH_CHANNEL);
    channel.addEventListener("message", onChannelMessage);
  }

  return () => {
    window.removeEventListener("storage", onStorage);
    if (channel) {
      channel.removeEventListener("message", onChannelMessage);
      channel.close();
    }
  };
}

