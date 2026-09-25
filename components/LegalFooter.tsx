import Link from "next/link";

export default function LegalFooter() {
  return (
    <footer className="public-legal-footer">
      <span>FPL Prism is an independent project and is not affiliated with, endorsed by or sponsored by the Premier League.</span>
      <span><Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link></span>
    </footer>
  );
}
