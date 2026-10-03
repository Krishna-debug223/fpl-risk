"use client";

import { useEffect } from "react";

/**
 * Gives every `.segmented` control a sliding thumb and every `[data-slide]`
 * nav a sliding underline. The indicator moves to an item as soon as it is
 * clicked, and segmented controls can be dragged across like iOS ones:
 * press, slide to another option, release to pick it.
 *
 * Works on the existing markup (buttons with aria-pressed/checked/selected,
 * links with aria-current), so components don't need to change. Until this
 * runs, the CSS falls back to styling the active item directly.
 */

const CONTAINERS = ".segmented, [data-slide]";
const ACTIVE = '[aria-pressed="true"], [aria-checked="true"], [aria-selected="true"], [aria-current="page"]';

type Tracked = { pending?: number };

function itemsOf(container: HTMLElement) {
  return Array.from(container.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && (child.tagName === "A" || child.tagName === "BUTTON"),
  );
}

function activeOf(container: HTMLElement) {
  return itemsOf(container).find((item) => item.matches(ACTIVE)) ?? null;
}

function place(container: HTMLElement, target: HTMLElement | null) {
  for (const item of itemsOf(container)) item.toggleAttribute("data-thumb-on", item === target);
  if (!target) {
    container.style.setProperty("--thumb-o", "0");
    return;
  }
  container.style.setProperty("--thumb-x", `${target.offsetLeft}px`);
  container.style.setProperty("--thumb-y", `${target.offsetTop}px`);
  container.style.setProperty("--thumb-w", `${target.offsetWidth}px`);
  container.style.setProperty("--thumb-h", `${target.offsetHeight}px`);
  container.style.setProperty("--thumb-o", "1");
  if (!container.hasAttribute("data-thumb")) {
    // First placement jumps straight into position; later moves animate.
    // Resolve the starting position (reading the style forces it) before
    // turning transitions on. rAF would be paused in a background tab.
    container.setAttribute("data-thumb", "");
    void getComputedStyle(container, container.matches(".segmented") ? "::before" : "::after").transform;
    container.setAttribute("data-thumb", "animate");
  }
}

// Touching server-rendered markup before React hydrates it causes a hydration
// mismatch, and parts of the page (inside Suspense) hydrate later than this
// component. React tags each node it owns, so wait for that tag.
function isHydrated(element: HTMLElement) {
  return Object.keys(element).some((key) => key.startsWith("__reactFiber$"));
}

function itemAt(container: HTMLElement, clientX: number) {
  const items = itemsOf(container).filter((item) => !(item as HTMLButtonElement).disabled);
  let best: HTMLElement | null = null;
  let bestDistance = Infinity;
  for (const item of items) {
    const rect = item.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right) return item;
    const distance = Math.min(Math.abs(clientX - rect.left), Math.abs(clientX - rect.right));
    if (distance < bestDistance) { bestDistance = distance; best = item; }
  }
  return best;
}

