/**
 * Lovli platform options — single source of truth shared by
 * Onboarding, Settings, and the Reply screen.
 *
 * UI shows three premium chips: Instagram / Dating platform / WhatsApp.
 * Backend stores and Claude receives the canonical snake_case values:
 *   - instagram
 *   - dating_platform
 *   - whatsapp
 *
 * Legacy users (whose preferred_platform is still 'Hinge', 'Bumble', 'Tinder',
 * or 'Other' from before this change) are gracefully mapped to 'Dating platform'
 * for display — their saved value updates to the canonical form on next save.
 */
export const PLATFORM_OPTIONS = [
  { label: 'Instagram', value: 'instagram' },
  { label: 'Dating platform', value: 'dating_platform' },
  { label: 'WhatsApp', value: 'whatsapp' },
];

export const PLATFORM_LABELS = PLATFORM_OPTIONS.map((p) => p.label);

/**
 * Convert a chip label ("Instagram" / "Dating platform" / "WhatsApp") to the
 * canonical backend value. Falls back to 'dating_platform' for safety.
 */
export function platformValueFromLabel(label) {
  const hit = PLATFORM_OPTIONS.find((p) => p.label === label);
  return hit ? hit.value : 'dating_platform';
}

/**
 * Convert a stored backend value (or any legacy label) to the chip label.
 * Used to pre-select the right chip when loading user.preferred_platform.
 */
export function platformLabelFromValue(value) {
  if (!value) return 'Instagram';
  const v = String(value).trim();
  // New canonical values
  if (v === 'instagram') return 'Instagram';
  if (v === 'whatsapp') return 'WhatsApp';
  if (v === 'dating_platform') return 'Dating platform';
  // Legacy capitalised labels
  const lower = v.toLowerCase();
  if (lower === 'instagram') return 'Instagram';
  if (lower === 'whatsapp') return 'WhatsApp';
  if (['hinge', 'bumble', 'tinder', 'aisle', 'other'].includes(lower)) {
    return 'Dating platform';
  }
  return 'Dating platform';
}
