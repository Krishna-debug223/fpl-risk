"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="status-page"><span className="eyebrow">APP ERROR</span><h1>Something went wrong.</h1><p>Your FPL data was not changed. Retry the page, or refresh if the issue continues.</p><button className="primary-button" onClick={() => reset()}>Try again</button></main>;
}
