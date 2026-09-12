"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import CustomButton from "@/lib/ui/useable-components/button";
import CustomPhoneTextField from "@/lib/ui/useable-components/phone-input-field";
import PhoneIcon from "@/lib/utils/assets/svg/phone";

import { useAuth } from "@/lib/context/auth/auth.context";
import useToast from "@/lib/hooks/useToast";

import { IAuthFormData } from "@/lib/utils/interfaces";

interface IProps {
  formData: IAuthFormData;
  handleFormChange: (name: string, value: string) => void;
  handleChangePanel: (index: number) => void;
}

// Digits only, must carry a country code (11–15 digits once "91" is prefixed).
const isValidPhone = (raw: string) => {
  const d = (raw || "").replace(/\D/g, "");
  return d.length >= 11 && d.length <= 15;
};

export default function LoginWithPhone({
  formData,
  handleFormChange,
  handleChangePanel,
}: IProps) {
  const t = useTranslations();
  const { sendOtpToPhoneNumber, isLoading } = useAuth();
  const { showToast } = useToast();
  const [touched, setTouched] = useState(false);

  const phone = formData?.phone ?? "";
  const valid = isValidPhone(phone);

  const handleSubmit = async () => {
    setTouched(true);
    if (!valid) {
      showToast({
        type: "error",
        title: t("error"),
        message: t("please_enter_valid_phone_number") ?? "Enter a valid mobile number",
      });
      return;
    }
    await sendOtpToPhoneNumber(phone);
    handleChangePanel(11);
  };

  return (
    <div className="flex flex-col items-start justify-start w-full h-full px-4 py-6 md:px-8 dark:bg-gray-900 dark:text-white">
      <PhoneIcon />

      <div className="flex flex-col w-full mt-4">
        <h3 className="text-xl md:text-2xl font-semibold dark:text-white">
          {t("whats_your_mobile_number_label") ?? "What's your mobile number?"}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {t("we_will_send_you_a_code_on_whatsapp_message") ??
            "We'll send you a one-time code on WhatsApp."}
        </p>
      </div>

      <div
        className="flex flex-col gap-y-2 mt-6 w-full"
        onKeyDown={(e) => {
          // Enter anywhere in the phone field sends the code (#49).
          if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
          }
        }}
      >
        <CustomPhoneTextField
          value={phone}
          showLabel={false}
          type="text"
          mask="999 999 999 999"
          name="phone"
          onChange={(val) => {
            handleFormChange("phone", val);
            setTouched(false);
          }}
        />
        <div className="min-h-[20px]">
          {touched && !valid && (
            <p className="text-red-500 text-sm">
              {t("please_enter_valid_phone_number") ?? "Enter a valid mobile number"}
            </p>
          )}
        </div>
      </div>

      <CustomButton
        label={t("continue_label")}
        loading={isLoading}
        onClick={handleSubmit}
        className="bg-primary-color text-white font-medium flex items-center justify-center gap-x-4 px-3 rounded-full border border-primary-color p-3 mt-6 w-full md:w-72 self-center"
      />
    </div>
  );
}
