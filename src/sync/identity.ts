/**
 * Sign-in is a name and a four-digit code. No email is ever sent.
 *
 * Supabase Auth only speaks email and password, so a name is folded into a
 * synthetic address that is never sent to — an identifier, not a mailbox.
 * This keeps real sessions, token refresh and `auth.uid()`-scoped row-level
 * security exactly as they are, which a hand-rolled name/PIN table would not.
 */

/**
 * Supabase validates the top-level domain against real TLDs, so the reserved
 * `.invalid` from RFC 2606 — the semantically correct choice — is rejected
 * outright with "Email address ... is invalid". A valid TLD it is.
 *
 * Nothing is ever sent here: the app has no mailer, and setup requires
 * "Confirm email" to be off, so Supabase does not send anything either.
 * Overridable in case a project's validation is stricter still.
 */
const IDENTITY_DOMAIN = import.meta.env.VITE_IDENTITY_DOMAIN ?? 'stretchquest.app';

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
