import { useCallback, useEffect, useRef, useState } from "react";
import { fetchCount, type CountData, type MonthOption } from "@/lib/trektellen";
import { monthKey } from "@/lib/date";

export interface SiteDef {
  id: string;
  /** Short display name. */
  name: string;
  /** Sub-label shown under the name on the banner (e.g. "Station 1"). */
  subtitle?: string;
  /** Header/banner photo (Squarespace CDN), matching the live BRC page. */
  image: string;
  /** CSS object-position for the banner crop. Lower Y % = image sits lower. */
  imagePosition?: string;
}

const CDN =
  "https://images.squarespace-cdn.com/content/v1/5b33912fb27e39bd89996b9d";

/** The three Batumi count stations, in display order, with their BRC banners. */
export const SITES: SiteDef[] = [
  {
    id: "1047",
    name: "Sakhalvasho",
    subtitle: "Station 1",
    image: `${CDN}/1625332492813-JA370LA6ASKF8YSKKO7D/20190830_110758-Web.jpg?format=1000w`,
    // Sakhalvasho: move the image down.
    imagePosition: "center 75%",
  },
  {
    id: "1048",
    name: "Shuamta",
    subtitle: "Station 2",
    image: `${CDN}/314292c9-0924-46a6-9c34-d1342e6872e1/20240921T0832-AutumnReport-Bart_Hoekstra-001-Web.jpg?format=1000w`,
    // Shuamta: move the image up.
    imagePosition: "center 25%",
  },
  {
    id: "5026",
    name: "Kvirike",
    subtitle: "Station 3",
    image: `${CDN}/1f3b5826-9435-4015-bc2b-7e9a32bb55da/Kvirike-Aerial-Web.jpg?format=1000w`,
    imagePosition: "center 50%",
  },
];

export interface SiteState {
  /** Currently displayed date (YYYYMMDD), or "" before the first load. */
  date: string;
  data: CountData | null;
  loading: boolean;
  error: boolean;
}

type Avail = Record<string, Record<string, string[]>>; // site -> "YYYYMM" -> days
type MonthsIdx = Record<string, MonthOption[]>; // site -> months with data
type StateMap = Record<string, SiteState>;

const EMPTY_STATE: SiteState = {
  date: "",
  data: null,
  loading: true,
  error: false,
};

function monthKeyOf(opt: MonthOption): string {
  return `${opt.year}${String(opt.month).padStart(2, "0")}`;
}

export interface UseTrektellen {
  sites: SiteDef[];
  state: StateMap;
  locked: boolean;
  availability: Avail;
  monthsIndex: MonthsIdx;
  setLocked: (next: boolean) => void;
  goToDate: (site: string, date: string) => void;
  step: (site: string, dir: 1 | -1) => void;
  canStep: (site: string, dir: 1 | -1) => boolean;
  ensureMonthAvailability: (site: string, ym: string) => Promise<string[]>;
  /** Availability for a month, honouring the lock (union of all sites). */
  availabilityFor: (site: string, ym: string) => Set<string>;
  reload: (site: string) => void;
}