export default function SlidingIndicators() {
  useEffect(() => {
    const tracked = new Map<HTMLElement, Tracked>();
    const sync = (container: HTMLElement) => {
      const state = tracked.get(container);
      if (state?.pending) { window.clearTimeout(state.pending); state.pending = undefined; }
      place(container, activeOf(container));
    };

    const resize = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const container = entry.target as HTMLElement;
        // Keep an optimistic (just-clicked) position while navigation is pending.
        if (!tracked.get(container)?.pending) place(container, activeOf(container));
      }
    });
    const attributes = new MutationObserver((records) => {
      const changed = new Set<HTMLElement>();
      for (const record of records) {
        const container = (record.target as HTMLElement).closest<HTMLElement>(CONTAINERS);
        if (container && tracked.has(container)) changed.add(container);
      }
      changed.forEach(sync);
    });

    let retry = 0;
    const scan = () => {
      let waiting = false;
      for (const container of tracked.keys()) {
        if (!container.isConnected) { resize.unobserve(container); tracked.delete(container); }
      }
      document.querySelectorAll<HTMLElement>(CONTAINERS).forEach((container) => {
        if (tracked.has(container)) return;
        if (!isHydrated(container)) { waiting = true; return; }
        tracked.set(container, {});
        resize.observe(container);
        attributes.observe(container, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ["aria-pressed", "aria-checked", "aria-selected", "aria-current"],
        });
        place(container, activeOf(container));
      });
      window.clearTimeout(retry);
      if (waiting) retry = window.setTimeout(scan, 100);
    };

    let scheduled = 0;
    const structure = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = requestAnimationFrame(() => { scheduled = 0; scan(); });
    });
    structure.observe(document.body, { childList: true, subtree: true });
    scan();
    // Web fonts change item widths after first paint.
    document.fonts?.ready.then(() => tracked.forEach((_, container) => place(container, activeOf(container)))).catch(() => undefined);

    // Move to the clicked item straight away, even if the page it links to
    // takes a moment. The real active state re-syncs once it changes.
    const onClick = (event: MouseEvent) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      const item = (event.target as HTMLElement | null)?.closest<HTMLElement>("a, button");
      const container = item?.parentElement;
      if (!item || !container || !tracked.has(container) || (item as HTMLButtonElement).disabled) return;
      place(container, item);
      const state = tracked.get(container)!;
      if (state.pending) window.clearTimeout(state.pending);
      // If nothing changes (same page, cancelled navigation), settle back.
      state.pending = window.setTimeout(() => sync(container), 4000);
    };

    // Press-and-slide on segmented controls.
    let drag: { container: HTMLElement; pointerId: number; start: HTMLElement; current: HTMLElement; captured: boolean } | null = null;
    const endDrag = (commit: boolean) => {
      if (!drag) return;
      const { container, current, captured, pointerId } = drag;
      drag = null;
      container.removeAttribute("data-pressing");
      // Without capture this was a plain tap, and the browser clicks the item itself.
      if (!captured) return;
      if (container.hasPointerCapture(pointerId)) container.releasePointerCapture(pointerId);
      if (commit && !current.matches(ACTIVE)) current.click();
      else sync(container);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !event.isPrimary) return;
      const item = (event.target as HTMLElement | null)?.closest<HTMLElement>("a, button");
      const container = item?.parentElement;
      if (!item || !container?.classList.contains("segmented") || !tracked.has(container)) return;
      drag = { container, pointerId: event.pointerId, start: item, current: item, captured: false };
      // iOS shrinks the thumb slightly while it is held.
      if (item.matches(ACTIVE)) container.setAttribute("data-pressing", "");
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const next = itemAt(drag.container, event.clientX);
      if (!next || next === drag.current) return;
      if (!drag.captured) {
        drag.container.setPointerCapture(event.pointerId);
        drag.captured = true;
        drag.container.setAttribute("data-pressing", "");
      }
      drag.current = next;
      place(drag.container, next);
    };
    const onPointerUp = (event: PointerEvent) => {
      if (drag && event.pointerId === drag.pointerId) endDrag(true);
    };
    const onPointerCancel = (event: PointerEvent) => {
      if (drag && event.pointerId === drag.pointerId) endDrag(false);
    };
    // A drag that started on a link shouldn't also follow it.
    const onDragStart = (event: DragEvent) => {
      if ((event.target as HTMLElement | null)?.closest?.(".segmented")) event.preventDefault();
    };

    const onResize = () => tracked.forEach((_, container) => place(container, activeOf(container)));

    document.addEventListener("click", onClick, true);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerCancel);
    document.addEventListener("dragstart", onDragStart);
    window.addEventListener("resize", onResize);
    return () => {
      structure.disconnect();
      attributes.disconnect();
      resize.disconnect();
      if (scheduled) cancelAnimationFrame(scheduled);
      window.clearTimeout(retry);
      tracked.forEach((state) => state.pending && window.clearTimeout(state.pending));
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerCancel);
      document.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return null;
}
