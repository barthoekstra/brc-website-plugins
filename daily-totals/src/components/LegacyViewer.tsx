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
export function LegacyViewer() {
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    let active = true;

    const wire = (node: HTMLElement, site: string) => {
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
    };

    const load = async (site: string, date: string) => {
      const html = await fetchCountHtml(site, date);
      if (!active) return;
      const node = refs.current[site];
      if (!node) return;
      if (!html) {
        node.innerHTML =
          '<p class="brc-legacy-empty">No count available for this date.</p>';
        return;
      }
      node.innerHTML = html;
      wire(node, site);
    };

    SITES.forEach((s) => void load(s.id, ""));
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
