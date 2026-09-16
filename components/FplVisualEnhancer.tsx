"use client";

import { useEffect } from "react";
import { getClubKitVars } from "@/lib/club-kits";
import styles from "./FplVisualEnhancer.module.css";

function applyKitVars(element: HTMLElement, teamCode: string) {
  const vars = getClubKitVars(teamCode);
  Object.entries(vars).forEach(([name, value]) => element.style.setProperty(name, value));
}

export default function FplVisualEnhancer() {
  useEffect(() => {
    const enhanceProjectionCards = () => {
      document.querySelectorAll<HTMLElement>('[class*="projectionCard"]').forEach((card) => {
        const frame = card.querySelector<HTMLElement>('[class*="teamBubble"]');
        if (!frame) return;

        // React can re-render the card after hydration. Only skip when the actual
        // jersey node is still present, otherwise rebuild it from the live team code.
        if (
          card.dataset.playerVisualEnhanced === "jersey" &&
          frame.querySelector(`.${styles.kitShirt}`)
        ) {
          return;
        }

        const teamCode = (frame.textContent ?? frame.getAttribute("data-team") ?? "FPL")
          .trim()
          .toUpperCase();

        card.dataset.playerVisualEnhanced = "jersey";
        card.classList.add(styles.visualCard);
        frame.classList.add(styles.kitFrame);
        frame.setAttribute("data-team", teamCode);
        frame.setAttribute("aria-label", `${teamCode} current team jersey`);
        frame.textContent = "";

        const shirt = document.createElement("span");
        shirt.className = styles.kitShirt;
        applyKitVars(shirt, teamCode);

        const collar = document.createElement("span");
        collar.className = styles.kitCollar;

        const badge = document.createElement("b");
        badge.textContent = teamCode;

        shirt.append(collar, badge);
        frame.appendChild(shirt);
      });
    };

    enhanceProjectionCards();

    const observer = new MutationObserver(enhanceProjectionCards);
    observer.observe(document.body, { childList: true, subtree: true });

    // Keep a short hydration safety-net so the jersey is restored even if React
    // replaces the projection cards without producing a useful mutation shape.
    const retry = window.setInterval(enhanceProjectionCards, 400);
    const stopRetry = window.setTimeout(() => window.clearInterval(retry), 10000);

    return () => {
      observer.disconnect();
      window.clearInterval(retry);
      window.clearTimeout(stopRetry);
    };
  }, []);

  return <span className={styles.mount} aria-hidden="true" />;
}
