"use client";
import { GET_USER_PROFILE } from "@/lib/api/graphql";
import ProfileDetailsSkeleton from "@/lib/ui/useable-components/custom-skeletons/profile.details.skelton";
import styles from "./profile-details.module.css";
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
        <div className={styles.identity}>
          <div className={styles.avatar} aria-hidden="true">{initials}</div>
          <div className={styles.name}>{profileData?.profile?.name || "N/A"}</div>
        </div>
        <div className={styles.contacts}>
          {[
            { label: t("Email"), value: profileData?.profile?.email, verified: profileData?.profile?.emailIsVerified, icon: "pi-envelope", editLabel: t("update_email_title"), onEdit: handleUpdateEmailModal },
            { label: t("Phone"), value: profileData?.profile?.phone, verified: profileData?.profile?.phoneIsVerified, icon: "pi-phone", editLabel: t("updatePhoneTitle"), onEdit: handleUpdatePhoneModal },
          ].map((contact) => (
            <div className={styles.contact} key={contact.icon}>
              <span className={styles.contactIcon} aria-hidden="true"><i className={`pi ${contact.icon}`} /></span>
              <div className={styles.contactBody}>
                <p className={styles.label}>{contact.label}</p>
                <p className={styles.value}>{contact.value || "N/A"}</p>
                <span className={contact.verified ? styles.verified : styles.unverified}>
                  <i aria-hidden="true" className={`pi ${contact.verified ? "pi-check-circle" : "pi-info-circle"}`} />
                  {contact.verified ? t("verified") : t("not_verified")}
                </span>
              </div>
              <button type="button" aria-label={contact.editLabel} onClick={contact.onEdit} className={styles.edit}>
                <i aria-hidden="true" className="pi pi-pen-to-square" />
              </button>
            </div>
          ))}
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
