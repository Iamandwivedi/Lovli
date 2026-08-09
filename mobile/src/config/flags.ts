// Lovli feature flags.
// Keep this file flat and obvious — no env wiring yet.

export const flags = {
  /**
   * When false: paywall sheet renders for upsell but the purchase button is disabled
   * and shows "Coming soon". RevenueCat / IAP are NOT initialised.
   * Flip to true only when payments are ready to go live in a future PR.
   */
  PAYMENTS_ENABLED: false,

  /**
   * PR-M6: "Your style" personalization UI (learned-preferences screen,
   * feedback chips, "Sounds like you" pill). Event CAPTURE is always on and
   * invisible — this flag only gates the new surfaces.
   */
  MEMORY_UI_ENABLED: true,
} as const;
