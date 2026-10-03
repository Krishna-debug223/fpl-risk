"use client";

import { useEffect, useState } from "react";

const DISABLE_KEY = "fpl-risk-analytics-disabled";
const SAVED_SETTING_KEYS = ["fpl-risk-team-id", "fpl-risk-free-transfers", "fpl-risk-strategy-mode", "fpl-risk-decision-context"];

export default function AnalyticsPrivacyControls() {
  const [disabled, setDisabled] = useState(false);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    setDisabled(window.localStorage.getItem(DISABLE_KEY) === "1");
  }, []);

  function toggle() {
    const next = !disabled;
    setDisabled(next);
    if (next) window.localStorage.setItem(DISABLE_KEY, "1");
    else window.localStorage.removeItem(DISABLE_KEY);
    window.dispatchEvent(new Event("fpl-risk-privacy-change"));
  }

  function clearSettings() {
    SAVED_SETTING_KEYS.forEach((key) => window.localStorage.removeItem(key));
    setCleared(true);
  }

  return (
    <div className="privacy-control card card-tight">
      <div className="row-between">
        <div>
          <strong>Analytics on this device</strong>
          <div className="small muted">{disabled ? "Off — no analytics events are sent from this browser." : "On — anonymous page views and product events."}</div>
        </div>
        <button type="button" className="btn btn-sm" onClick={toggle} aria-pressed={disabled}>{disabled ? "Turn analytics on" : "Turn analytics off"}</button>
      </div>
      <div className="row-between" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
        <div>
          <strong>Settings saved in this browser</strong>
          <div className="small muted">Team ID, free transfers, planner style and ranking preference. Doesn&apos;t affect an account.</div>
        </div>
        <button type="button" className="btn btn-sm" onClick={clearSettings} disabled={cleared}>{cleared ? "Cleared" : "Clear saved settings"}</button>
      </div>
    </div>
  );
}
