/**
 * Trektellen data layer.
 *
 * Trektellen exposes daily counts only as a JSONP endpoint that returns a blob
 * of legacy HTML (`{ count: "<div id=left_content>...</div>" }`). This module
 * wraps that endpoint and parses the HTML into clean, typed data so the React
 * UI never has to touch the markup.
 *
 * Key facts established about the endpoint:
 *  - It honours a custom `?callback=` parameter, so we can do safe JSONP.
 *  - A date with no count returns the literal text `wrong date` (invalid JSONP).
 *    We avoid ever requesting such dates by only navigating to days we already
 *    know are available (the month <select> is the master index of months with
 *    data; the day-links within a month are the days with data).
 */

export interface SpeciesRow {
  /** Trektellen species id (stable across days). */
  id: string;
  name: string;
  /** Birds counted heading south (the main migration direction in autumn). */
  south: number | null;
  /** Birds counted heading north (local movement / reverse migration). */
  north: number | null;
  /** Bold in the source = notable observation (scarce/rare or large number). */
  notable: boolean;
}

export interface MonthOption {
  /** A real counted date in that month, used to (re)load it. */
  value: string; // YYYYMMDD
  label: string; // e.g. "September 2025"
  year: number;
  month: number; // 1-12
}

export interface CountTotals {
  individuals: number | null;
  species: number | null;
  hours: string | null; // e.g. "11:28"
}

export interface CountData {
  site: string;
  siteName: string; // e.g. "Sakhalvasho"
  /** Human label from the source heading, e.g. "Saturday 20 September 2025". */
  dateLabel: string;
  /** Resolved date of this count, YYYYMMDD. */
  date: string;
  period: string | null; // "07:38 - 19:06"
  countType: string | null; // "Storks and raptors"
  weather: string | null;
  observers: string[];
  comments: string | null;
  species: SpeciesRow[];
  totals: CountTotals;
  /** All months that have data (from the <select>). */
  months: MonthOption[];
  /** All days with a count in the loaded month, YYYYMMDD, ascending. */
  availableDays: string[];
}

const BASE = "https://trektellen.org/count/view";
const LANG = "english";

/* ------------------------------------------------------------------ JSONP */

let jsonpCounter = 0;

function jsonp<T = unknown>(url: string, timeoutMs = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const cb = `__brc_tt_cb_${jsonpCounter++}`;
    const sep = url.includes("?") ? "&" : "?";
    const script = document.createElement("script");
    let timer: number;

    const cleanup = () => {
      delete (window as unknown as Record<string, unknown>)[cb];
      script.onerror = null;
      script.remove();
      window.clearTimeout(timer);
    };

    (window as unknown as Record<string, (data: T) => void>)[cb] = (data) => {
      cleanup();
      resolve(data);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error(`JSONP request failed: ${url}`));
    };
    timer = window.setTimeout(() => {
      cleanup();
      reject(new Error(`JSONP timeout: ${url}`));
    }, timeoutMs);

    script.src = `${url}${sep}callback=${cb}`;
    document.body.appendChild(script);
  });
}

/* ----------------------------------------------------------------- helpers */

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/** Parse a count value that may use "." or "," as a thousands separator. */
function parseNum(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const t = raw.replace(/ /g, "").trim();
  if (!t || t === "-") return null;
  const n = parseInt(t.replace(/[.,\s]/g, ""), 10);
  return Number.isNaN(n) ? null : n;
}

/** "Saturday 20 September 2025" -> "20250920". */
function dateLabelToYmd(label: string): string {
  const m = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(label);
  if (!m) return "";
  const mi = MONTHS.indexOf(m[2].toLowerCase());
  if (mi < 0) return "";
  return `${m[3]}${String(mi + 1).padStart(2, "0")}${m[1].padStart(2, "0")}`;
}

/** Text content that follows a labelled <span> up to the next <br>. */
function fieldAfter(span: Element | null): string | null {
  if (!span) return null;
  let node: ChildNode | null = span.nextSibling;
  let text = "";
  while (node) {
    if (node.nodeType === 1 && /^br$/i.test((node as Element).tagName)) break;
    text += node.textContent ?? "";
    node = node.nextSibling;
  }
  const trimmed = text.replace(/ /g, " ").trim();
  return trimmed || null;
}

/* ------------------------------------------------------------------ parser */

