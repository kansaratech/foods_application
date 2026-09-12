"use client";
import { GET_USER_PROFILE } from "@/lib/api/graphql";
import ProfileDetailsSkeleton from "@/lib/ui/useable-components/custom-skeletons/profile.details.skelton";
import TextComponent from "@/lib/ui/useable-components/text-field";
import { getInitials } from "@/lib/utils/methods";
import { useQuery } from "@apollo/client";
import UpdatePhoneModal from "../../settings/main/update-phone";
import UpdateEmailModal from "../../settings/main/update-email";
import { useState } from "react";
import "primeicons/primeicons.css";
import { useTranslations } from "next-intl";

export default function PersonalInfoMain() {
  const t = useTranslations();
  const [isUpdatePhoneModalVisible, setIsUpdatePhoneModalVisible] =
    useState<boolean>(false);
  const [isUpdateEmailModalVisible, setIsUpdateEmailModalVisible] =
    useState<boolean>(false);

  // ActiveStep state variable
  const [activeStep, setActiveStep] = useState<number>(0);

  // Get profile data by using the query
  const { data: profileData, loading: profileLoading } = useQuery(
    GET_USER_PROFILE,
    {
      fetchPolicy: "cache-and-network",
    },
  );

  // Get initials from the name
  const initials = getInitials(profileData?.profile?.name);

  const handleUpdatePhoneModal = () => {
    setActiveStep(0); // Reset active step to 0 when opening the modal
    setIsUpdatePhoneModalVisible(!isUpdatePhoneModalVisible);
  };

  const handleUpdateEmailModal = () => {
    setIsUpdateEmailModalVisible(!isUpdateEmailModalVisible);
  };

  if (!profileLoading) {
    return (
      <div className="p-6 w-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-4 mb-6 ">
          {/* Custom Avatar with Tailwind */}
          <div className="relative h-16 w-16 flex-shrink-0 bg-primary-light dark:bg-gray-800 rounded-full border-2 border-white dark:border-gray-700 shadow-sm  shadow-gray-400 dark:shadow-black/40">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-sm font-medium text-gray-500 dark:text-gray-200">
              {initials}
            </div>
          </div>
          <TextComponent
            text={profileData?.profile?.name || "N/A"}
            className="md:text-xl text-lg font-semibold text-gray-900 dark:text-white"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ">
          <div>
            <div className="flex items-center gap-2">
              <TextComponent
                text={t("Email")}
                className="text-black dark:text-white font-semibold text-base md:text-lg"
              />
              <button
                type="button"
                aria-label={t("update_email_title")}
                onClick={handleUpdateEmailModal}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light text-primary-color"
              >
                <i
                  aria-hidden="true"
                  className="pi pi-pen-to-square cursor-pointer dark:text-white text-sm"
                />
              </button>
            </div>
            <button
              type="button"
              onClick={handleUpdateEmailModal}
              title="Update email address"
              className="text-secondary-color dark:text-primary-color hover:text-primary-dark font-normal text-sm md:text-base cursor-pointer"
            >
              {profileData?.profile?.email || "N/A"}
            </button>
            <TextComponent
              text={
                profileData?.profile?.emailIsVerified
                  ? t("verified")
                  : t("not_verified")
              }
              className={`text-sm font-medium ${profileData?.profile?.emailIsVerified ? "text-secondary-color dark:text-primary-color" : "text-red-500 dark:text-red-500"}`}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <TextComponent
                text={t("Phone")}
                className="text-black dark:text-gray-200 font-semibold text-base md:text-lg"
              />
              <button
                type="button"
                aria-label={t("updatePhoneTitle")}
                onClick={handleUpdatePhoneModal}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light text-primary-color"
              >
                <i
                  aria-hidden="true"
                  className="pi pi-pen-to-square cursor-pointer dark:text-white text-sm"
                />
              </button>
            </div>
            <button
              type="button"
              onClick={handleUpdatePhoneModal}
              title="Update phone number"
              className=" text-secondary-color dark:text-primary-color hover:text-primary-dark font-normal text-sm md:text-base cursor-pointer"
            >
              {profileData?.profile?.phone || "N/A"}
            </button>
            <TextComponent
              text={
                profileData?.profile?.phoneIsVerified
                  ? t("verified")
                  : t("not_verified")
              }
              className={`text-sm font-medium ${profileData?.profile?.phoneIsVerified ? "text-secondary-color dark:text-primary-color" : "text-red-500 dark:text-red-500"}`}
            />
          </div>
        </div>
        <UpdatePhoneModal
          userPhone={profileData?.profile?.phone || ""}
          handleUpdatePhoneModal={handleUpdatePhoneModal}
          ActiveStep={activeStep}
          setActiveStep={setActiveStep}
          isUpdatePhoneModalVisible={isUpdatePhoneModalVisible}
        />
        <UpdateEmailModal
          userEmail={profileData?.profile?.email || ""}
          userName={profileData?.profile?.name || ""}
          handleUpdateEmailModal={handleUpdateEmailModal}
          isUpdateEmailModalVisible={isUpdateEmailModalVisible}
        />
      </div>
    );
  } else {
    return <ProfileDetailsSkeleton />;
  }
}
