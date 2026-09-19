"use client";

// Core
import React, { useRef } from "react";

// Interfaces

// Prime React
import { Toast } from "primereact/toast";

// Components
import {
  IToast,
  IToastContext,
  IToastProviderProps,
} from "@/lib/utils/interfaces/";

export const ToastContext = React.createContext<IToastContext>(
  {} as IToastContext
);

export const ToastProvider: React.FC<IToastProviderProps> = ({ children }) => {
  // Ref
  const toastRef = useRef<Toast>(null);
  const lastToastRef = useRef<{
    type: IToast["type"];
    title: string;
    message: string;
    timestamp: number;
  } | null>(null);

  // Handlers
  const onShowToast = (config: IToast) => {
    const now = Date.now();
    const normalizedTitle = config.title?.trim?.() ?? "";
    const normalizedMessage = config.message?.trim?.() ?? "";
    const lastToast = lastToastRef.current;

    if (
      lastToast &&
      lastToast.type === config.type &&
      lastToast.title === normalizedTitle &&
      lastToast.message === normalizedMessage &&
      now - lastToast.timestamp < 1000
    ) {
      return;
    }

    lastToastRef.current = {
      type: config.type,
      title: normalizedTitle,
      message: normalizedMessage,
      timestamp: now,
    };

    toastRef.current?.show({
      severity: config.type,
      life: config.sticky ? undefined : (config?.duration ?? 2500),
      sticky: config.sticky ?? false,
      summary: config.title,
      detail: config.message,
    });
  };

  const value: IToastContext = {
    showToast: onShowToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast ref={toastRef} />
    </ToastContext.Provider>
  );
};
