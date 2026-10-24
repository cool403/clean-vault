// Exact host AND port only. No suffix matching or automatic subdomain expansion.
export function loginOrigin(raw) {
  try {
    const url = new URL(raw.includes('://') ? raw : 'https://' + raw);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}
export function matchesSite(websites, target) {
  const origin = loginOrigin(target);
  return Boolean(origin && websites.some((site) => loginOrigin(site) === origin));
}
