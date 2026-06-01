import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { MonthOption } from "@/lib/trektellen";
import { dateToYmd, formatShort, ymdToDate } from "@/lib/date";

interface DateNavigatorProps {
  /** Currently displayed date, YYYYMMDD. */
  date: string;
  /** Sites whose availability should drive this picker (1 unlocked, all when locked). */
  ids: string[];
  /** Reactive availability cache: site -> "YYYYMM" -> days. */
  availability: Record<string, Record<string, string[]>>;
  /** Months that have data, per site (used to skip empty months and bound nav). */
  monthsIndex: Record<string, MonthOption[]>;
  onEnsureMonth: (ids: string[], ym: string) => void;
  onPick: (ymd: string) => void;
  onStep: (dir: 1 | -1) => void;
  canPrev: boolean;
  canNext: boolean;
  disabled?: boolean;
}

const MONTH_NAMES = [
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

/** "YYYYMM" -> Date at the first of that month. */
function ymToMonthStart(ym: string): Date {
  return new Date(Number(ym.slice(0, 4)), Number(ym.slice(4, 6)) - 1, 1);
}

const SELECT_CLASS =
  "h-7 cursor-pointer rounded-md border border-input bg-background px-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function DateNavigator({
  date,
  ids,
  availability,
  monthsIndex,
  onEnsureMonth,
  onPick,
  onStep,
  canPrev,
  canNext,
  disabled,
}: DateNavigatorProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() =>
    date ? ymdToDate(date) : new Date(2025, 9, 1),
  );

  // Keep the calendar's visible month in sync with the selected date.
  useEffect(() => {
    if (date) setMonth(ymdToDate(date));
  }, [date]);

  const visibleYm = `${month.getFullYear()}${String(
    month.getMonth() + 1,
  ).padStart(2, "0")}`;
  const visibleYear = visibleYm.slice(0, 4);
  const visibleMonth = visibleYm.slice(4, 6);

  // The months that actually have counts (union across the relevant sites),
  // ascending. Everything else (months with no count at all) is skipped.
  const monthKeys = useMemo(() => {
    const set = new Set<string>();
    for (const id of ids) {
      for (const m of monthsIndex[id] ?? []) {
        set.add(`${m.year}${String(m.month).padStart(2, "0")}`);
      }
    }
    return [...set].sort();
  }, [monthsIndex, ids]);

  // Years that have data (descending — newest first), and the months that have
  // data within the currently-shown year.
  const years = useMemo(
    () => [...new Set(monthKeys.map((k) => k.slice(0, 4)))].sort().reverse(),
    [monthKeys],
  );
  const monthsForYear = useMemo(
    () =>
      monthKeys
        .filter((k) => k.slice(0, 4) === visibleYear)
        .map((k) => k.slice(4, 6)),
    [monthKeys, visibleYear],
  );

  const goToYm = (ym: string) => setMonth(ymToMonthStart(ym));

  // Jump to the nearest month *with data* in a direction (skips empty months).
  const stepMonth = (dir: 1 | -1) => {
    const target =
      dir > 0
        ? monthKeys.find((k) => k > visibleYm)
        : [...monthKeys].reverse().find((k) => k < visibleYm);
    if (target) goToYm(target);
  };
  const hasPrevMonth = monthKeys.some((k) => k < visibleYm);
  const hasNextMonth = monthKeys.some((k) => k > visibleYm);

  const onYearSelect = (year: string) => {
    const monthsInYear = monthKeys
      .filter((k) => k.slice(0, 4) === year)
      .map((k) => k.slice(4, 6));
    // Keep the same month if that year has it, else the latest month with data.
    const m = monthsInYear.includes(visibleMonth)
      ? visibleMonth
      : monthsInYear[monthsInYear.length - 1];
    if (m) goToYm(`${year}${m}`);
  };

  // Make sure availability for the visible month is loaded for the relevant sites.
  useEffect(() => {
    onEnsureMonth(ids, visibleYm);
  }, [visibleYm, ids, onEnsureMonth]);

  // Days with a count in the visible month (union across `ids`).
  const availableDates = useMemo(() => {
    const out: Date[] = [];
    const seen = new Set<string>();
    for (const id of ids) {
      for (const d of availability[id]?.[visibleYm] ?? []) {
        if (!seen.has(d)) {
          seen.add(d);
          out.push(ymdToDate(d));
        }
      }
    }
    return { list: out, set: seen };
  }, [availability, ids, visibleYm]);

  const selected = date ? ymdToDate(date) : undefined;

  return (
    <div className="flex w-full items-center gap-1.5">
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Previous count"
        disabled={disabled || !canPrev}
        onClick={() => onStep(-1)}
      >
        <ChevronLeft />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="flex-1 justify-center gap-2 font-medium tabular-nums"
          >
            <CalendarDays className="text-muted-foreground" />
            {date ? formatShort(date) : "Select date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto">
          {/* Custom month/year header: skip-arrows + data-only dropdowns */}
          <div className="flex items-center justify-between gap-2 border-b p-2">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Previous month with a count"
              disabled={!hasPrevMonth}
              onClick={() => stepMonth(-1)}
            >
              <ChevronLeft />
            </Button>
            <div className="flex flex-1 items-center justify-center gap-1.5">
              <select
                className={SELECT_CLASS}
                aria-label="Month"
                value={visibleMonth}
                onChange={(e) => goToYm(`${visibleYear}${e.target.value}`)}
              >
                {monthsForYear.map((m) => (
                  <option key={m} value={m}>
                    {MONTH_NAMES[Number(m) - 1]}
                  </option>
                ))}
              </select>
              <select
                className={SELECT_CLASS}
                aria-label="Year"
                value={visibleYear}
                onChange={(e) => onYearSelect(e.target.value)}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Next month with a count"
              disabled={!hasNextMonth}
              onClick={() => stepMonth(1)}
            >
              <ChevronRight />
            </Button>
          </div>

          <Calendar
            mode="single"
            showOutsideDays={false}
            hideNavigation
            month={month}
            onMonthChange={setMonth}
            classNames={{ month_caption: "hidden" }}
            selected={selected}
            defaultMonth={selected}
            modifiers={{ available: availableDates.list }}
            disabled={(d) => !availableDates.set.has(dateToYmd(d))}
            onSelect={(d) => {
              if (d) {
                onPick(dateToYmd(d));
                setOpen(false);
              }
            }}
          />
          <div className="flex items-center gap-4 border-t px-3 py-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded bg-accent ring-1 ring-inset ring-primary/30" />
              Has entry
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded ring-1 ring-inset ring-border" />
              No entry
            </span>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Next count"
        disabled={disabled || !canNext}
        onClick={() => onStep(1)}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
