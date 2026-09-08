// Components
import CustomButton from "@/lib/ui/useable-components/button";
import CustomTextField from "@/lib/ui/useable-components/input-field";

// Interfaces
import { ILoginWithEmailProps } from "@/lib/utils/interfaces";

// Icons
import EmailIcon from "@/public/assets/images/svgs/email";

// Hooks
import { useAuth } from "@/lib/context/auth/auth.context";
import { useConfig } from "@/lib/context/configuration/configuration.context";
import useToast from "@/lib/hooks/useToast";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { FiMail } from "react-icons/fi";

// Validation
import { isValidEmail } from "@/lib/utils/methods/validation";

//Import Googlr Icons from react-icons colored

import { FcGoogle } from "react-icons/fc";

export default function LoginWithEmail({
  handleChangePanel,
  formData,
  handleFormChange,
}: ILoginWithEmailProps) {
  // Hooks
  const t = useTranslations();
  const { setUser, checkEmailExists, isLoading } = useAuth();
  const { IS_GOOGLE_LOGIN_ENABLED } = useConfig();
  const { showToast } = useToast();

  // Inside component
  const [isValid, setIsValid] = useState(true);
  const [accountNotFound, setAccountNotFound] = useState(false);

  const handleChange = (email: string) => {
    handleFormChange("email", email);
    setUser((prev) => ({ ...prev, email }));
    setAccountNotFound(false);

    // Real-time email validation
    setIsValid(isValidEmail(email));
  };
  // Handlers
  const handleSubmit = async () => {
    const email = formData?.email ?? "";
    const valid = isValidEmail(email);
    setIsValid(valid);

    if (!email || !valid) {
      return showToast({
        type: "error",
        title: t("error"),
        message: t("please_enter_valid_email_address_message"),
      });
    }

    // Proceed only if valid
    const emailExists = await checkEmailExists(email);
    if (emailExists) {
      showToast({
        type: "success",
        title: t("Login"),
        message: t("Got_your_account_please_enter_your_password"),
      });
      return handleChangePanel(7); // go to password
    }

    setAccountNotFound(true);
    showToast({
      type: "info",
      title: t("sign_up_label"),
      message: t("no_account_found_create_or_google_message"),
    });
  };

  return (
    <div className="flex flex-col items-start justify-start w-full h-full px-4 py-6 md:px-8 dark:bg-gray-900 dark:text-gray-300">
      <EmailIcon lightColor="#000000" darkColor="#FFFFFF" />

      <div className="flex flex-col w-full mt-4">
        <h3 className="text-xl md:text-2xl font-semibold dark:text-white">
          {t("whats_your_email_label")}?
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {t("well_check_if_you_have_an_account_message")}
        </p>
      </div>

      <div className="flex flex-col gap-y-2 mt-6 w-full">
        {/* Email Input Field with Icon */}
        <div className="relative w-full">
          <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
          <CustomTextField
            value={formData?.email}
            showLabel={false}
            name="email"
            type="text"
            placeholder="example@domain.com"
            onChange={(e) => handleChange(e.target.value)}
            className={`pl-10 w-full py-2 px-3 rounded-md border ${
              isValid ? "border-gray-300" : "border-red-500"
            } focus:outline-none focus:ring-2 focus:ring-primary-color dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300`}
          />
        </div>

        {/* Validation message */}
        <div className="min-h-[20px]">
          {!isValid && (
            <p className="text-red-500 text-sm">
              {t("please_enter_valid_email_address_message")}
            </p>
          )}
          {accountNotFound && isValid && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {t("no_account_found_use_signup_message")}
            </p>
          )}
        </div>

        {accountNotFound && (
          <button
            type="button"
            onClick={() => handleChangePanel(2)}
            className="w-full md:w-auto self-center rounded-full border border-primary-color px-4 py-2 text-sm font-medium text-primary-color transition-colors hover:bg-primary-color/5"
          >
            {t("sign_up_label")}
          </button>
        )}

        {/* Continue with Google — only when Google login is configured */}
        {IS_GOOGLE_LOGIN_ENABLED && (
          <button
            type="button"
            onClick={() => handleChangePanel(0)}
            className="flex items-center justify-center gap-2 rounded-full py-2 px-4 text-sm font-medium dark:bg-gray-500 dark:text-gray-200 dark:hover:bg-gray-400 text-gray-700 hover:bg-gray-100 transition-colors duration-200 w-full md:w-auto self-center"
          >
            <FcGoogle className="text-lg" />
            {t("continue_with_google_instead_label")}
          </button>
        )}
      </div>

      {/* Submit Email */}
      <CustomButton
        label={t("Continue_with_mail")}
        loading={isLoading}
        onClick={handleSubmit}
        className={`bg-primary-color text-white font-medium flex items-center justify-center gap-x-4 px-3 rounded-full border border-primary-color p-3 mt-6 w-full md:w-72 self-center`}
      />
    </div>
  );
}
