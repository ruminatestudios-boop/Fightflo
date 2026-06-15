import Link from "next/link";

export function LegalFooter() {
  return (
    <footer className="legal-footer">
      <Link href="/privacy">Privacy</Link>
      <span aria-hidden>·</span>
      <Link href="/terms">Terms</Link>
    </footer>
  );
}
