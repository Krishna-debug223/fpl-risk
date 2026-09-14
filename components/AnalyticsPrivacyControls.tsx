"use client";

import { useEffect, useState } from "react";

const DISABLE_KEY = "fpl-risk-analytics-disabled";
const FREE_TRANSFER_KEY = "fpl-risk-free-transfers";

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

  function clearPreferences() {
    window.localStorage.removeItem(FREE_TRANSFER_KEY);
    setCleared(true);
  }

  return (
    <div className="privacy-control">
      <div>
        <strong>Anonymous analytics on this device</strong>
        <span>{disabled ? "Disabled" : "Enabled"}</span>
      </div>
      <div className="privacy-actions">
        <button type="button" onClick={toggle}>{disabled ? "Enable analytics" : "Disable analytics"}</button>
        <button type="button" className="quiet-privacy-button" onClick={clearPreferences}>{cleared ? "Local preference cleared" : "Clear local preference"}</button>
      </div>
    </div>
  );
}
