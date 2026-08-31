import { StaticImageData } from "next/image";
import type { ReactNode } from "react";

export interface Cards {
  image?: string | StaticImageData;
  icon?: ReactNode;
  heading: string;
  text: string;
  color?: string;
}

export interface WhyCardsListProps {
  eyebrow?: string;
  title?: string;
  cards: Cards[];
}

export interface sideCardProps {
  image: string | StaticImageData;
  heading: string;
  subHeading: string;
  right: boolean;
}

export interface sideCardList {
  sideCards: sideCardProps[];
}

export interface VendorFormValues {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
}