function parseCount(
  html: string,
  site: string,
  requestedDate: string,
): CountData | null {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const root = doc.getElementById("left_content");
  if (!root) return null;

  // Months that have data.
  const months: MonthOption[] = [];
  root.querySelectorAll("select option").forEach((o) => {
    const v = o.getAttribute("value") ?? "";
    if (/^\d{8}$/.test(v)) {
      months.push({
        value: v,
        label: o.textContent?.trim() ?? "",
        year: Number(v.slice(0, 4)),
        month: Number(v.slice(4, 6)),
      });
    }
  });

  // Days with a count in the loaded month (the day-links).
  const dayset = new Set<string>();
  root.querySelectorAll('a[onclick*="trektellen_get_count"]').forEach((a) => {
    const m = /trektellen_get_count\('(\d{8})'/.exec(
      a.getAttribute("onclick") ?? "",
    );
    if (m) dayset.add(m[1]);
  });

  // Heading: "Site name<br>Weekday DD Month YYYY".
  const h1 = root.querySelector("h1.left");
  let siteName = "";
  let dateLabel = "";
  if (h1) {
    const parts = (h1.innerHTML ?? "").split(/<br\s*\/?>/i);
    const tmp = document.createElement("div");
    tmp.innerHTML = parts[0] ?? "";
    siteName = (tmp.textContent ?? "").replace(/^Batumi\s*-\s*/i, "").trim();
    tmp.innerHTML = parts[1] ?? "";
    dateLabel = (tmp.textContent ?? "").trim();
  }

  const date = requestedDate || dateLabelToYmd(dateLabel);
  if (date) dayset.add(date); // the selected day is plain text, not a link
  const availableDays = [...dayset].sort();

  // Metadata fields.
  const period = fieldAfter(root.querySelector("span.count_period"));
  const countType = fieldAfter(root.querySelector("span.count_type"));
  const weather = fieldAfter(root.querySelector("span.count_weather"));
  const observersRaw = fieldAfter(root.querySelector("span.count_observers"));
  const observers = observersRaw
    ? observersRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const remarksSpan = root.querySelector("span.count_remarks");
  const comments = remarksSpan
    ? (remarksSpan.textContent ?? "")
        .replace(/^\s*Comments:\s*/i, "")
        .trim() || null
    : null;

  // Species rows live in the table nested inside table.tabelrand.
  const species: SpeciesRow[] = [];
  root.querySelectorAll("table.tabelrand table tr").forEach((tr) => {
    const tds = tr.querySelectorAll("td");
    if (tds.length < 5) return;
    const nameCell = tds[0];
    const idMatch = /naartotals\([^,]+,\s*'(\d+)'\)/.exec(
      nameCell.getAttribute("onclick") ?? "",
    );
    const name = (nameCell.textContent ?? "").trim();
    if (!name || !idMatch) return; // header row (S/N) or spacer
    species.push({
      id: idMatch[1],
      name,
      south: parseNum(tds[2]?.textContent),
      north: parseNum(tds[4]?.textContent),
      notable: !!tr.querySelector("b"),
    });
  });

  // Totals line: "Totals: 433 individuals, 14 species, 11:28 hours".
  const tabelText = root.querySelector("table.tabelrand")?.textContent ?? "";
  const tm =
    /([\d.,]+)\s+individuals?,\s*(\d+)\s+species,\s*([\d:]+)\s+hours/i.exec(
      tabelText,
    );
  const totals: CountTotals = {
    individuals: tm ? parseNum(tm[1]) : null,
    species: tm ? Number(tm[2]) : null,
    hours: tm ? tm[3] : null,
  };

  return {
    site,
    siteName,
    dateLabel,
    date,
    period,
    countType,
    weather,
    observers,
    comments,
    species,
    totals,
    months,
    availableDays,
  };
}

/* -------------------------------------------------------------------- API */

/**
 * Fetch and parse a single count.
 * @param site Trektellen site id.
 * @param date YYYYMMDD, or "" for the most recent count.
 * @returns parsed data, or null if there is no count (endpoint said "wrong date").
 */
export async function fetchCount(
  site: string,
  date = "",
): Promise<CountData | null> {
  const url = `${BASE}/${site}/${date}?a=1&language=${LANG}`;
  let res: { count?: string };
  try {
    res = await jsonp<{ count?: string }>(url);
  } catch {
    // "wrong date" responses are not valid JSONP and time out; treat as no data.
    return null;
  }
  if (!res || typeof res.count !== "string" || !res.count.trim()) return null;
  return parseCount(res.count, site, date);
}

/**
 * Fetch the raw Trektellen count HTML (unparsed), for the legacy/classic viewer.
 * @param site Trektellen site id.
 * @param date YYYYMMDD, or "" for the most recent count.
 */
export async function fetchCountHtml(
  site: string,
  date = "",
): Promise<string | null> {
  const url = `${BASE}/${site}/${date}?a=1&language=${LANG}`;
  try {
    const res = await jsonp<{ count?: string }>(url);
    if (!res || typeof res.count !== "string" || !res.count.trim()) return null;
    return res.count;
  } catch {
    return null;
  }
}
