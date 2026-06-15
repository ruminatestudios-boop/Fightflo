import { LegalPage } from "@/components/shared/LegalPage";
import { TERMS_SECTIONS } from "@/lib/legal/content";

export default function TermsPage() {
  return <LegalPage title="Terms of use" sections={TERMS_SECTIONS} />;
}
