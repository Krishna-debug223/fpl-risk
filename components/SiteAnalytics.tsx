"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const DISABLE_KEY = "fpl-risk-analytics-disabled";

export default function SiteAnalytics() {
  const [disabled, setDisabled] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setDisabled(window.localStorage.getItem(DISABLE_KEY) === "1");
    sync();
    setReady(true);
    window.addEventListener("fpl-risk-privacy-change", sync);
    return () => window.removeEventListener("fpl-risk-privacy-change", sync);
  }, []);

  if (!ready || disabled) return null;

  return (
    <>
      <Analytics
        beforeSend={(event) => {
          try {
            const url = new URL(event.url);
            url.search = "";
            url.hash = "";
            return { ...event, url: url.toString() };
          } catch {
            return event;
          }
        }}
      />
      <SpeedInsights />
    </>
  );
}
