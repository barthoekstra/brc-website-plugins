import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Import the compiled CSS as a string so we can inject it into the Shadow DOM.
import cssText from "./index.css?inline";
import App from "./App.tsx";

/**
 * Mount the widget inside a Shadow DOM attached to #brc-daily-totals.
 *
 * The Shadow DOM fully isolates the widget's styles from the host page (and
 * vice-versa), so it can be dropped into a Squarespace code block without
 * Squarespace's CSS breaking the widget — or Tailwind's reset breaking the page.
 */
function init() {
  const host = document.getElementById("brc-daily-totals");
  if (!host || host.dataset.brcMounted === "true") return;
  host.dataset.brcMounted = "true";

  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = cssText;
  shadow.appendChild(style);

  // The app root keeps the id our CSS is scoped to, but lives inside the shadow.
  const appRoot = document.createElement("div");
  appRoot.id = "brc-daily-totals";
  shadow.appendChild(appRoot);

  createRoot(appRoot).render(
    <StrictMode>
      <App container={appRoot} />
    </StrictMode>,
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
