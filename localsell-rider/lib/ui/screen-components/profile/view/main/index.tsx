import { useApptheme } from "@/lib/context/global/theme.context";
import { IRiderProfileMainProps } from "@/lib/utils/interfaces/rider-profile.interface";
import { View } from "react-native";
import DocumentsSection from "../docs/documents";
import OtherDetailsSection from "../docs/other";
import RiderDocsSection from "../docs/rider-documents";

export default function ProfileMain({
  setIsFormOpened,
}: IRiderProfileMainProps) {
  // Hooks
  const { appTheme } = useApptheme();
  return (
    <View
      className="flex flex-col items-center w-full"
      style={{ backgroundColor: appTheme.screenBackground }}
    >
      <DocumentsSection setIsFormOpened={setIsFormOpened} />
      <RiderDocsSection setIsFormOpened={setIsFormOpened} />
      <OtherDetailsSection />
    </View>
  );
}
