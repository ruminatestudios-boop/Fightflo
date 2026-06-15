import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { LEGAL_LAST_UPDATED } from "@/lib/legal/content";

interface LegalPageProps {
  title: string;
  sections: ReadonlyArray<{ title: string; body: string }>;
}

export function LegalPage({ title, sections }: LegalPageProps) {
  return (
    <AppShell showBack>
      <article className="legal-page">
        <h1 className="legal-page-title">{title}</h1>
        <p className="legal-page-updated">Last updated {LEGAL_LAST_UPDATED}</p>
        {sections.map((section) => (
          <section key={section.title} className="legal-page-section">
            <h2 className="legal-page-heading">{section.title}</h2>
            <p className="legal-page-body">{section.body}</p>
          </section>
        ))}
        <p className="legal-page-back">
          <Link href="/">Back to coaching</Link>
        </p>
      </article>
    </AppShell>
  );
}