export function useTrektellen(): UseTrektellen {
  const allIds = SITES.map((s) => s.id);

  const [state, setStateMap] = useState<StateMap>(() =>
    Object.fromEntries(allIds.map((id) => [id, { ...EMPTY_STATE }])),
  );
  const [availability, setAvailabilityMap] = useState<Avail>({});
  const [monthsIndex, setMonthsIndexMap] = useState<MonthsIdx>({});
  const [locked, setLockedState] = useState(false);

  // Ref mirrors for synchronous reads inside async flows.
  const stateRef = useRef(state);
  const availRef = useRef(availability);
  const monthsRef = useRef(monthsIndex);
  const lockedRef = useRef(locked);
  const inflight = useRef(new Set<string>()); // "site:ym" availability fetches
  // The date the user most recently navigated to (any station). When the lock
  // is switched on, every station snaps to this date.
  const lastTouchedDate = useRef<string>("");

  const setSite = useCallback((id: string, patch: Partial<SiteState>) => {
    setStateMap((prev) => {
      const next = { ...prev, [id]: { ...prev[id], ...patch } };
      stateRef.current = next;
      return next;
    });
  }, []);

  /** Merge a freshly parsed count's month/day metadata into the caches. */
  const absorbMeta = useCallback((site: string, data: CountData) => {
    if (data.months.length) {
      setMonthsIndexMap((prev) => {
        const next = { ...prev, [site]: data.months };
        monthsRef.current = next;
        return next;
      });
    }
    if (data.date) {
      const ym = monthKey(data.date);
      setAvailabilityMap((prev) => {
        const forSite = { ...(prev[site] ?? {}), [ym]: data.availableDays };
        const next = { ...prev, [site]: forSite };
        availRef.current = next;
        return next;
      });
    }
  }, []);

  /** Load a count for display. Assumes the date is known to have data. */
  const fetchData = useCallback(
    async (site: string, date: string) => {
      setSite(site, { loading: true, error: false });
      const data = await fetchCount(site, date);
      if (data) {
        absorbMeta(site, data);
        setSite(site, {
          date: data.date || date,
          data,
          loading: false,
          error: false,
        });
      } else {
        // Empty / "wrong date" — show the empty state for this day.
        setSite(site, { date, data: null, loading: false, error: !date });
      }
    },
    [setSite, absorbMeta],
  );

  /** Ensure we know which days in a month have counts (without changing display). */
  const ensureMonthAvailability = useCallback(
    async (site: string, ym: string): Promise<string[]> => {
      const cached = availRef.current[site]?.[ym];
      if (cached) return cached;

      const months = monthsRef.current[site];
      // The months index isn't loaded yet (initial render). Don't cache anything
      // — returning here lets this month be resolved again once data arrives,
      // instead of poisoning the cache with an empty result.
      if (!months || months.length === 0) return [];

      const opt = months.find((m) => monthKeyOf(m) === ym);
      const writeAvail = (days: string[]) => {
        setAvailabilityMap((prev) => {
          const forSite = { ...(prev[site] ?? {}), [ym]: days };
          const next = { ...prev, [site]: forSite };
          availRef.current = next;
          return next;
        });
      };

      if (!opt) {
        writeAvail([]); // month genuinely has no data; cache empty
        return [];
      }

      const key = `${site}:${ym}`;
      if (inflight.current.has(key)) return cached ?? [];
      inflight.current.add(key);
      const data = await fetchCount(site, opt.value);
      inflight.current.delete(key);

      if (data) {
        absorbMeta(site, data);
        return availRef.current[site]?.[ym] ?? data.availableDays;
      }
      writeAvail([]);
      return [];
    },
    [absorbMeta],
  );

  /** Available days for a month, honouring the lock (union across all sites). */
  const availabilityFor = useCallback(
    (site: string, ym: string): Set<string> => {
      const ids = lockedRef.current ? allIds : [site];
      const set = new Set<string>();
      for (const id of ids) {
        for (const d of availRef.current[id]?.[ym] ?? []) set.add(d);
      }
      return set;
    },
    [allIds],
  );

  /** Apply a date to one or all sites (lock-aware), never fetching dead dates. */
  const applyDate = useCallback(
    async (targets: string[], date: string) => {
      const ym = monthKey(date);
      await Promise.all(
        targets.map(async (id) => {
          const days = await ensureMonthAvailability(id, ym);
          if (days.includes(date)) {
            await fetchData(id, date);
          } else {
            setSite(id, { date, data: null, loading: false, error: false });
          }
        }),
      );
    },
    [ensureMonthAvailability, fetchData, setSite],
  );

  const goToDate = useCallback(
    (site: string, date: string) => {
      // Remember the most recent user-driven date so a later "lock" can adopt it.
      lastTouchedDate.current = date;
      const targets = lockedRef.current ? allIds : [site];
      void applyDate(targets, date);
    },
    [allIds, applyDate],
  );

  // ---- prev/next stepping over available days (skips gaps, crosses months) --

  const sortedMonthKeys = useCallback((ids: string[]): string[] => {
    const set = new Set<string>();
    for (const id of ids) {
      for (const m of monthsRef.current[id] ?? []) set.add(monthKeyOf(m));
    }
    return [...set].sort();
  }, []);

  const daysInMonth = useCallback((ids: string[], ym: string): string[] => {
    const set = new Set<string>();
    for (const id of ids) {
      for (const d of availRef.current[id]?.[ym] ?? []) set.add(d);
    }
    return [...set].sort();
  }, []);

  const nextDate = useCallback(
    async (ids: string[], cur: string, dir: 1 | -1): Promise<string | null> => {
      const ym = monthKey(cur);
      await Promise.all(ids.map((id) => ensureMonthAvailability(id, ym)));
      const days = daysInMonth(ids, ym);
      const idx = days.indexOf(cur);
      const within = idx >= 0 ? days[idx + dir] : undefined;
      if (within) return within;

      const keys = sortedMonthKeys(ids);
      const pos = keys.indexOf(ym);
      const neighbour = pos >= 0 ? keys[pos + dir] : undefined;
      if (!neighbour) return null;
      await Promise.all(ids.map((id) => ensureMonthAvailability(id, neighbour)));
      const ndays = daysInMonth(ids, neighbour);
      return dir > 0 ? (ndays[0] ?? null) : (ndays[ndays.length - 1] ?? null);
    },
    [ensureMonthAvailability, daysInMonth, sortedMonthKeys],
  );

  const step = useCallback(
    (site: string, dir: 1 | -1) => {
      const ids = lockedRef.current ? allIds : [site];
      const cur = stateRef.current[site]?.date;
      if (!cur) return;
      void nextDate(ids, cur, dir).then((target) => {
        if (target) goToDate(site, target);
      });
    },
    [allIds, nextDate, goToDate],
  );

  const canStep = useCallback(
    (site: string, dir: 1 | -1): boolean => {
      const ids = lockedRef.current ? allIds : [site];
      const cur = stateRef.current[site]?.date;
      if (!cur) return false;
      const ym = monthKey(cur);
      const days = daysInMonth(ids, ym);
      const idx = days.indexOf(cur);
      if (idx >= 0 && days[idx + dir]) return true;
      // Otherwise, is there a neighbouring month with data?
      const keys = sortedMonthKeys(ids);
      const pos = keys.indexOf(ym);
      return pos >= 0 && !!keys[pos + dir];
    },
    [allIds, daysInMonth, sortedMonthKeys],
  );

  // ---- lock toggle ---------------------------------------------------------

  const setLocked = useCallback(
    (next: boolean) => {
      lockedRef.current = next;
      setLockedState(next);
      if (next) {
        // Snap every station to the date the user changed most recently. Before
        // any manual change, fall back to the most recent date on show.
        const dates = allIds
          .map((id) => stateRef.current[id]?.date)
          .filter(Boolean) as string[];
        const shared =
          lastTouchedDate.current ||
          (dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : "");
        if (shared) void applyDate(allIds, shared);
      }
    },
    [allIds, applyDate],
  );

  const reload = useCallback(
    (site: string) => {
      const cur = stateRef.current[site]?.date ?? "";
      void fetchData(site, cur);
    },
    [fetchData],
  );

  // ---- initial load --------------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all(
        allIds.map(async (id) => {
          const data = await fetchCount(id, "");
          if (cancelled) return;
          if (data) {
            absorbMeta(id, data);
            setSite(id, {
              date: data.date,
              data,
              loading: false,
              error: false,
            });
          } else {
            setSite(id, { loading: false, error: true });
          }
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    sites: SITES,
    state,
    locked,
    availability,
    monthsIndex,
    setLocked,
    goToDate,
    step,
    canStep,
    ensureMonthAvailability,
    availabilityFor,
    reload,
  };
}
