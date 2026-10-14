// Sign-in return addresses are managed by Lovable and only allow the Lovable site.
// Other hosts (poolabs.in, Vercel) return through /auth/relay on the Lovable site,
// which hands the sign-in back to the site the visitor started on.
export const RELAY_ORIGIN = "https://castplay-showcase-spark.lovable.app";

// Only these sites may receive a relayed sign-in — never an arbitrary address.
export const RELAY_TARGETS = [
  "https://www.poolabs.in",
  "https://poolabs.in",
  "https://remix-of-tiny-cast-landing3.vercel.app",
];

export function oauthRedirectTo(): string {
  const origin = window.location.origin;
  if (RELAY_TARGETS.includes(origin)) {
    return `${RELAY_ORIGIN}/auth/relay?to=${encodeURIComponent(origin)}`;
  }
  return origin;
}
