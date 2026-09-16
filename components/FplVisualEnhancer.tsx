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
        if (card.dataset.playerVisualEnhanced === "jersey") return;

        const frame = card.querySelector<HTMLElement>('[class*="teamBubble"]');
        if (!frame) return;

        const teamCode = (frame.textContent ?? "FPL").trim().toUpperCase();
        card.dataset.playerVisualEnhanced = "jersey";
        card.classList.add(styles.visualCard);
        frame.classList.add(styles.kitFrame);
        frame.textContent = "";
        frame.setAttribute("aria-label", `${teamCode} home jersey`);

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

    return () => observer.disconnect();
  }, []);

  return <span className={styles.mount} aria-hidden="true" />;
}
