import { gql } from '@apollo/client';

const RIDER_MUTATION_FIELDS = /* GraphQL */ `
  _id
  name
  username
  phone
  email
  image
  available
  isActive
  status
  employmentType
  vehicleType
  zone {
    _id
    title
  }
`;

export const CREATE_RIDER = gql`
  mutation CreateRider($riderInput: RiderInput!) {
    createRider(riderInput: $riderInput) {
      ${RIDER_MUTATION_FIELDS}
    }
  }
`;

export const SAVE_RIDER_DRAFT = gql`
  mutation SaveRiderDraft($riderInput: RiderInput!) {
    saveRiderDraft(riderInput: $riderInput) {
      ${RIDER_MUTATION_FIELDS}
    }
  }
`;

export const EDIT_RIDER = gql`
  mutation EditRider($riderInput: RiderInput!) {
    editRider(riderInput: $riderInput) {
      ${RIDER_MUTATION_FIELDS}
    }
  }
`;

export const DELETE_RIDER = gql`
  mutation DeleteRider($id: String!) {
    deleteRider(id: $id) {
      _id
    }
  }
`;

export const TOGGLE_RIDER = gql`
  mutation ToggleRider($id: String!) {
    toggleAvailablity(id: $id) {
      _id
      name
      username
      phone
      available
      vehicleType
      zone {
        title
      }
    }
  }
`;

export const SET_RIDER_APPROVAL = gql`
  mutation SetRiderApproval($id: String!, $status: String!, $note: String) {
    setRiderApproval(id: $id, status: $status, note: $note) {
      _id
      approvalStatus
      approvalNote
    }
  }
`;
