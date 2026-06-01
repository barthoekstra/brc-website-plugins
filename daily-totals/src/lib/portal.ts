import { createContext, useContext } from "react";

/**
 * The element Radix portals (popovers) should render into. When the widget runs
 * inside a Shadow DOM this must be a node *inside* that shadow root, otherwise
 * the portaled content escapes to document.body and loses all styling.
 */
export const PortalContainerContext = createContext<HTMLElement | null>(null);

export function usePortalContainer(): HTMLElement | undefined {
  return useContext(PortalContainerContext) ?? undefined;
}
