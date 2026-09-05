import { Href, router } from "expo-router";

// Contexts
import { AuthContext } from "../context/global/auth.context";

// GraphQL
import { RIDER_SELF_REGISTER } from "../api/graphql/mutation/login";

// Components
import { FlashMessageComponent } from "../ui/useable-components";

// Interfaces
import { IRiderLoginResponse } from "../utils/interfaces/auth.interface";

// Constants
import { ROUTES } from "../utils/constants";

// Hooks
import { ApolloError, useMutation } from "@apollo/client";
import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { setItem } from "../services/async-storage";
import { useUserContext } from "../context/global/user.context";

export interface IRiderRegisterInput {
  name: string;
  phone: string;
  email?: string;
  password: string;
  vehicleType?: string;
  vehicleNumber?: string;
}

const useRiderRegister = () => {
  const [isRegistering, setIsRegistering] = useState(false);

  const { t } = useTranslation();
  const { setTokenAsync } = useContext(AuthContext);
  const { setUserId } = useUserContext();

  const [register] = useMutation(RIDER_SELF_REGISTER, {
    onCompleted,
    onError,
  });

  async function onCompleted({
    riderSelfRegister,
  }: {
    riderSelfRegister: IRiderLoginResponse;
  }) {
    setIsRegistering(false);
    if (riderSelfRegister) {
      // Same order as useLogin: store the token before the rider-id so the
      // pending-approval screen's own queries aren't skipped.
      await setTokenAsync(riderSelfRegister.token);
      setUserId(riderSelfRegister.userId);
      await setItem("rider-id", riderSelfRegister.userId);
      router.replace(ROUTES.pendingApproval as Href);
    }
  }

  function onError(err: ApolloError) {
    setIsRegistering(false);
    const message = err?.graphQLErrors?.length
      ? err.graphQLErrors[0].message
      : err?.networkError
        ? t("Unable to connect. Please try again.")
        : t("Something went wrong");
    FlashMessageComponent({ message });
  }

  const onRegister = async (input: IRiderRegisterInput) => {
    try {
      setIsRegistering(true);
      await register({
        variables: {
          name: input.name,
          phone: input.phone,
          email: input.email || undefined,
          password: input.password,
          vehicleType: input.vehicleType || undefined,
          vehicleNumber: input.vehicleNumber || undefined,
        },
      });
    } catch {
      FlashMessageComponent({ message: t("Something went wrong") });
    } finally {
      setIsRegistering(false);
    }
  };

  return { onRegister, isRegistering };
};

export default useRiderRegister;
