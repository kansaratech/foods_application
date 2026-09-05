"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLocationCrosshairs,
  faMagnifyingGlass,
  faSpinner,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

import useLocationSearch from "@/lib/hooks/useLocationSearch";

const ORANGE = "#1c5bc7";
const MAROON = "#16293f";

/**
 * Lightweight delivery-location picker for the header. Two ways in: the
 * browser's location, or type-ahead address search — both go through the API's
 * `/maps/*` proxy and persist the pick. Deliberately does not reuse the big
 * map-based address modal (used at checkout), which needs client-side Places
 * JS and a rendered map.
 */
export default function LocationPopover({
  open,
  onClose,
  currentAddress,
  anchorClassName = "",
}: {
  open: boolean;
  onClose: () => void;
  currentAddress: string;
  anchorClassName?: string;
}) {
  const {
    predictions,
    searching,
    locating,
    error,
    search,
    choosePrediction,
    detectCurrentLocation,
    reset,
  } = useLocationSearch();

  const [term, setTerm] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTerm("");
      reset();
      const id = window.setTimeout(() => inputRef.current?.focus(), 60);
      return () => window.clearTimeout(id);
    }
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;

    const isOutside = (target: EventTarget | null) => {
      const panel = panelRef.current;
      // `offsetParent === null` ⇒ this instance sits inside a `display:none`
      // wrapper (the header renders one popover for desktop, one for mobile).
      // The hidden one must not react to clicks in the visible one.
      if (!panel || panel.offsetParent === null) return false;
      return target instanceof Node && !panel.contains(target);
    };

    // Use `click` (fires after a full press+release on one element) rather than
    // `mousedown`, so a press that starts inside the panel — e.g. on a
    // prediction row — never tears the popover down before its own click lands.
    const onDocClick = (e: MouseEvent) => {
      if (isOutside(e.target)) onClose();
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();

    // Defer attachment one tick so the click that opened the popover doesn't
    // immediately close it.
    const attach = window.setTimeout(() => {
      document.addEventListener("click", onDocClick);
    }, 0);
    document.addEventListener("keydown", onEsc);

    return () => {
      window.clearTimeout(attach);
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, onClose]);

  if (!open) return null;

  const pickCurrent = async () => {
    const ok = await detectCurrentLocation();
    if (ok) onClose();
  };

  const pick = async (placeId: string, description: string) => {
    const ok = await choosePrediction({ placeId, description });
    if (ok) onClose();
  };

  return (
    <div
      ref={panelRef}
      className={`absolute z-50 mt-2 w-[min(92vw,360px)] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_20px_60px_rgba(15,23,42,0.18)] dark:border-gray-700 dark:bg-gray-900 ${anchorClassName}`}
      role="dialog"
      aria-label="Choose delivery location"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-900 dark:text-white">
          Set your delivery location
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-gray-800"
        >
          <FontAwesomeIcon icon={faXmark} style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {currentAddress && (
        <p className="mb-2 truncate rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-gray-800 dark:text-gray-400">
          Currently: <span className="font-medium text-slate-700 dark:text-gray-200">{currentAddress}</span>
        </p>
      )}

      <button
        type="button"
        onClick={pickCurrent}
        disabled={locating}
        className="mb-2 flex w-full items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm font-semibold text-slate-800 transition hover:border-[#1c5bc7] hover:bg-blue-50/50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
      >
        <FontAwesomeIcon
          icon={locating ? faSpinner : faLocationCrosshairs}
          spin={locating}
          style={{ width: 15, height: 15, color: MAROON }}
        />
        {locating ? "Getting your location…" : "Use my current location"}
      </button>

      <div className="relative">
        <FontAwesomeIcon
          icon={faMagnifyingGlass}
          style={{ width: 13, height: 13 }}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          ref={inputRef}
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            search(e.target.value);
          }}
          placeholder="Search area, society, landmark…"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm text-slate-900 outline-none transition focus:border-[#1c5bc7] focus:ring-2 focus:ring-[#1c5bc7]/15 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
        {searching && (
          <FontAwesomeIcon
            icon={faSpinner}
            spin
            style={{ width: 13, height: 13 }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
        )}
      </div>

      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {predictions.length > 0 && (
        <ul className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-slate-100 dark:border-gray-800">
          {predictions.map((p) => (
            <li key={p.placeId}>
              <button
                type="button"
                onClick={() => pick(p.placeId, p.description)}
                disabled={locating}
                className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-blue-50 disabled:opacity-60 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <FontAwesomeIcon
                  icon={faMagnifyingGlass}
                  style={{ width: 11, height: 11, color: ORANGE }}
                  className="mt-1 shrink-0"
                />
                <span className="min-w-0">{p.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!error && !searching && term.trim().length >= 3 && predictions.length === 0 && (
        <p className="mt-2 px-1 text-xs text-slate-400">No matches — try a nearby landmark.</p>
      )}
    </div>
  );
}
