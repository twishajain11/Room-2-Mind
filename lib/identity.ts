/**
 * The whole of identity in this product.
 *
 * A handle is a random string generated in the browser and kept in
 * localStorage. There is no account, no email, no password, and no way to
 * recover it, which is the point: it exists so that a person's own sessions can
 * be linked to each other for the n-of-1 fit, and for nothing else. §12 puts
 * authentication beyond a handle out of scope.
 */

const KEY = "rtm:handle";

function randomHandle(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes)
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 14);
  return `rtm-${body}`;
}

/** The handle for this browser, created on first use. */
export function getHandle(): string {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing && /^[a-z0-9-]{6,40}$/.test(existing)) return existing;
    const fresh = randomHandle();
    localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    // Private windows and blocked site data: fall back to a handle that lives
    // only for this page, so a response is still storable.
    return randomHandle();
  }
}
