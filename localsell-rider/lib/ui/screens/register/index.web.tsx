import { useRef, useState } from "react";
import { Formik } from "formik";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { RiderRegisterSchema } from "@/lib/utils/schema";
import useRiderRegister from "@/lib/hooks/useRiderRegister";
import { Brand, Icon, styles as authStyles } from "../login/index.web";

const initialValues = {
  name: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
  vehicleNumber: "",
};
const vehicles = [
  ["bicycle", "Bicycle"],
  ["motorbike", "Motorbike"],
  ["car", "Car"],
  ["pickup_truck", "Pickup truck"],
];
export default function RegisterScreen() {
  const { t } = useTranslation();
  const { onRegister, isRegistering } = useRiderRegister();
  const [visible, setVisible] = useState(false);
  const [vehicleType, setVehicleType] = useState("motorbike");
  const submitting = useRef(false);
  return (
    <main className="rider-login rider-register">
      <style>
        {authStyles}
        {registerStyles}
      </style>
      <aside className="rl-story">
        <div className="rr-map" aria-hidden="true" />
        <Brand />
        <div className="rl-story-copy">
          <h1>
            {t("Your next journey")}
            <br />
            {t("starts here")}
            <span>.</span>
          </h1>
          <p className="rl-intro">
            {t("Apply to deliver with Localsell and earn on your schedule.")}
          </p>
          <ul className="rl-features">
            {(
              [
                [
                  "clipboard",
                  "Submit application",
                  "Share your basic and vehicle details.",
                ],
                [
                  "lock",
                  "Get verified",
                  "Our team will review your application.",
                ],
                [
                  "bike",
                  "Start delivering",
                  "Go online and start delivering after approval.",
                ],
              ] as const
            ).map(([icon, title, detail], index) => (
              <li key={icon}>
                <span className="rl-feature-icon">{index + 1}</span>
                <div>
                  <h2>{t(title)}</h2>
                  <p>{t(detail)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <button className="rl-support" onClick={() => router.replace("/login")}>
          <span aria-hidden="true">←</span>
          {t("Back to sign in")}
        </button>
      </aside>
      <section className="rl-form-side" aria-label={t("Rider registration")}>
        <div className="rl-mobile-brand">
          <Brand />
        </div>
        <div className="rl-card rr-card">
          <div className="rl-scooter">
            <Icon name="bike" size={38} />
          </div>
          <h2>{t("Apply to become a rider")}</h2>
          <p className="rl-subtitle">
            {t("Complete the form below. It takes about 2 minutes.")}
          </p>
          <Formik
            initialValues={initialValues}
            validationSchema={RiderRegisterSchema}
            onSubmit={async (values) => {
              if (submitting.current) return;
              submitting.current = true;
              try {
                await onRegister({
                  name: values.name.trim(),
                  phone: values.phone.trim(),
                  email: values.email.trim() || undefined,
                  password: values.password,
                  vehicleType,
                  vehicleNumber: values.vehicleNumber.trim() || undefined,
                });
              } finally {
                submitting.current = false;
              }
            }}
          >
            {({
              values,
              errors,
              touched,
              handleChange,
              handleBlur,
              handleSubmit,
              isSubmitting,
            }) => {
              const busy = isSubmitting || isRegistering;
              const field = (
                name: keyof typeof initialValues,
                label: string,
                placeholder: string,
                type = "text",
                autoComplete?: string,
              ) => (
                <div
                  className={`rr-field ${name === "email" || name === "vehicleNumber" ? "rr-full" : ""}`}
                >
                  <label htmlFor={`register-${name}`}>
                    {t(label)}
                    {(name === "email" || name === "vehicleNumber") && (
                      <span className="rr-optional"> {t("(optional)")}</span>
                    )}
                  </label>
                  <div className={name === "password" ? "rl-password" : ""}>
                    <input
                      id={`register-${name}`}
                      name={name}
                      type={type}
                      autoComplete={autoComplete}
                      value={values[name]}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={busy}
                      placeholder={t(placeholder)}
                      aria-invalid={!!(touched[name] && errors[name])}
                      aria-describedby={
                        touched[name] && errors[name]
                          ? `error-${name}`
                          : undefined
                      }
                    />
                    {name === "password" && (
                      <button
                        type="button"
                        aria-label={t(
                          visible ? "Hide passwords" : "Show passwords",
                        )}
                        aria-pressed={visible}
                        onClick={() => setVisible(!visible)}
                      >
                        <Icon name="eye" size={19} />
                        {visible && <span className="rl-eye-slash" />}
                      </button>
                    )}
                  </div>
                  {touched[name] && errors[name] && (
                    <p id={`error-${name}`} className="rr-error" role="alert">
                      {t(errors[name] || "")}
                    </p>
                  )}
                </div>
              );
              return (
                <form onSubmit={handleSubmit} noValidate>
                  <div className="rr-fields">
                    {field(
                      "name",
                      "Full name",
                      "Enter your full name",
                      "text",
                      "name",
                    )}
                    {field(
                      "phone",
                      "Mobile number",
                      "Enter your phone number",
                      "tel",
                      "tel",
                    )}
                    {field(
                      "email",
                      "Email",
                      "Enter your email address",
                      "email",
                      "email",
                    )}
                    {field(
                      "password",
                      "Password",
                      "At least 8 characters",
                      visible ? "text" : "password",
                      "new-password",
                    )}
                    {field(
                      "confirmPassword",
                      "Confirm password",
                      "Re-enter your password",
                      visible ? "text" : "password",
                      "new-password",
                    )}
                  </div>
                  <fieldset className="rr-vehicles" disabled={busy}>
                    <legend>{t("Vehicle type")}</legend>
                    <div>
                      {vehicles.map(([code, label]) => (
                        <label
                          key={code}
                          className={vehicleType === code ? "chosen" : ""}
                        >
                          <input
                            type="radio"
                            name="vehicleType"
                            value={code}
                            checked={vehicleType === code}
                            onChange={() => setVehicleType(code)}
                          />
                          {t(label)}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {field(
                    "vehicleNumber",
                    "Vehicle registration number",
                    "Example: RJ 30 AB 1234",
                  )}
                  <p className="rr-approval">
                    <Icon name="lock" size={17} />
                    <span>
                      {t(
                        "Your account needs admin approval before you can go online.",
                      )}
                    </span>
                  </p>
                  <button
                    className="rl-submit"
                    disabled={busy}
                    aria-busy={busy}
                    type="submit"
                  >
                    {t(busy ? "Submitting…" : "Submit application")}
                  </button>
                  <p className="rr-signin">
                    {t("Already applied or have an account?")}{" "}
                    <button
                      type="button"
                      className="rl-text-button"
                      onClick={() => router.replace("/login")}
                    >
                      {t("Sign in")}
                    </button>
                  </p>
                </form>
              );
            }}
          </Formik>
        </div>
        <footer className="rl-footer">
          © {new Date().getFullYear()} Localsell
        </footer>
      </section>
    </main>
  );
}

function VehicleIcon({ type }: { type: string }) {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {type === "bicycle" ? (
        <>
          <circle cx="7" cy="23" r="5" />
          <circle cx="25" cy="23" r="5" />
          <path d="m7 23 6-12 7 12H7l9-8h7l2 8m-14-12h5m5-5h3l2 7" />
        </>
      ) : type === "motorbike" ? (
        <>
          <circle cx="7" cy="23" r="5" />
          <circle cx="25" cy="23" r="5" />
          <path d="M7 23h10l6-13h-4m3-4h3l3 13M3 15h9l5 8M3 11h7" />
        </>
      ) : type === "car" ? (
        <>
          <path d="m5 15 3-8h16l3 8v11h-4v-4H9v4H5V15Zm0 0h22M9 18h2m10 0h2" />
        </>
      ) : (
        <>
          <path d="M3 7h16v16H3V7Zm16 7h6l5 6v3H19M23 14v5h6" />
          <circle cx="9" cy="25" r="3" />
          <circle cx="25" cy="25" r="3" />
        </>
      )}
    </svg>
  );
}
const registerStyles = `
.rider-register{min-height:100dvh;background:#f0f7ff}.rider-register .rl-story{flex-basis:39.5%;padding:28px 4.6% 38px;position:sticky;top:0;height:100dvh;min-height:690px;background:linear-gradient(120deg,#0a3264,#082d5d)}.rider-register .rl-brand img{width:172px;height:43px;margin-left:-18px}.rider-register .rl-brand small{font-size:9px;letter-spacing:4px;margin-top:1px}.rider-register .rl-story-copy{margin-top:82px}.rider-register .rl-story h1{font-size:clamp(32px,3vw,43px);letter-spacing:-1.4px;line-height:1.06;margin-bottom:16px}.rider-register .rl-intro{max-width:330px;font-size:19px;line-height:1.35;color:#b8cfea}.rr-map{position:absolute;inset:0;z-index:-1;opacity:.27;background:repeating-linear-gradient(28deg,transparent 0 95px,#23538b 96px 99px,transparent 100px 175px),repeating-linear-gradient(118deg,transparent 0 120px,#23538b 121px 124px,transparent 125px 210px)}.rider-register .rl-features{gap:27px;margin:35px 0 44px}.rider-register .rl-feature-icon{width:41px;height:41px;border-radius:50%;font-size:21px;font-weight:600;background:#ffffff12}.rider-register .rl-features li{gap:19px}.rider-register .rl-features h2{font-size:13px;margin-bottom:5px}.rider-register .rl-features p{font-size:11px;line-height:1.5}.rider-register .rl-support{font-size:11px!important}.rider-register .rl-form-side{padding:32px 30px 16px;justify-content:center;background:radial-gradient(ellipse at center,#f8fbff,#edf6ff)}.rr-card{max-width:480px;padding:16px 18px 17px;border-radius:9px;box-shadow:0 8px 28px #15396608}.rr-card .rl-scooter{width:51px;height:51px;border-radius:12px;margin-bottom:10px}.rr-card .rl-scooter svg{width:31px;height:31px}.rr-card h2{font-size:21px;letter-spacing:-.65px;margin-bottom:3px}.rr-card .rl-subtitle{font-size:11px;margin-bottom:21px;line-height:1.5}.rr-fields{display:grid;grid-template-columns:1fr 1fr;gap:15px 16px}.rr-full{grid-column:1/-1}.rr-field label{font-size:10px;font-weight:600;display:block;margin-bottom:6px;color:#192946}.rr-optional{font-weight:400;color:#788aa4}.rr-card input:not([type=radio]){height:36px;font-size:11px;padding:0 13px;border-color:#d3e1f5;border-radius:5px;box-shadow:none}.rr-card .rl-password button{height:30px;width:31px;top:3px}.rr-card .rl-password button svg{width:16px;height:16px}.rr-error{font-size:10px;line-height:1.4;color:#b52929;margin:5px 0 0}.rr-card input[aria-invalid=true]{border-color:#c74646}.rr-vehicles{border:0;padding:0;margin:18px 0 18px;min-width:0}.rr-vehicles legend{font-size:10px;font-weight:600;padding:0;margin-bottom:7px}.rr-vehicles>div{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.rr-vehicles label{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:10px;font-weight:500;min-height:65px;padding:8px 4px 6px;border:1px solid #d5e2f3;border-radius:6px;color:#455a79;cursor:pointer;background:#fff}.rr-vehicles label.chosen{border-color:#347aff;background:#edf5ff;color:#0560f7}.rr-vehicles input{position:absolute;top:6px;right:6px;accent-color:#0863ed;margin:0;width:14px;height:14px}.rr-approval{display:flex;align-items:center;gap:12px;font-size:10px;line-height:1.6;color:#57749e;background:#edf6ff;border-radius:7px;padding:10px 12px;margin:17px 0 9px}.rr-approval svg{color:#0069ff;flex-shrink:0;width:27px;height:27px;background:#dfeeff;padding:4px;border-radius:6px}.rr-card .rl-submit{height:39px;border-radius:7px;font-size:12px!important;background:linear-gradient(110deg,#0757ed,#064ce3)}.rr-signin{text-align:center;font-size:10px;color:#74849e;margin:12px 0 0}.rr-signin button{font-size:10px!important;font-weight:600}.rider-register .rl-footer{margin-top:13px;font-size:10px}
@media(min-width:1500px){.rider-register .rl-story{padding-left:5.5%;padding-right:4%}.rider-register .rl-story-copy{margin-top:95px}.rr-card{max-width:510px;padding:22px 23px}.rr-card input:not([type=radio]){height:40px}.rr-fields{gap:17px}.rr-card .rl-subtitle{margin-bottom:24px}}
@media(max-width:1050px){.rider-register .rl-story{padding:28px;flex-basis:39%}.rider-register .rl-story h1{font-size:33px}.rider-register .rl-intro{font-size:16px}.rider-register .rl-story-copy{margin-top:70px}.rider-register .rl-form-side{padding:24px 18px}.rr-card{padding:20px 16px}}
@media(max-width:760px){.rider-register .rl-story{display:none}.rider-register .rl-form-side{padding:24px 16px}.rr-card{max-width:480px}.rider-register .rl-mobile-brand{margin-bottom:20px}.rr-card h2{font-size:22px}.rr-card .rl-subtitle{font-size:12px}.rr-field label,.rr-vehicles legend{font-size:12px}.rr-card input:not([type=radio]){font-size:14px;height:44px}.rr-card .rl-password button{height:38px}.rr-card .rl-submit{height:44px}.rr-approval,.rr-signin,.rr-signin button{font-size:11px!important}}
@media(max-width:430px){.rr-fields{grid-template-columns:1fr;gap:14px}.rr-vehicles>div{grid-template-columns:1fr 1fr}.rr-vehicles label{font-size:11px;min-height:72px}.rr-card{padding:22px 18px}.rr-card h2{font-size:21px}}
`;
