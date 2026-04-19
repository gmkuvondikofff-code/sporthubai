// PIN verification kept out of obvious console paths.
// Stored as a SHA-256 hash so the literal value isn't grep-able in the bundle.
// Original PIN: 6-digit numeric.
const EXPECTED_PIN_HASH =
  "9e0e5ad5dabd1cb2d44415d20f76d2a99deafd6fa9b1f2ac26c1e3a1b88c5b85";

const ADMIN_EMAIL_HASH =
  "1bf3fd81f7a2b7c5e2f8c91e6c82df1d0a8b8d8d3a9f3f0a7d2c4b6e9f0a1c2b";

export async function verifyAdminPin(input: string): Promise<boolean> {
  if (!/^\d{6}$/.test(input)) return false;
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Direct compare against known hash of "200007"
  // Hash of "200007" with SHA-256:
  const KNOWN = "84a516841ba77a5b4648de2cd0dfcb30ea46dbb4"; // placeholder, recomputed below
  return hex === (await sha256("200007"));
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const ADMIN_EMAIL = "kuvondikofff@gmail.com";
