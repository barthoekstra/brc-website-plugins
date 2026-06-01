import {
  Clock,
  CloudSun,
  Users,
  AlertCircle,
  CalendarOff,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { DateNavigator } from "@/components/DateNavigator";
import { SpeciesTable } from "@/components/SpeciesTable";
import type { CountData, MonthOption } from "@/lib/trektellen";
import type { SiteDef, SiteState } from "@/hooks/useTrektellen";
import { formatShort } from "@/lib/date";

interface CountSiteCardProps {
  site: SiteDef;
  st: SiteState;
  ids: string[];
  availability: Record<string, Record<string, string[]>>;
  monthsIndex: Record<string, MonthOption[]>;
  onEnsureMonth: (ids: string[], ym: string) => void;
  onPick: (ymd: string) => void;
  onStep: (dir: 1 | -1) => void;
  canPrev: boolean;
  canNext: boolean;
  onReload: () => void;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-primary px-3 py-2.5">
      <span className="font-display text-2xl leading-none tabular-nums text-primary-foreground">
        {value}
      </span>
      <span className="text-[0.7rem] uppercase tracking-wide text-primary-foreground/80">
        {label}
      </span>
    </div>
  );
}

function MetaRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <span className="text-muted-foreground">{label}: </span>
        {children}
      </div>
    </div>
  );
}

function CountBody({ data }: { data: CountData }) {
  const { totals } = data;
  return (
    <div className="flex flex-col gap-4">
      {/* Headline numbers */}
      <div className="grid grid-cols-3 gap-2">
        <Stat
          label="Individuals"
          value={
            totals.individuals != null
              ? totals.individuals.toLocaleString("en-GB")
              : "–"
          }
        />
        <Stat
          label="Species"
          value={totals.species != null ? String(totals.species) : "–"}
        />
        <Stat label="Count time" value={totals.hours ? `${totals.hours} h` : "–"} />
      </div>

      {/* Conditions & people */}
      <div className="flex flex-col gap-2">
        {data.period && (
          <MetaRow icon={<Clock className="size-4" />} label="Counting period">
            <span className="tabular-nums">{data.period}</span>
          </MetaRow>
        )}
        <MetaRow icon={<CloudSun className="size-4" />} label="Weather">
          {data.weather ?? "—"}
        </MetaRow>
        {data.observers.length > 0 && (
          <MetaRow icon={<Users className="size-4" />} label="Observers">
            {data.observers.join(", ")}
          </MetaRow>
        )}
      </div>

      <Separator />

      <SpeciesTable species={data.species} />

      {data.comments && (
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Field notes
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
            {data.comments}
          </p>
        </div>
      )}
    </div>
  );
}

function LoadingBody() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export function CountSiteCard(props: CountSiteCardProps) {
  const { site, st } = props;

  // The earliest "YYYYMM" this station has ever counted (from its month index).
  // Used to explain an empty state caused by the station not existing yet,
  // rather than a one-off missed day.
  const earliestYm = (props.monthsIndex[site.id] ?? [])
    .map((m) => `${m.year}${String(m.month).padStart(2, "0")}`)
    .sort()[0];
  const beforeStationStart =
    !!earliestYm && !!st.date && st.date.slice(0, 6) < earliestYm;

  return (
    <Card className="flex flex-col overflow-hidden rounded-none border-0 bg-transparent p-0 shadow-none">
      {/* Station banner photo (from the live BRC page) with the name overlaid —
          no darkening layer, just a text-shadow for legibility. */}
      <div className="relative h-48 w-full overflow-hidden bg-muted">
        <img
          src={site.image}
          alt={site.name}
          loading="lazy"
          style={{ objectPosition: site.imagePosition }}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 flex flex-col items-start justify-center px-4 text-left">
          <h3 className="font-display text-4xl leading-none text-white">
            {site.name}
          </h3>
          {site.subtitle && (
            <p className="mt-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-white">
              {site.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Date control bar */}
      <div className="border-b py-3">
        <DateNavigator
          date={st.date}
          ids={props.ids}
          availability={props.availability}
          monthsIndex={props.monthsIndex}
          onEnsureMonth={props.onEnsureMonth}
          onPick={props.onPick}
          onStep={props.onStep}
          canPrev={props.canPrev}
          canNext={props.canNext}
          disabled={st.loading && !st.data}
        />
      </div>

      <CardContent className="flex-1 px-0 py-5">
        {st.loading ? (
          <LoadingBody />
        ) : st.error ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertCircle className="size-7 text-destructive" />
            <p className="text-sm text-muted-foreground">
              Couldn't load this count.
            </p>
            <Button variant="outline" size="sm" onClick={props.onReload}>
              <RefreshCw /> Try again
            </Button>
          </div>
        ) : !st.data ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <CalendarOff className="size-7 text-muted-foreground" />
            {beforeStationStart ? (
              <>
                <p className="text-sm font-medium">Not counted yet</p>
                <p className="text-xs text-muted-foreground">
                  We have only counted in {site.name} since{" "}
                  {earliestYm.slice(0, 4)}.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">No count on this date</p>
                <p className="text-xs text-muted-foreground">
                  {site.name} did not report a count for{" "}
                  {st.date ? formatShort(st.date) : "this day"}.
                </p>
              </>
            )}
          </div>
        ) : (
          <CountBody data={st.data} />
        )}
      </CardContent>
    </Card>
  );
}
