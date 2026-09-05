import { gql } from "@apollo/client";

export const UPDATE_AVAILABILITY = gql`
  mutation ToggleStore($restaurantId: String!) {
    toggleStoreAvailability(restaurantId: $restaurantId) {
      _id
      isAvailable
    }
  }
`;
export const UPDATE_BUSINESS_DETAILS = gql`
  mutation UpdateRestaurantBussinessDetails(
    $updateRestaurantBussinessDetailsId: String!
    $bussinessDetails: BussinessDetailsInput
  ) {
    updateRestaurantBussinessDetails(
      id: $updateRestaurantBussinessDetailsId
      bussinessDetails: $bussinessDetails
    ) {
      success
      message
      data {
        _id
      }
    }
  }
`;

export const UPSERT_STORE_DOCUMENT = gql`
  mutation UpsertStoreDocument(
    $restaurantId: ID!
    $kind: String!
    $number: String
    $fileUrl: String
    $holderName: String
    $ifsc: String
    $bankName: String
    $expiryDate: String
  ) {
    upsertStoreDocument(
      restaurantId: $restaurantId
      kind: $kind
      number: $number
      fileUrl: $fileUrl
      holderName: $holderName
      ifsc: $ifsc
      bankName: $bankName
      expiryDate: $expiryDate
    ) {
      _id
      kind
      number
      fileUrl
      holderName
      ifsc
      bankName
      expiryDate
      status
      reviewNote
    }
  }
`;
