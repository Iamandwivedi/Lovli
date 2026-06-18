// Returns YYYY-MM-DD in the device's local timezone
export function localDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Returns IANA timezone string e.g. "Asia/Kolkata"
export function ianaTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
