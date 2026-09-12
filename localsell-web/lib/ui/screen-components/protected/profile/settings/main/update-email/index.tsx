"use client";
import styles from "../profile-dialog.module.css";
// Interfaces
import {
  IUpdateUserEmailArguments,
  IUpdateUserResponse,
} from "@/lib/utils/interfaces";

// Hooks
import { useAuth } from "@/lib/context/auth/auth.context";
import { useState } from "react";
import { useTranslations } from "next-intl";

// Components
import useToast from "@/lib/hooks/useToast";
import CustomDialog from "@/lib/ui/useable-components/custom-dialog";
import EmailEntry from "./email";

// Api
import { GET_USER_PROFILE, UPDATE_USER } from "@/lib/api/graphql";
import { ApolloError, useLazyQuery, useMutation } from "@apollo/client";
import useDebounceFunction from "@/lib/hooks/useDebounceForFunction";
import { isValidEmail } from "@/lib/utils/methods/validation";

export interface IUpdateEmailModalProps {
  isUpdateEmailModalVisible: boolean;
  handleUpdateEmailModal: () => void;
  userName?: string;
  userEmail?: string;
}

export default function UpdateEmailModal({
  isUpdateEmailModalVisible,
  handleUpdateEmailModal,
  userName,
  userEmail,
}: IUpdateEmailModalProps) {
  const [email, setEmail] = useState(userEmail || "");
  const { checkEmailExists } = useAuth();
  const { showToast } = useToast();
  const t = useTranslations();

  const [fetchProfile] = useLazyQuery(GET_USER_PROFILE, {
    fetchPolicy: "cache-and-network",
  });

  const [updateUser] = useMutation<
    IUpdateUserResponse,
    undefined | IUpdateUserEmailArguments
  >(UPDATE_USER, {
    onError: (error: ApolloError) => {
      showToast({
        type: "error",
        title: t("update_phone_name_update_error_title"),
        message: error.cause?.message || t("update_phone_name_update_error_msg"),
      });
    },
  });

  const handleChange = (val: string) => setEmail(val);

  const handleSubmit = useDebounceFunction(async () => {
    const clean = email.trim();
    if (!isValidEmail(clean)) {
      showToast({
        type: "error",
        title: t("update_phone_name_update_error_title"),
        message: t("please_enter_valid_email_address_message"),
      });
      return;
    }

    const exists = await checkEmailExists(clean);
    if (exists) {
      showToast({
        type: "error",
        title: t("update_phone_name_update_error_title"),
        message: t("email_already_in_use_message") ?? "That email is already in use.",
      });
      return;
    }

    await updateUser({
      variables: { name: userName ?? "", email: clean, emailIsVerified: false },
    });
    fetchProfile();
    handleUpdateEmailModal();
    showToast({
      type: "success",
      title: t("update_phone_name_verification_success_title"),
      message: t("email_saved_successfully_message") ?? "Email saved.",
    });
  }, 500);

  return (
    <CustomDialog visible={isUpdateEmailModalVisible} onHide={handleUpdateEmailModal} width="520px" className={styles.dialog}>
      <EmailEntry
        email={email}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
        handleUpdateEmailModal={handleUpdateEmailModal}
      />
    </CustomDialog>
  );
}
