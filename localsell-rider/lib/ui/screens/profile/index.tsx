import WorkspacePage from "@/lib/ui/layouts/workspace-page";
// Core
import { useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Components
import ProfileHeader from "../../screen-components/profile/header";
import ProfileMain from "../../screen-components/profile/view/main";

// Types & Interfaces
import { useApptheme } from "@/lib/context/global/theme.context";
import { TRiderProfileBottomBarBit } from "@/lib/utils/types/rider";
import ReactNativeModal from "react-native-modal";
import DrivingLicenseForm from "../../screen-components/profile/forms/liecense";
import VehiclePlateForm from "../../screen-components/profile/forms/vehicle";
import RiderDocumentForm from "../../screen-components/profile/forms/rider-document";

export default function ComponentName() {
  // States
  const [isFormOpened, setIsFormOpened] =
    useState<TRiderProfileBottomBarBit>(null);

  // Hooks
  const { appTheme } = useApptheme();
  return (
    <WorkspacePage
      title="Profile"
      description="Manage your personal details and rider documents."
      compact
    >
      <SafeAreaView
        style={{ flex: 1, backgroundColor: appTheme.screenBackground }}
      >
        <FlatList
          style={{ flex: 1, backgroundColor: appTheme.screenBackground }}
          contentContainerStyle={{ flexGrow: 1 }}
          data={[
            <ProfileHeader />,
            <ProfileMain
              isFormOpened={isFormOpened}
              setIsFormOpened={setIsFormOpened}
            />,
          ]}
          renderItem={(item) => {
            return item.item;
          }}
        />
        {isFormOpened !== null && (
          <ReactNativeModal
            isVisible={isFormOpened !== null}
            animationIn={"slideInUp"}
            animationOut={"slideOutDown"}
            onBackdropPress={() => {
              setIsFormOpened(null);
            }}
            style={{
              margin: Platform.OS === "web" ? 24 : 0,
              justifyContent: Platform.OS === "web" ? "center" : "flex-end",
              alignItems: Platform.OS === "web" ? "center" : undefined,
            }}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={{
                width: "100%",
                maxHeight: Platform.OS === "web" ? "90%" : "70%",
                maxWidth: Platform.OS === "web" ? 560 : undefined,
                borderRadius: Platform.OS === "web" ? 20 : undefined,
                backgroundColor: appTheme.themeBackground,
                borderWidth: 1,
                borderColor: appTheme.borderLineColor,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 2,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: {
                  width: 0,
                  height: 2,
                },
                shadowOpacity: 0.25,
                shadowRadius: 4,
              }}
            >
              {isFormOpened === "LICENSE_FORM" && (
                <DrivingLicenseForm setIsFormOpened={setIsFormOpened} />
              )}
              {isFormOpened === "VEHICLE_FORM" && (
                <VehiclePlateForm setIsFormOpened={setIsFormOpened} />
              )}
              {isFormOpened === "RIDER_DOC_LICENSE" && (
                <RiderDocumentForm
                  kind="LICENSE"
                  setIsFormOpened={setIsFormOpened}
                />
              )}
              {isFormOpened === "RIDER_DOC_IDENTITY" && (
                <RiderDocumentForm
                  kind="IDENTITY"
                  setIsFormOpened={setIsFormOpened}
                />
              )}
              {isFormOpened === "RIDER_DOC_BANK" && (
                <RiderDocumentForm
                  kind="BANK"
                  setIsFormOpened={setIsFormOpened}
                />
              )}
              {isFormOpened === null && <></>}
            </KeyboardAvoidingView>
          </ReactNativeModal>
        )}
      </SafeAreaView>
    </WorkspacePage>
  );
}
