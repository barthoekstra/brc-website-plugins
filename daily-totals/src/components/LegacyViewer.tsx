import { useEffect, useRef } from "react";
import { fetchCountHtml } from "@/lib/trektellen";
import { SITES } from "@/hooks/useTrektellen";

/**
 * The original ("Classic") Trektellen embed: it injects the raw count HTML
 * returned by Trektellen and rewires the month <select> and day links to load
 * other dates — the same behaviour as the legacy `trektellen-embed.js`, minus
 * the jQuery dependency.
 *
 * It fetches lazily: the network requests only happen while this component is
 * mounted, so the classic view costs nothing until the user actually opens it.
 */
export function LegacyViewer({ onAllFailed }: { onAllFailed?: () => void }) {
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const onAllFailedRef = useRef(onAllFailed);
  onAllFailedRef.current = onAllFailed;

  useEffect(() => {
    let active = true;

    function wire(node: HTMLElement, site: string) {
      node.querySelectorAll("select").forEach((sel) => {
        sel.addEventListener("change", () =>
          load(site, (sel as HTMLSelectElement).value),
        );
      });
      node
        .querySelectorAll('a[onclick*="trektellen_get_count"]')
        .forEach((a) => {
          const m = /trektellen_get_count\('(\d{8})'/.exec(
            a.getAttribute("onclick") ?? "",
          );
          a.removeAttribute("onclick");
          a.setAttribute("href", "javascript:void(0)");
          if (m) {
            a.addEventListener("click", (e) => {
              e.preventDefault();
              load(site, m[1]);
            });
          }
        });
    }

    /** Render fetched HTML into a site's container. Returns true on success. */
    function render(site: string, html: string | null): boolean {
      const node = refs.current[site];
      if (!node) return false;
      if (!html) {
        node.innerHTML =
          '<p class="brc-legacy-empty">No count available for this date.</p>';
        return false;
      }
      node.innerHTML = html;
      wire(node, site);
      return true;
    }

    async function load(site: string, date: string) {
      const html = await fetchCountHtml(site, date);
      if (active) render(site, html);
    }

    // Initial load of all sites, tracking failures so the parent can fall back
    // to direct links if Trektellen never responds for any of them.
    let done = 0;
    let succeeded = 0;
    SITES.forEach(async (s) => {
      const html = await fetchCountHtml(s.id, "");
      if (!active) return;
      done += 1;
      if (render(s.id, html)) succeeded += 1;
      if (done === SITES.length && succeeded === 0) onAllFailedRef.current?.();
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
      {SITES.map((s) => (
        <div key={s.id} className="min-w-0">
          <div className="mb-2 font-display text-2xl leading-none">
            {s.name}
          </div>
          <div
            className="brc-legacy overflow-x-auto"
            ref={(el) => {
              refs.current[s.id] = el;
            }}
          >
            <p className="text-sm text-muted-foreground">Loading…</p>
          </div>
        </div>
      ))}
    </div>
  );
}
