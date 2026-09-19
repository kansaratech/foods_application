import LegalPage, { legalMetadata } from "@/lib/legal/LegalPage";
import { termsConditions } from "@/lib/legal/content";

export const metadata = legalMetadata(termsConditions);

export default function TermsAndConditionsPage() {
  return <LegalPage document={termsConditions} />;
}
