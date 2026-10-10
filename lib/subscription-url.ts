export function getSubscriptionUrl(origin: string, key: string): string {
  if (!origin || !key) return "";
  return `${origin.replace(/\/$/, "")}/sub/${encodeURIComponent(key)}`;
}
