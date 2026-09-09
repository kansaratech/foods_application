"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "@apollo/client";

import CustomButton from "@/lib/ui/useable-components/button";
import CustomTextField from "@/lib/ui/useable-components/input-field";
import PersonIcon from "@/lib/utils/assets/svg/person";

import { useAuth } from "@/lib/context/auth/auth.context";
import useToast from "@/lib/hooks/useToast";

import { UPDATE_USER } from "@/lib/api/graphql";

// Shown once, right after a brand-new mobile-number signup, to capture a name.
export default function CompleteProfile() {
  const t = useTranslations();
  const { user, setUser, finishAuthedSession, isLoading, setIsLoading } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(user?.name ?? "");

  const [updateUser] = useMutation(UPDATE_USER);

  const handleSubmit = async () => {
    const clean = name.trim();
    if (!/^[A-Za-z][A-Za-z\s.]{1,49}$/.test(clean)) {
      showToast({
        type: "error",
        title: t("error"),
        message: t("please_enter_a_valid_name_message"),
      });
      return;
    }
    try {
      setIsLoading(true);
      await updateUser({
        variables: { name: clean, phoneIsVerified: true },
      });
      setUser((prev) => (prev ? { ...prev, name: clean } : prev));
      showToast({
        type: "success",
        title: t("register_label"),
        message: t("successfully_registered_your_account_message"),
      });
      finishAuthedSession();
    } catch {
      // A failed name save shouldn't trap the user out of a valid session.
      finishAuthedSession();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start justify-start w-full h-full px-4 py-6 md:px-8 dark:bg-gray-900 dark:text-white">
      <PersonIcon lightColor="#000000" darkColor="#FFFFFF" />

      <div className="flex flex-col w-full mt-4">
        <h3 className="text-xl md:text-2xl font-semibold dark:text-white">
          {t("whats_your_name_label") ?? "What's your name?"}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {t("so_stores_and_riders_know_who_to_reach_message") ??
            "So stores and delivery partners know who to reach."}
        </p>
      </div>

      <div className="w-full mt-6">
        <CustomTextField
          type="text"
          name="name"
          showLabel={false}
          placeholder={t("nameLabel")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <CustomButton
        label={t("continue_label")}
        loading={isLoading}
        onClick={handleSubmit}
        className="bg-primary-color text-white font-medium flex items-center justify-center rounded-full border border-primary-color p-3 mt-6 w-full md:w-72 self-center"
      />
    </div>
  );
}
