import { gql } from '@apollo/client';

export const UPSERT_STORE_DOCUMENT = gql`
  mutation UpsertStoreDocument(
    $restaurantId: ID!
    $kind: String!
    $number: String
    $fileUrl: String
    $holderName: String
    $ifsc: String
    $bankName: String
    $issueDate: String
    $fileName: String
    $fileSize: String
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
      issueDate: $issueDate
      fileName: $fileName
      fileSize: $fileSize
      expiryDate: $expiryDate
    ) {
      _id
      kind
      status
    }
  }
`;

export const REVIEW_STORE_DOCUMENT = gql`
  mutation ReviewStoreDocument($id: ID!, $status: String!, $note: String) {
    reviewStoreDocument(id: $id, status: $status, note: $note) {
      _id
      status
      reviewNote
      reviewedAt
    }
  }
`;

export const DELETE_STORE_DOCUMENT = gql`
  mutation DeleteStoreDocument($id: ID!) {
    deleteStoreDocument(id: $id)
  }
`;

export const CLONE_MENU = gql`
  mutation CloneMenu($fromRestaurantId: ID!, $toRestaurantId: ID!, $replace: Boolean) {
    cloneMenu(fromRestaurantId: $fromRestaurantId, toRestaurantId: $toRestaurantId, replace: $replace) {
      _id
      name
    }
  }
`;
