import { gql } from '@apollo/client';

export const CREATE_VENDOR = gql`
  mutation CreateVendor($vendorInput: VendorInput!) {
    createVendor(vendorInput: $vendorInput) {
      _id
      email
      name
      image
      firstName
      lastName
      phoneNumber
      businessName
      businessType
      isGstRegistered
      gstin
      status
    }
  }
`;

// Lenient partial save used by the registration wizard's Continue / Save
// draft actions — only email is required server-side.
export const SAVE_VENDOR_DRAFT = gql`
  mutation SaveVendorDraft($vendorInput: VendorInput!) {
    saveVendorDraft(vendorInput: $vendorInput) {
      _id
      email
      name
      image
      firstName
      lastName
      phoneNumber
      businessName
      businessType
      isGstRegistered
      gstin
      status
    }
  }
`;

export const UPSERT_VENDOR_DOCUMENT = gql`
  mutation UpsertVendorDocument(
    $vendorId: ID!
    $kind: String!
    $number: String
    $fileUrl: String
    $holderName: String
    $ifsc: String
    $bankName: String
  ) {
    upsertVendorDocument(
      vendorId: $vendorId
      kind: $kind
      number: $number
      fileUrl: $fileUrl
      holderName: $holderName
      ifsc: $ifsc
      bankName: $bankName
    ) {
      _id
      vendorId
      kind
      number
      fileUrl
      holderName
      ifsc
      bankName
      status
    }
  }
`;

export const GET_VENDOR_DOCUMENTS = gql`
  query GetVendorDocuments($vendorId: ID!) {
    vendorDocuments(vendorId: $vendorId) {
      _id
      kind
      number
      fileUrl
      holderName
      ifsc
      bankName
      status
    }
  }
`;

export const EDIT_VENDOR = gql`
  mutation EditVendor($vendorInput: VendorInput!) {
    editVendor(vendorInput: $vendorInput) {
      _id
      email
      name
      image
      firstName
      lastName
      phoneNumber
    }
  }
`;

export const DELETE_VENDOR = gql`
  mutation DeleteVendor($id: String!) {
    deleteVendor(id: $id)
  }
`;
