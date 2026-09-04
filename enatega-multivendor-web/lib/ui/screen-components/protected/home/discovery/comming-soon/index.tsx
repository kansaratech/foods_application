"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client";
import { useTranslations } from "next-intl";

import { JOIN_WAITLIST } from "@/lib/api/graphql/mutations";
import { USER_CURRENT_LOCATION_LS_KEY } from "@/lib/utils/constants";
import { onUseLocalStorage } from "@/lib/utils/methods/local-storage";
import { useUserAddress } from "@/lib/context/address/address.context";

interface IAreaUnavailableProps {
  areaLabel?: string | null;
  nearestArea?: string | null;
  nearestDistanceKm?: number | null;
}

const MAROON = "#16293f";
const ORANGE = "#1c5bc7";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AreaUnavailable({
  areaLabel,
  nearestArea,
  nearestDistanceKm,
}: IAreaUnavailableProps) {
  const t = useTranslations();
  const { userAddress, setUserAddress } = useUserAddress();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState(false);

  const [joinWaitlist, { loading }] = useMutation(JOIN_WAITLIST, {
    onCompleted: () => setDone(true),
  });

  const latitude = Number(userAddress?.location?.coordinates?.[1]);
  const longitude = Number(userAddress?.location?.coordinates?.[0]);
  const emailValid = EMAIL_RE.test(email.trim());

  const place =
    areaLabel?.trim() ||
    userAddress?.deliveryAddress?.trim() ||
    t("area_na_your_area");

  const nearLine = nearestArea
    ? nearestDistanceKm
      ? t("area_na_nearby", {
          area: nearestArea,
          km: Math.round(nearestDistanceKm),
        })
      : t("area_na_nearby_nodist", { area: nearestArea })
    : t("area_na_nearby_generic");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!emailValid || loading) return;
    joinWaitlist({
      variables: {
        input: {
          email: email.trim(),
          phone: phone.trim() || null,
          latitude,
          longitude,
          areaLabel: place,
          source: "web",
        },
      },
    });
  };

  const handleChangeLocation = () => {
    onUseLocalStorage("delete", USER_CURRENT_LOCATION_LS_KEY);
    setUserAddress(null);
  };

  return (
    <div className="mx-auto my-10 max-w-3xl px-4">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(22,41,63,0.10)] dark:border-gray-700 dark:bg-gray-900">
        {/* Banner */}
        <div
          className="px-6 py-10 text-center sm:px-12"
          style={{
            background:
              "linear-gradient(160deg, #fdf3e7 0%, #f9e3ea 55%, #f4d3dd 100%)",
          }}
        >
          <span
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-white"
            style={{ background: MAROON }}
            aria-hidden="true"
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 21s-6.5-5.6-6.5-10.2A6.5 6.5 0 0 1 12 4a6.5 6.5 0 0 1 6.5 6.8C18.5 15.4 12 21 12 21Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="10.5" r="2.4" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </span>
          <h2
            className="text-2xl font-black leading-tight tracking-tight sm:text-3xl"
            style={{ color: MAROON }}
          >
            {t("area_na_title", { place })}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-700 sm:text-base">
            {nearLine}
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-8 sm:px-12">
          {done ? (
            <div className="flex flex-col items-center py-4 text-center">
              <span
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-full text-white"
                style={{ background: ORANGE }}
                aria-hidden="true"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="m5 13 4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {t("area_na_success_title")}
              </p>
              <p className="mt-1 max-w-sm text-sm text-slate-600 dark:text-gray-300">
                {t("area_na_success_body", { place })}
              </p>
              <button
                type="button"
                onClick={handleChangeLocation}
                className="mt-6 text-sm font-bold underline-offset-4 hover:underline"
                style={{ color: MAROON }}
              >
                {t("area_na_change")}
              </button>
            </div>
          ) : (
            <>
              <p className="text-center text-sm font-semibold text-slate-900 dark:text-white">
                {t("area_na_prompt")}
              </p>
              <form
                onSubmit={handleSubmit}
                className="mx-auto mt-5 flex max-w-md flex-col gap-3"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder={t("area_na_email")}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#16293f] dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  aria-invalid={touched && !emailValid}
                />
                {touched && !emailValid && (
                  <span className="-mt-1 text-xs font-medium text-red-600">
                    {t("area_na_email_invalid")}
                  </span>
                )}
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("area_na_phone")}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#16293f] dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 rounded-xl px-5 py-3 text-sm font-bold text-white transition hover:brightness-95 disabled:opacity-60"
                  style={{ background: ORANGE }}
                >
                  {loading ? t("area_na_notify_busy") : t("area_na_notify")}
                </button>
              </form>
              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={handleChangeLocation}
                  className="text-sm font-bold underline-offset-4 hover:underline"
                  style={{ color: MAROON }}
                >
                  {t("area_na_change")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
