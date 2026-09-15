import { gql } from "@apollo/client";

export const GET_CONFIG = gql`
  query Configuration {
    configuration {
      _id
      currency
      currencySymbol
      deliveryRate
      twilioEnabled
      webClientID
      webAmplitudeApiKey
      googleMapLibraries
      googleColor
      webSentryUrl
      cashfreeAppId
      cashfreeEnv
      clientId
      skipEmailVerification
      skipMobileVerification
      costType
      firebaseKey
      authDomain
      projectId
      storageBucket
      msgSenderId
      appId
    }
  }
`;
