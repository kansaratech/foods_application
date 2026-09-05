"use client";

// formik imports
import { Formik, Form, Field, ErrorMessage } from "formik";

// Components from primeReact
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";

// libraries and utils
import { useRouter } from "next/navigation";
import { sendEmail } from "@/lib/utils/methods";
import "react-phone-input-2/lib/style.css";

// interfaces
import { VendorFormValues } from "@/lib/utils/interfaces/Rider-restaurant.interface";

// component
import PhoneNumberInput from "./phoneNumberInput/PhoneNumberInput";

// validation Schema
import emailValidationSchema from "./validationSchema";

// hooks
import useToast from "@/lib/hooks/useToast";
import { useTranslations } from "next-intl";

interface formProps {
  heading: string;
  role: string;
  eyebrow?: string;
  subheading?: string;
  bullets?: string[];
}

const initialValues: VendorFormValues = {
  firstName: "",
  lastName: "",
  phoneNumber: "",
  email: "",
  password: "",
  confirmPassword: "",
  termsAccepted: false,
};

const fieldClass =
  "w-full min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#1c5bc7] focus:bg-white focus:ring-4 focus:ring-[#1c5bc7]/10 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100";

const EmailForm: React.FC<formProps> = ({
  heading,
  role,
  eyebrow,
  subheading,
  bullets,
}) => {
  const { showToast } = useToast();
  const router = useRouter();
  const t = useTranslations();

  const handleSubmit = async (formData: VendorFormValues) => {
    const templateParams = {
      ...formData,
      role: role,
      isRider: false,
    };

    try {
      await sendEmail("template_eogfh2k", templateParams);

      showToast({
        type: "success",
        title: t("toast_success"),
        message: t("form_submitted_successfully"),
        duration: 4000,
      });

      router.push("/");
    } catch (error) {
      console.error("Failed to send email:", error);

      showToast({
        type: "error",
        title: t("toast_error"),
        message: t("failed_to_submit_form_please_try_again"),
        duration: 4000,
      });
    }
  };

  return (
    <section
      id="apply"
      className="mx-auto grid max-w-6xl scroll-mt-24 items-stretch gap-8 px-4 lg:grid-cols-[0.86fr_1.14fr] lg:gap-10"
    >
      {/* Left — pitch */}
      <div className="relative overflow-hidden rounded-[2rem] bg-[#16293f] p-7 text-white shadow-[0_24px_60px_rgba(22,41,63,0.16)] sm:p-9 lg:p-10">
        <div aria-hidden="true" className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full border-[55px] border-white/[0.045]" />
        <div className="relative">
        {eyebrow && (
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-[#8fbdf0]">
            {eyebrow}
          </p>
        )}
        <h2 className="text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl">
          {heading}
        </h2>
        {subheading && (
          <p className="mt-4 text-base leading-7 text-white/65">
            {subheading}
          </p>
        )}
        {bullets && bullets.length > 0 && (
          <ul className="mt-6 space-y-3">
            {bullets.map((b) => (
              <li
                key={b}
                className="flex items-start gap-3 text-sm text-white/75"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1c5bc7] text-[11px] font-black text-white"
                >
                  ✓
                </span>
                {b}
              </li>
            ))}
          </ul>
        )}
        </div>
      </div>

      {/* Right — form card */}
      <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_28px_80px_rgba(45,24,31,0.10)] dark:border-gray-700 dark:bg-gray-800 sm:p-8 lg:p-10">
        <div className="mb-7 flex items-center justify-between gap-4 border-b border-slate-100 pb-5 dark:border-gray-700">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1c5bc7]">Application form</p><h3 className="mt-1 text-xl font-bold tracking-[-0.02em] text-slate-950 dark:text-white">Tell us about yourself</h3></div>
          <span className="hidden rounded-full bg-[#e8f0fc] px-3 py-1 text-[10px] font-bold text-[#b95e08] sm:block">Takes 2 minutes</span>
        </div>
        <Formik
          initialValues={initialValues}
          validationSchema={emailValidationSchema(t)}
          onSubmit={handleSubmit}
        >
          {({ values, setFieldValue, isSubmitting }) => (
            <Form className="grid gap-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-gray-300">
                    {t("first_name_label")}
                  </label>
                  <Field name="firstName">
                    {({ field }: any) => (
                      <InputText
                        placeholder={t("first_name_label")}
                        {...field}
                        className={`mt-1 ${fieldClass}`}
                      />
                    )}
                  </Field>
                  <ErrorMessage
                    name="firstName"
                    component="small"
                    className="p-error text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-gray-300">
                    {t("last_name_label")}
                  </label>
                  <Field name="lastName">
                    {({ field }: any) => (
                      <InputText
                        placeholder={t("last_name_label")}
                        {...field}
                        className={`mt-1 ${fieldClass}`}
                      />
                    )}
                  </Field>
                  <ErrorMessage
                    name="lastName"
                    component="small"
                    className="p-error text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-gray-300">
                  {t("email_label")}
                </label>
                <Field name="email">
                  {({ field }: any) => (
                    <InputText
                      placeholder={t("email_address_placeholder")}
                      {...field}
                      className={`mt-1 ${fieldClass}`}
                    />
                  )}
                </Field>
                <ErrorMessage
                  name="email"
                  component="small"
                  className="p-error text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-gray-300">
                  {t("phone_label")}
                </label>
                <div className="mt-1">
                  <PhoneNumberInput />
                </div>
                <ErrorMessage
                  name="phoneNumber"
                  component="small"
                  className="p-error text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-gray-300">
                  {t("password_label")}
                </label>
                <Field name="password">
                  {({ field }: any) => (
                    <Password
                      {...field}
                      inputClassName="bg-white text-black dark:bg-gray-700 dark:text-white"
                      panelClassName="bg-white text-black dark:bg-gray-700 dark:text-white"
                      placeholder={t("password")}
                      toggleMask
                      className={`mt-1 ${fieldClass}`}
                      feedback={false}
                    />
                  )}
                </Field>
                <ErrorMessage
                  name="password"
                  component="small"
                  className="p-error text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-gray-300">
                  {t("confirm_password_label")}
                </label>
                <Field name="confirmPassword">
                  {({ field }: any) => (
                    <Password
                      placeholder={t("confirm_password_label")}
                      inputClassName="bg-white text-black dark:bg-gray-700 dark:text-white"
                      panelClassName="bg-white text-black dark:bg-gray-700 dark:text-white"
                      {...field}
                      toggleMask
                      className={`mt-1 ${fieldClass}`}
                      feedback={false}
                    />
                  )}
                </Field>
                <ErrorMessage
                  name="confirmPassword"
                  component="small"
                  className="p-error text-xs"
                />
              </div>

              <div className="mt-1 flex items-center gap-2">
                <Checkbox
                  inputId="termsAccepted"
                  checked={values.termsAccepted}
                  onChange={(e) => setFieldValue("termsAccepted", e.checked)}
                />
                <label
                  className="text-xs text-slate-700 dark:text-gray-300"
                  htmlFor="termsAccepted"
                >
                  {t("i_accept_the_terms_and_conditions")}
                </label>
              </div>
              <ErrorMessage
                name="termsAccepted"
                component="small"
                className="p-error text-xs"
              />

              <Button
                type="submit"
                label={t("register_label")}
                loading={isSubmitting}
                className="mt-2 w-full justify-center rounded-2xl border-0 bg-[#1c5bc7] py-3.5 text-[15px] font-bold text-white shadow-[0_12px_28px_rgba(28,91,199,0.22)] transition hover:-translate-y-0.5 hover:bg-[#1a52b4]"
              />
            </Form>
          )}
        </Formik>
      </div>
    </section>
  );
};

export default EmailForm;
