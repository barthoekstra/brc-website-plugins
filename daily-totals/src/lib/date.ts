/** Helpers for the YYYYMMDD string format Trektellen uses, and JS Date interop. */

export function ymdToDate(ymd: string): Date {
  return new Date(
    Number(ymd.slice(0, 4)),
    Number(ymd.slice(4, 6)) - 1,
    Number(ymd.slice(6, 8)),
  );
}

export function dateToYmd(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** "YYYYMM" bucket key for a YYYYMMDD date. */
export function monthKey(ymd: string): string {
  return ymd.slice(0, 6);
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "20 Sep 2025" — compact label for the date navigator (no weekday). */
export function formatShort(ymd: string): string {
  if (!/^\d{8}$/.test(ymd)) return ymd;
  const d = ymdToDate(ymd);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}
