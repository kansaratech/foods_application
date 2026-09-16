import { ReactNode } from "react";
import { ORDER_TYPE } from "../types";
import { IGlobalComponentProps } from "./global.interface";
import { IRestaurantProfile } from "./resturant.interface";
import { IRiderProfile } from "./user.interface";

export interface IOrderComponentProps extends IGlobalComponentProps {

  tab: ORDER_TYPE;
  // Contact number for whoever is actually receiving the order, when that's
  // not the account holder (e.g. ordering for someone else) — call/message
  // this instead of `user.phone` when it's set.
  recipientPhone?: string | null;
}

export interface IOrder {
  _id: string;
  orderId: string;
  paymentMethod?: string;
  items: Array<{
    price: number;
    variation: {
      price: number;
      title: string;
    };
    addons?: Array<{
      _id: string;
      options: Array<{
        _id: string;
        price: number;
        title: string;
        quantity?: number;
      }>;
    }>;
    description: ReactNode;
    image: string;
    title: string;
    quantity: number;
  }>;
  user: {
    _id: string;
    name: string;
    phone: string;
  };
  recipientPhone?: string | null;
  paymentStatus: string;
  createdAt: string;
  acceptedAt: string;
  deliveryAddress: {
    deliveryAddress: string;
    location: {
      coordinates: Array<number>;
    };
  };
  orderAmount: number;
  orderStatus: string;
  preparationTime: string;
  completionTime: string;
  isPickedUp: boolean;
  isRiderRinged: boolean;
  rider: IRiderProfile;
  restaurant: IRestaurantProfile;
}
