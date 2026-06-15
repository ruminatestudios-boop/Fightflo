import { LegalPage } from "@/components/shared/LegalPage";
import { PRIVACY_SECTIONS } from "@/lib/legal/content";

export default function PrivacyPage() {
  return <LegalPage title="Privacy policy" sections={PRIVACY_SECTIONS} />;
}
