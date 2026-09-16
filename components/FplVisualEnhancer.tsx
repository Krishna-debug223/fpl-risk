"use client";

import { useEffect } from "react";
import styles from "./FplVisualEnhancer.module.css";

type VisualPlayer = {
  code: number;
  web_name: string;
};

type BootstrapVisualPayload = {
  elements?: VisualPlayer[];
};

const normalizeName = (value: string) => value.trim().toLocaleLowerCase();
const playerPhotoUrl = (code: number) =>
  `https://resources.premierleague.com/premierleague/photos/players/250x250/p${code}.png`;

export default function FplVisualEnhancer() {
  useEffect(() => {
    let cancelled = false;
    let observer: MutationObserver | null = null;

    async function installPlayerPhotos() {
      try {
        const response = await fetch("/api/fpl/bootstrap", { cache: "no-store" });
        if (!response.ok || cancelled) return;

        const payload = (await response.json()) as BootstrapVisualPayload;
        const playerByName = new Map(
          (payload.elements ?? []).map((player) => [normalizeName(player.web_name), player]),
        );

        const enhanceProjectionCards = () => {
          document.querySelectorAll<HTMLElement>('[class*="projectionCard"]').forEach((card) => {
            if (card.dataset.playerVisualEnhanced === "true") return;

            const playerName = card.querySelector("h3")?.textContent ?? "";
            const player = playerByName.get(normalizeName(playerName));
            const frame = card.querySelector<HTMLElement>('[class*="teamBubble"]');
            if (!player || !frame) return;

            card.dataset.playerVisualEnhanced = "true";
            card.classList.add(styles.visualCard);
            frame.classList.add(styles.photoFrame);

            const image = document.createElement("img");
            image.src = playerPhotoUrl(player.code);
            image.alt = "";
            image.loading = "lazy";
            image.decoding = "async";
            image.className = styles.playerPhoto;
            image.setAttribute("aria-hidden", "true");
            image.addEventListener("error", () => {
              image.remove();
              frame.classList.remove(styles.photoFrame);
              card.classList.remove(styles.visualCard);
            });

            frame.appendChild(image);
          });
        };

        enhanceProjectionCards();
        observer = new MutationObserver(enhanceProjectionCards);
        observer.observe(document.body, { childList: true, subtree: true });
      } catch {
        // Visual enhancement is optional. The underlying app remains fully usable.
      }
    }

    void installPlayerPhotos();

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, []);

  return <span className={styles.mount} aria-hidden="true" />;
}
