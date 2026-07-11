/**
 * Temporary compatibility shim for the pre-pilot success page.
 *
 * Payment state is webhook-authoritative and persisted in Postgres. This
 * function deliberately does nothing; remove this file when the frontend
 * switches to the read-only checkout-status endpoint.
 */
export function markPaid(_stripeSessionId: string): void {}
