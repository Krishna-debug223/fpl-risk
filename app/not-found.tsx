import Link from "next/link";

export default function NotFound() {
  return (
    <main className="status-page">
      <p className="small muted">Error 404</p>
      <h1>Page not found</h1>
      <p>This address doesn&apos;t match any page on FPL Prism. It may have moved, or the link may be mistyped.</p>
      <div className="row" style={{ justifyContent: "center" }}>
        <Link href="/dashboard" className="btn btn-primary">Go to the dashboard</Link>
        <Link href="/" className="btn">Home</Link>
      </div>
    </main>
  );
}
