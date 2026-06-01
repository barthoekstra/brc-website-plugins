import { ExternalLink } from "lucide-react";
import { SITES } from "@/hooks/useTrektellen";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Last-resort fallback: if neither the modern nor the classic viewer can load
 * the counts in time, just link straight to each station's page on Trektellen.
 */
export function LinksFallback() {
  return (
    <div className="flex flex-col items-center gap-5 rounded-xl border bg-muted/30 px-6 py-12 text-center">
      <p className="max-w-md text-sm text-muted-foreground">
        The live counts are taking too long to load. You can view each station's
        latest counts directly on Trektellen:
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {SITES.map((s) => (
          <a
            key={s.id}
            href={`https://www.trektellen.org/count/view/${s.id}`}
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1.5",
            )}
          >
            {s.name}
            <ExternalLink className="size-3.5" />
          </a>
        ))}
      </div>
    </div>
  );
}
