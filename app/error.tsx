"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="status-page">
      <h1>Something went wrong</h1>
      <p>This page hit an error while loading. Nothing in your FPL team was changed — FPL Prism only reads public data. Try again, or reload if it keeps happening.</p>
      <button type="button" className="btn btn-primary" onClick={() => reset()}>Try again</button>
    </main>
  );
}
