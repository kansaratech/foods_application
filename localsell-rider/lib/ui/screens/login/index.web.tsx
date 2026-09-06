import { FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Href, router } from "expo-router";
import useLogin from "@/lib/hooks/useLogin";
import { ROUTES } from "@/lib/utils/constants";

export function Icon({
  name,
  size = 24,
}: {
  name: "bike" | "clipboard" | "navigate" | "chart" | "lock" | "eye" | "help";
  size?: number;
}) {
  const paths = {
    bike: (
      <>
        <circle cx="6" cy="17" r="3" />
        <circle cx="19" cy="17" r="3" />
        <path d="M9 17h5l3-9h-4m3-3h3l2 9M3 11h6l3 6M2 8h7M1 5h5" />
      </>
    ),
    clipboard: (
      <>
        <rect x="5" y="5" width="14" height="17" rx="2" />
        <rect x="9" y="2" width="6" height="5" rx="1" />
        <path d="M9 11h6m-6 4h6m-6 4h6" />
      </>
    ),
    navigate: <path d="m3 10 18-7-7 18-3-8-8-3Z" />,
    chart: (
      <>
        <path d="M3 21h19M5 21V12h4v9m2 0V7h4v14m2 0V2h4v19" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    help: (
      <>
        <path d="M4 13v-2a8 8 0 0 1 16 0v6a4 4 0 0 1-4 4h-3" />
        <rect x="2" y="11" width="4" height="7" rx="2" />
        <rect x="18" y="11" width="4" height="7" rx="2" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
export function Brand() {
  return (
    <div className="rl-brand" aria-label="Localsell Rider">
      <img
        className="rl-logo-light"
        src="/brand/localsell-logo-inverse.png"
        alt="Localsell"
        width="240"
        height="60"
      />
      <img
        className="rl-logo-dark"
        src="/brand/localsell-logo.png"
        alt="Localsell"
        width="240"
        height="60"
      />
      <small>RIDER</small>
    </div>
  );
}
export default function LoginScreen() {
  const { t } = useTranslation();
  const { onLogin, isLogging } = useLogin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const help = useRef<HTMLDialogElement>(null);
  const busy = submitting || isLogging;
  useEffect(() => {
    try {
      const saved = localStorage.getItem("localsell-rider-username");
      if (saved) {
        setUsername(saved);
        setRemember(true);
      }
    } catch {
      /* Storage is optional. */
    }
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || busy) return;
    if (!username.trim() || !password) {
      setError(t("Enter your username and password."));
      return;
    }
    lock.current = true;
    setSubmitting(true);
    setError("");
    try {
      try {
        if (remember)
          localStorage.setItem("localsell-rider-username", username.trim());
        else localStorage.removeItem("localsell-rider-username");
      } catch {
        /* Sign-in does not depend on browser storage. */
      }
      await onLogin(username.trim().toLowerCase(), password);
    } catch {
      setError(t("Unable to sign in. Please try again."));
    } finally {
      lock.current = false;
      setSubmitting(false);
    }
  }
  return (
    <main className="rider-login">
      <style>{styles}</style>
      <aside className="rl-story">
        <svg
          className="rl-map"
          viewBox="0 0 600 800"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <g fill="none" stroke="#2761a6" strokeWidth="5" opacity=".2">
            <path d="M310-30 345 115 600 225M405-20 410 75 330 265 610 390M505-20 430 165 330 460 610 630M600 15 455 410 305 590 460 800M330 590 405 735 610 640M315 800 600 480M295 650 600 785M335 90 600-5M375 30 590 120" />
          </g>
          <path
            d="M532 95 505 188 573 223 548 291 519 310 493 437Q489 457 515 466L555 528Q564 541 551 548L351 670"
            fill="none"
            stroke="#1970e6"
            strokeWidth="5"
            opacity=".65"
          />
          <path
            d="m532 95-27 93 68 35-25 68M551 548l-115 72"
            fill="none"
            stroke="#3c9cff"
            strokeWidth="4"
            strokeDasharray="7 12"
          />
          <circle
            cx="351"
            cy="670"
            r="10"
            fill="#062c60"
            stroke="#1478ff"
            strokeWidth="7"
          />
          <path
            d="M532 63a13 13 0 0 0-13 13c0 10 13 24 13 24s13-14 13-24a13 13 0 0 0-13-13"
            fill="#00ce88"
          />
          <circle cx="532" cy="76" r="5" fill="#0c3b6a" />
        </svg>
        <Brand />
        <div className="rl-story-copy">
          <h1>
            {t("Deliver with")}
            <br />
            {t("confidence")}
            <span>.</span>
          </h1>
          <p className="rl-intro">
            {t(
              "Manage deliveries, track earnings and stay connected with your store.",
            )}
          </p>
          <ul className="rl-features">
            {(
              [
                [
                  "clipboard",
                  "View assigned deliveries",
                  "See your pickup and drop orders in one place.",
                ],
                [
                  "navigate",
                  "Navigate to customers",
                  "Get the best routes and reach on time.",
                ],
                [
                  "chart",
                  "Track earnings and cash",
                  "Keep a clear record of your earnings.",
                ],
              ] as const
            ).map(([icon, title, detail]) => (
              <li key={icon}>
                <span className="rl-feature-icon">
                  <Icon name={icon} size={28} />
                </span>
                <div>
                  <h2>{t(title)}</h2>
                  <p>{t(detail)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="rl-route-bike">
          <Icon name="bike" size={58} />
        </div>
        <button
          className="rl-support"
          onClick={() => help.current?.showModal()}
        >
          <Icon name="help" size={22} />
          <span>
            {t("Need help?")} <strong>{t("Contact support")}</strong>
          </span>
        </button>
      </aside>
      <section className="rl-form-side" aria-label={t("Rider sign in")}>
        <div className="rl-mobile-brand">
          <Brand />
        </div>
        <div className="rl-card">
          <div className="rl-scooter">
            <Icon name="bike" size={44} />
          </div>
          <h2>{t("Welcome back")}</h2>
          <p className="rl-subtitle">{t("Sign in to your rider account")}</p>
          <form onSubmit={submit}>
            <label htmlFor="rider-username">{t("Username")}</label>
            <input
              id="rider-username"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              placeholder={t("Enter your username")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={busy}
            />
            <div className="rl-password-label">
              <label htmlFor="rider-password">{t("Password")}</label>
              <button
                type="button"
                className="rl-text-button"
                onClick={() => help.current?.showModal()}
              >
                {t("Forgot password?")}
              </button>
            </div>
            <div className="rl-password">
              <input
                id="rider-password"
                name="password"
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                required
                placeholder={t("Enter your password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
              />
              <button
                type="button"
                aria-label={t(visible ? "Hide password" : "Show password")}
                aria-pressed={visible}
                onClick={() => setVisible(!visible)}
              >
                <Icon name="eye" size={19} />
                {visible && <span className="rl-eye-slash" />}
              </button>
            </div>
            <label className="rl-remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={busy}
              />
              <span>{t("Remember my username")}</span>
            </label>
            {error && (
              <p className="rl-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="rl-submit"
              type="submit"
              disabled={busy}
              aria-busy={busy}
            >
              {t(busy ? "Signing in…" : "Sign in")}
            </button>
          </form>
          <p className="rl-secure">
            <Icon name="lock" size={17} />
            <span>
              {t("Sign in with the credentials provided by your store.")}
            </span>
          </p>
        </div>
        <footer className="rl-footer">
          <button
            className="rl-text-button"
            onClick={() => router.push(ROUTES.register as Href)}
          >
            {t("New rider? Register here")}
          </button>
          <span>© {new Date().getFullYear()} LocalSell</span>
        </footer>
      </section>
      <dialog
        ref={help}
        className="rl-help"
        onClick={(e) => {
          if (e.target === e.currentTarget) help.current?.close();
        }}
      >
        <h2>{t("Need help signing in?")}</h2>
        <p>
          {t(
            "Contact your store administrator to confirm your rider username or request a password reset.",
          )}
        </p>
        <p>
          {t("Use your assigned username to sign in, not your mobile number.")}
        </p>
        <button className="rl-submit" onClick={() => help.current?.close()}>
          {t("Got it")}
        </button>
      </dialog>
    </main>
  );
}
export const styles = `
.rider-login{display:flex;min-height:100dvh;width:100%;background:#eff7ff;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#10192c;overflow:auto}.rider-login *{box-sizing:border-box}.rider-login button,.rider-login input{font:inherit}.rider-login button{cursor:pointer}.rider-login button:disabled{opacity:.65;cursor:wait}.rider-login button:focus-visible,.rider-login input:focus-visible{outline:3px solid #69a5ff;outline-offset:3px}.rl-story{position:relative;isolation:isolate;overflow:hidden;flex:0 0 45.3%;padding:24px 9% 42px 4.1%;min-height:100dvh;display:flex;flex-direction:column;background:radial-gradient(ellipse at 25% 45%,#0c376e,#062859);color:white}.rl-map{position:absolute;inset:0;width:100%;height:100%;z-index:-1}.rl-brand{display:inline-block;width:max-content;color:#fff}.rl-brand img{display:block;width:240px;height:60px;object-fit:contain;margin-left:-25px}.rl-brand .rl-logo-dark{display:none}.rl-brand small{display:block;font-family:Inter,sans-serif;font-size:11px;line-height:1.5;letter-spacing:5px;font-weight:500;padding-left:1px;margin-top:2px}.rl-story-copy{margin-top:70px;position:relative;z-index:1}.rl-story h1{font-size:clamp(35px,3.65vw,52px);line-height:1.02;letter-spacing:-1.5px;font-weight:700;margin:0 0 13px}.rl-story h1 span{color:#00d18d}.rl-intro{font-size:clamp(16px,1.5vw,21px);color:#b9ccea;line-height:1.35;margin:0;max-width:390px}.rl-features{list-style:none;padding:0;margin:36px 0 60px;display:grid;gap:20px}.rl-features li{display:flex;align-items:center;gap:20px}.rl-feature-icon{flex-shrink:0;width:55px;height:55px;border:1px solid #ffffff16;border-radius:13px;background:#ffffff0b;display:grid;place-items:center;color:#d9e9ff;box-shadow:inset 0 0 12px #ffffff06}.rl-features h2{font-size:15px;margin:0 0 6px;font-weight:650;white-space:nowrap}.rl-features p{font-size:12px;line-height:1.5;color:#b6cbe8;margin:0}.rl-support{margin-top:auto;display:flex;align-items:center;gap:13px;background:none;border:0;color:#d7e6fc;font-size:12px!important;text-align:left;padding:0;z-index:1}.rl-support strong{font-weight:600}.rl-route-bike{position:absolute;right:20%;bottom:16%;color:#fff;transform:rotate(-16deg)}.rl-form-side{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:60px 32px 35px;background:radial-gradient(ellipse at center,#f8fbff,#edf6ff);min-width:0}.rl-card{background:#fff;border:1px solid #dfe7f1;border-radius:12px;box-shadow:0 12px 32px #0b3b6e0a;width:100%;max-width:464px;padding:25px 27px 27px}.rl-scooter{width:74px;height:74px;border-radius:16px;background:#edf6ff;color:#075bed;display:grid;place-items:center;margin:0 auto 10px}.rl-card h2{font-size:25px;letter-spacing:-.6px;text-align:center;line-height:1.3;margin:0 0 4px;font-weight:700}.rl-subtitle{text-align:center;color:#8290a9;font-size:14px;margin:0 0 26px}.rl-card form>label,.rl-password-label label{display:block;font-size:12px;font-weight:600;margin-bottom:8px}.rl-card input:not([type=checkbox]){display:block;width:100%;height:44px;padding:0 16px;border:1px solid #d6dfed;border-radius:7px;background:#fff;color:#172640;font-size:14px;box-shadow:0 1px 3px #20314d06}.rl-card input::placeholder{color:#8897af}.rl-password-label{display:flex;align-items:baseline;justify-content:space-between;margin-top:21px}.rl-text-button{padding:0;border:0;background:none;color:#0058ef;font-size:12px!important;font-weight:500}.rl-password{position:relative}.rl-password input{padding-right:48px!important}.rl-password button{position:absolute;right:5px;top:3px;height:38px;width:38px;display:grid;place-items:center;color:#354d72;border:0;background:none}.rl-eye-slash{width:22px;height:1.5px;background:#354d72;position:absolute;transform:rotate(-45deg)}.rl-card .rl-remember{display:flex;align-items:center;gap:10px;font-weight:400;margin:14px 0 22px;font-size:12px}.rl-remember input{width:18px;height:18px;margin:0;accent-color:#0759e7}.rl-submit{width:100%;height:45px;border:0;border-radius:9px;background:linear-gradient(110deg,#0755dc,#0750d5);color:white;font-weight:650!important;font-size:14px!important;box-shadow:0 2px 4px #0755dc10}.rl-submit:hover:not(:disabled){background:#0648c3}.rl-secure{display:flex;align-items:center;justify-content:center;gap:8px;color:#6c7c96;font-size:11px;margin:23px 0 0;line-height:1.5}.rl-secure svg{color:#00ad70;flex-shrink:0}.rl-footer{width:100%;max-width:464px;display:flex;align-items:center;justify-content:center;gap:24px;margin-top:38px;font-size:11px;color:#7e90ac}.rl-mobile-brand{display:none}.rl-error{font-size:12px;color:#bc3030}.rl-help{max-width:420px;width:calc(100% - 32px);border:1px solid #dce6f2;border-radius:12px;padding:28px;color:#243650;box-shadow:0 20px 80px #12345a30}.rl-help::backdrop{background:#142e5070}.rl-help h2{font-size:21px;margin:0 0 16px}.rl-help p{font-size:14px;line-height:1.7}.rl-help button{margin-top:10px}
@media(min-width:1450px){.rl-story{padding-left:5%;padding-right:7%}.rl-story-copy{margin-top:90px}.rl-features{gap:26px}.rl-form-side{padding-top:80px}}@media(max-width:1000px){.rl-story{padding-left:30px;padding-right:30px;flex-basis:43%}.rl-story h1{font-size:38px}.rl-features li{gap:12px}.rl-features h2{white-space:normal}.rl-route-bike{right:10%;bottom:11%;opacity:.6}.rl-form-side{padding:40px 24px}.rl-brand img{width:220px;height:55px;margin-left:-23px}}@media(max-width:760px){.rl-story{display:none}.rl-form-side{min-height:100dvh;padding:28px 18px;justify-content:center}.rl-mobile-brand{display:block;margin-bottom:25px}.rl-mobile-brand .rl-brand{color:#0a3267}.rl-mobile-brand .rl-brand img{width:220px;height:55px;margin-left:0}.rl-mobile-brand .rl-brand .rl-logo-light{display:none}.rl-mobile-brand .rl-brand .rl-logo-dark{display:block}.rl-mobile-brand .rl-brand small{text-align:center;padding-left:5px}.rl-mobile-brand .rl-brand small{font-size:10px;letter-spacing:5px}.rl-card{padding:24px;max-width:440px}.rl-footer{flex-wrap:wrap;gap:12px;margin-top:26px}.rl-card h2{font-size:24px}}
`;
