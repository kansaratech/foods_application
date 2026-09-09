import { gql } from '@apollo/client';

export const GET_CONFIGURATION = gql`
  query getConfiguration {
    configuration {
      _id
      email
      emailName
      enableEmail
      smtpHost
      smtpPort
      smtpSecure
      smtpUser
      clientId
      sandbox
      publishableKey
      currency
      currencySymbol
      deliveryRate
      twilioAccountSid
      twilioPhoneNumber
      twilioEnabled
      skipWhatsAppOTP
      twilioWhatsAppNumber
      whatsappCloudEnabled
      whatsappPhoneNumberId
      whatsappWabaId
      whatsappApiVersion
      whatsappOtpTemplate
      whatsappOtpLang
      whatsappAccessTokenSet
      formEmail
      sendGridEnabled
      sendGridEmail
      sendGridEmailName
      dashboardSentryUrl
      webSentryUrl
      apiSentryUrl
      customerAppSentryUrl
      restaurantAppSentryUrl
      riderAppSentryUrl
      cloudinaryUploadUrl
      cloudinaryApiKey
      webAmplitudeApiKey
      appAmplitudeApiKey
      webClientID
      androidClientID
      iOSClientID
      expoClientID
      googleMapLibraries
      googleColor
      termsAndConditions
      privacyPolicy
      testOtp
      firebaseKey
      authDomain
      projectId
      storageBucket
      msgSenderId
      appId
      measurementId
      isPaidVersion
      skipEmailVerification
      skipMobileVerification
      costType
      vapidKey
      enableCustomerDemoMode
      customerDemoZoneId
      defaultCommissionRate
      commissionBillingCycle
      riderCashLimit
      defaultLatitude
      defaultLongitude
    }
  }
`;

export const GET_WHATSAPP_TEMPLATES = gql`
  query getWhatsappTemplates {
    whatsappTemplates {
      _id
      key
      metaName
      language
      category
      status
      isActive
      lastSyncedAt
    }
  }
`;

export const GET_WHATSAPP_USAGE_STATS = gql`
  query getWhatsappUsageStats($days: Int) {
    whatsappUsageStats(days: $days) {
      days
      total
      uniqueRecipients
      rows {
        userType
        purpose
        channel
        status
        count
      }
    }
  }
`;
