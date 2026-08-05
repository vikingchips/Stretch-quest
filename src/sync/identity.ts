/**
 * Sign-in is a name and a four-digit code. No email is ever sent.
 *
 * Supabase Auth only speaks email and password, so a name is folded into a
 * synthetic address that is never sent to — an identifier, not a mailbox.
 * This keeps real sessions, token refresh and `auth.uid()`-scoped row-level
 * security exactly as they are, which a hand-rolled name/PIN table would not.
 */

/**
 * Supabase rejects addresses whose domain does not resolve — "Email address
 * ... is invalid". Both obvious choices fail that test: RFC 2606's reserved
 * `.invalid` and any made-up name like `stretchquest.app` are NXDOMAIN.
 *
 * So the domain is not invented at all. It is the host of the Supabase
 * project itself, which resolves by definition — the app is already talking
 * to it — and needs no configuration. Nothing is ever delivered there: the
 * app has no mailer, and setup turns Supabase's confirmation mail off.
 */
export function identityDomainFor(supabaseUrl?: string, override?: string): string {
  if (override) return override;
  try {
    return new URL(supabaseUrl ?? '').host;
  } catch {
    // Only reached in a build with no credentials, where nothing signs in.
    return 'stretchquest.local';
  }
}

const IDENTITY_DOMAIN = identityDomainFor(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_IDENTITY_DOMAIN,
);

/** Supabase requires at least six characters; four digits alone are short. */
const PIN_PREFIX = 'sq-pin-';

export const PIN_LENGTH = 4;

/**
 * Fold a display name to a stable account key: lowercase, accents removed,
 * everything else collapsed to dashes.
 *
 * Names that fold together share an account — "Måns" and "mans" are the same
 * person as far as this is concerned. That is the intended trade for letting
 * people type their name however they like.
 */
export function nameToSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export function isValidName(name: string): boolean {
  return nameToSlug(name).length >= 2;
}

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin.trim());
}

/** The address Supabase stores. Never mailed, never resolved. */
export function nameToIdentity(name: string): string {
  return `${nameToSlug(name)}@${IDENTITY_DOMAIN}`;
}

export function pinToPassword(pin: string): string {
  return `${PIN_PREFIX}${pin.trim()}`;
}
