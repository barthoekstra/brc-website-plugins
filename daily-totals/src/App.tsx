import { useCallback, useEffect, useState } from "react";
import { Lock, LockOpen } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { CountSiteCard } from "@/components/CountSiteCard";
import { LegacyViewer } from "@/components/LegacyViewer";
import { LinksFallback } from "@/components/LinksFallback";
import { useTrektellen } from "@/hooks/useTrektellen";
import { cn } from "@/lib/utils";
import { PortalContainerContext } from "@/lib/portal";

type View = "modern" | "classic";

export default function App({ container }: { container?: HTMLElement | null }) {
  const tt = useTrektellen();
  const allIds = tt.sites.map((s) => s.id);

  const [view, setView] = useState<View>("modern");
  // Mount the classic viewer only once it has been opened, so it never hits the
  // Trektellen API unless the user actually looks at it.
  const [classicOpened, setClassicOpened] = useState(false);

  // Graceful degradation: modern -> classic -> direct Trektellen links.
  // It's driven by *failure*, not slowness: a station only counts as failed once
  // its request errors or never responds (see NO_RESPONSE_MS in trektellen.ts).
  // A slow-but-working connection just keeps showing the loading state.
  // Only auto-degrades on the initial load; a manual toggle opts out.
  const [autoDegrade, setAutoDegrade] = useState(true);
  const [classicFailed, setClassicFailed] = useState(false);
  const [linksFallback, setLinksFallback] = useState(false);

  // Modern has definitively failed only once every station finished loading and
  // none produced data (i.e. no response). Partial success is not a failure.
  const modernSettled = tt.sites.every((s) => !tt.state[s.id]?.loading);
  const modernHasData = tt.sites.some((s) => !!tt.state[s.id]?.data);
  const modernFailed = modernSettled && !modernHasData;

  // Modern got no response → switch to Classic.
  useEffect(() => {
    if (autoDegrade && view === "modern" && modernFailed) {
      setClassicOpened(true);
      setView("classic");
    }
  }, [autoDegrade, view, modernFailed]);

  // Classic got no response → fall back to direct links.
  useEffect(() => {
    if (autoDegrade && view === "classic" && classicFailed) {
      setLinksFallback(true);
    }
  }, [autoDegrade, view, classicFailed]);

  const pickView = (v: View) => {
    setAutoDegrade(false); // a manual choice opts out of auto-degradation
    setView(v);
    if (v === "classic") setClassicOpened(true);
  };

  const ensureMonth = useCallback(
    (ids: string[], ym: string) => {
      ids.forEach((id) => void tt.ensureMonthAvailability(id, ym));
    },
    [tt],
  );

  return (
    <PortalContainerContext.Provider value={container ?? null}>
    <div className="w-full px-4 py-8">
      {/* Section header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-lg text-muted-foreground">
            Live counts from the Batumi bottleneck, straight from{" "}
            <a
              href="https://www.trektellen.org"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Trektellen
            </a>
            .
          </p>
        </div>

        {!linksFallback && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Modern / Classic view toggle */}
          <div className="inline-flex rounded-lg border bg-card p-0.5">
            {(["modern", "classic"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => pickView(v)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                  view === v
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v}
              </button>
            ))}
          </div>

          {view === "modern" && (
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border bg-card px-3 py-2">
              {tt.locked ? (
                <Lock className="size-4 text-primary" />
              ) : (
                <LockOpen className="size-4 text-muted-foreground" />
              )}
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-medium">Lock dates</span>
                <span className="text-xs text-muted-foreground">
                  Browse every station on the same day
                </span>
              </div>
              <Switch
                checked={tt.locked}
                onCheckedChange={tt.setLocked}
                aria-label="Lock all stations to the same date"
              />
            </label>
          )}
        </div>
        )}
      </div>

      {linksFallback ? (
        <LinksFallback />
      ) : (
        <>
      {/* Modern viewer (kept mounted so toggling back never refetches) */}
      <div className={cn(view !== "modern" && "hidden")}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {tt.sites.map((site) => {
            const ids = tt.locked ? allIds : [site.id];
            return (
              <CountSiteCard
                key={site.id}
                site={site}
                st={tt.state[site.id]}
                ids={ids}
                availability={tt.availability}
                monthsIndex={tt.monthsIndex}
                onEnsureMonth={ensureMonth}
                onPick={(ymd) => tt.goToDate(site.id, ymd)}
                onStep={(dir) => tt.step(site.id, dir)}
                canPrev={tt.canStep(site.id, -1)}
                canNext={tt.canStep(site.id, 1)}
                onReload={() => tt.reload(site.id)}
              />
            );
          })}
        </div>
      </div>

      {/* Classic viewer — lazily mounted, then kept alive to avoid refetching */}
      {classicOpened && (
        <div className={cn(view !== "classic" && "hidden")}>
          <LegacyViewer onAllFailed={() => setClassicFailed(true)} />
        </div>
      )}
        </>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Data powered by{" "}
        <a
          href="https://www.trektellen.org"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Trektellen.org
        </a>
      </p>
    </div>
    </PortalContainerContext.Provider>
  );
}
