import LegalPage, { legalMetadata } from "@/lib/legal/LegalPage";
import { privacyPolicy } from "@/lib/legal/content";

export const metadata = legalMetadata(privacyPolicy);

export default function PrivacyPolicyPage() {
  return <LegalPage document={privacyPolicy} />;
}
