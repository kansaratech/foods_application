"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

import CustomButton from "@/lib/ui/useable-components/button";
import PhoneIcon from "@/lib/utils/assets/svg/phone";

import { useAuth } from "@/lib/context/auth/auth.context";
import useToast from "@/lib/hooks/useToast";

import { IAuthFormData } from "@/lib/utils/interfaces";

const OTP_LEN = 4;

interface IProps {
  formData: IAuthFormData;
  phoneOtp: string;
  setPhoneOtp: (v: string) => void;
  handleChangePanel: (index: number) => void;
}

export default function PhoneOtp({
  formData,
  phoneOtp,
  setPhoneOtp,
  handleChangePanel,
}: IProps) {
  const t = useTranslations();
  const { handlePhoneLogin, sendOtpToPhoneNumber, isLoading } = useAuth();
  const { showToast } = useToast();

  const [digits, setDigits] = useState<string[]>(() => {
    const seed = (phoneOtp || "").replace(/\D/g, "").slice(0, OTP_LEN).split("");
    return Array.from({ length: OTP_LEN }, (_, i) => seed[i] ?? "");
  });
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const phone = formData?.phone ?? "";

  const setDigit = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    setPhoneOtp(next.join(""));
    if (clean && i < OTP_LEN - 1) inputs.current[i + 1]?.focus();
  };

  const handleSubmit = async () => {
    const code = digits.join("");
    if (code.length !== OTP_LEN) {
      showToast({
        type: "error",
        title: t("otp_error_label"),
        message: t("please_enter_valid_otp_code_message"),
      });
      return;
    }
    const res = await handlePhoneLogin(phone, code);
    if (!res.ok) {
      setDigits(Array(OTP_LEN).fill(""));
      setPhoneOtp("");
      inputs.current[0]?.focus();
      return;
    }
    // New account with no name yet → collect it; otherwise the context has
    // already closed the modal.
    if (res.isNewUser && !res.hasName) handleChangePanel(12);
  };

  const handleResend = async () => {
    await sendOtpToPhoneNumber(phone);
    showToast({
      type: "success",
      title: t("otp_resent_label"),
      message: t("resent_otp_code_to_your_phone_message"),
    });
  };

  return (
    <div className="flex flex-col items-start justify-start w-full h-full px-4 py-6 md:px-8 dark:bg-gray-900 dark:text-white">
      <PhoneIcon />

      <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white mt-4 mb-1">
        {t("OTP_Code_Sent")}
      </h2>
      <p className="text-md font-semibold text-gray-800 dark:text-white mb-1 break-words">
        {phone || t("your_phone_number") || "your phone number"}
      </p>
      <p className="text-base text-gray-600 dark:text-gray-400 mb-6">
        {t("please_check_your_inbox_message_1")}
      </p>

      <div className="w-full mb-6 flex justify-center gap-3">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            aria-label={`OTP digit ${i + 1}`}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
              // Enter on the last digit confirms, like any OTP form (#49).
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            className="w-12 h-14 md:w-14 md:h-16 text-xl text-center border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-lg focus:outline-none focus:border-primary-color focus:ring-2 focus:ring-primary-color/20"
          />
        ))}
      </div>

      <CustomButton
        label={t("continue_label")}
        loading={isLoading}
        onClick={handleSubmit}
        className="bg-primary-color text-white flex items-center justify-center rounded-full p-3 w-full mb-3 h-12"
      />
      <CustomButton
        label={t("resend_otp_label")}
        onClick={handleResend}
        className="bg-white text-black dark:bg-gray-700 dark:text-white flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 p-3 w-full h-12 mb-3"
      />
      <button
        type="button"
        onClick={() => handleChangePanel(10)}
        className="self-center text-sm text-gray-500 hover:underline"
      >
        {t("change_number_label") ?? "Change number"}
      </button>
    </div>
  );
}
