import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { SpeciesRow } from "@/lib/trektellen";
import { cn } from "@/lib/utils";

function fmt(n: number | null): string {
  if (n == null) return "–";
  return n.toLocaleString("en-GB");
}

export function SpeciesTable({ species }: { species: SpeciesRow[] }) {
  const [showZeros, setShowZeros] = useState(false);

  const hasNorth = useMemo(
    () => species.some((s) => s.north != null && s.north !== 0),
    [species],
  );

  const hasNotable = useMemo(() => species.some((s) => s.notable), [species]);

  const rows = useMemo(
    () =>
      showZeros
        ? species
        : species.filter(
            (s) => (s.south ?? 0) !== 0 || (s.north ?? 0) !== 0,
          ),
    [species, showZeros],
  );

  const hiddenCount = species.length - rows.length;

  if (!species.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No species were logged for this count.
      </p>
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium">Species</th>
              <th className="px-3 py-2 text-right font-medium">
                <span className="inline-flex items-center justify-end gap-1">
                  <ArrowDown className="size-3" /> S
                </span>
              </th>
              {hasNorth && (
                <th className="px-3 py-2 text-right font-medium">
                  <span className="inline-flex items-center justify-end gap-1">
                    <ArrowUp className="size-3" /> N
                  </span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => (
              <tr
                key={`${s.id}-${i}`}
                className={cn(
                  "border-b last:border-0 transition-colors",
                  s.notable
                    ? "bg-accent/60 font-bold"
                    : "hover:bg-muted/40",
                )}
              >
                <td className="px-3 py-1.5">
                  <span className="inline-flex items-center gap-1.5">
                    {s.notable && (
                      <span
                        className="size-1.5 rounded-full bg-primary"
                        title="Notable observation"
                      />
                    )}
                    {s.name}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {fmt(s.south)}
                </td>
                {hasNorth && (
                  <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                    {fmt(s.north)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasNotable && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
          <span>
            <span className="font-bold text-foreground">Notable observation</span>{" "}
            (scarce or rare species, or a large number)
          </span>
        </p>
      )}
      {hiddenCount > 0 && !showZeros && (
        <button
          type="button"
          onClick={() => setShowZeros(true)}
          className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Show {hiddenCount} species with no birds
        </button>
      )}
      {showZeros && (
        <button
          type="button"
          onClick={() => setShowZeros(false)}
          className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Hide species with no birds
        </button>
      )}
    </div>
  );
}
