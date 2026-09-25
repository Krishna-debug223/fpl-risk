import Link from "next/link";

export default function NotFound() {
  return <main className="status-page"><span className="eyebrow">404</span><h1>That page is offside.</h1><p>The page you requested does not exist.</p><Link href="/" className="primary-button">Back to FPL Prism</Link></main>;
}
