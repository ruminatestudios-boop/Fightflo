import Link from "next/link";
import { GlassPage } from "@/components/shared/GlassPage";
import { LEGAL_LAST_UPDATED } from "@/lib/legal/content";

interface LegalPageProps {
  title: string;
  sections: ReadonlyArray<{ title: string; body: string }>;
}

export function LegalPage({ title, sections }: LegalPageProps) {
  return (
    <GlassPage showBack>
      <header className="glass-greeting">
        <p className="glass-greeting-sub">Legal</p>
        <h1 className="glass-greeting-title glass-greeting-title--sm">{title}</h1>
        <p className="glass-greeting-sub legal-page-updated">
          Last updated {LEGAL_LAST_UPDATED}
        </p>
      </header>

      <article className="legal-page">
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
    </GlassPage>
  );
}
