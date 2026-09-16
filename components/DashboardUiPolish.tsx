"use client";

import { useEffect } from "react";

function normalizeDashboardChrome() {
  document.querySelectorAll<HTMLElement>('[class*="brandMark"]').forEach((mark) => {
    if (mark.textContent?.trim() !== "FR" || mark.querySelector("img")) return;
    mark.textContent = "";
    const image = document.createElement("img");
    image.src = "/icon.svg";
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    image.style.width = "100%";
    image.style.height = "100%";
    image.style.display = "block";
    image.style.borderRadius = "inherit";
    mark.appendChild(image);
  });

  document.querySelectorAll<HTMLElement>('[class*="liveStatus"]').forEach((status) => {
    if (status.textContent?.trim().toLowerCase() !== "syncing") return;
    status.setAttribute("aria-label", "Loading live status");
    for (const node of Array.from(status.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.toLowerCase().includes("syncing")) {
        node.textContent = " —";
      }
    }
  });
}

export default function DashboardUiPolish() {
  useEffect(() => {
    normalizeDashboardChrome();
    const observer = new MutationObserver(normalizeDashboardChrome);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
