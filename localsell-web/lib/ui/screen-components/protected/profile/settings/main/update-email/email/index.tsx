import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import CustomTextField from "@/lib/ui/useable-components/input-field";
import { useTranslations } from "next-intl";

export interface IEmailEntryProps {
  email: string;
  handleChange: (val: string) => void;
  handleSubmit: () => void;
  handleUpdateEmailModal: () => void;
}

const EmailEntry = ({
  email,
  handleChange,
  handleSubmit,
  handleUpdateEmailModal,
}: IEmailEntryProps) => {
  const [loading, setLoading] = useState(false);
  const t = useTranslations();

  const handleSaveClick = async () => {
    setLoading(true);
    try {
      await handleSubmit();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-between px-4 w-full items-center dark:bg-gray-900 dark:text-white py-6">
      <h2 className="font-extrabold text-lg md:text-xl lg:text-2xl my-2 text-start w-full leading-8">
        {t("update_email_title") ?? "What's your email?"}
      </h2>

      <div className="flex my-2 w-full">
        <CustomTextField
          aria-label={t("update_email_title")}
          autoComplete="email"
          type="email"
          name="email"
          showLabel={false}
          placeholder="example@domain.com"
          value={email}
          onChange={(e) => handleChange(e.target.value)}
        />
      </div>

      <div className="flex flex-row w-full justify-between mt-2 gap-2 md:gap-0">
        <button
          type="button"
          className="profile-dialog-cancel"
          onClick={handleUpdateEmailModal}
        >
          {t("update_phone_name_cancel_button")}
        </button>

        <button
          type="button"
          onClick={handleSaveClick}
          disabled={loading}
          aria-label={loading ? t("update_phone_name_saving_aria") : t("update_phone_name_save_aria")}
          className={`bg-primary-color text-white flex items-center justify-center rounded-full p-2 sm:p-3 w-full md:w-[268px] mb-4 text-sm sm:text-lg font-medium ${
            loading ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          {loading ? (
            <FontAwesomeIcon icon={faSpinner} spin className="text-white text-lg" />
          ) : (
            t("update_phone_name_save_button")
          )}
        </button>
      </div>
    </div>
  );
};

export default EmailEntry;
