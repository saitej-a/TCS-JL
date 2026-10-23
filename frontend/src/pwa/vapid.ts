export function isValidVapidPublicKey(value: string | undefined): value is string {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) return false;
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const normalized = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  try {
    return atob(normalized).length === 65;
  } catch {
    return false;
  }
}
