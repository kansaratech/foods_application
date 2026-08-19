import { gql } from '@apollo/client';

export const CREATE_ADDONS = gql`
  mutation CreateAddon($addonInput: AddonInput!) {
    createAddon(addonInput: $addonInput) {
      _id
      title
      description
      quantityMinimum
      quantityMaximum
      options {
        _id
        title
        description
        price
      }
    }
  }
`;
export const EDIT_ADDON = gql`
  mutation editAddon($addonInput: AddonInput!) {
    editAddon(addonInput: $addonInput) {
      _id
      title
      description
      quantityMinimum
      quantityMaximum
      options {
        _id
        title
        description
        price
      }
    }
  }
`;

export const DELETE_ADDON = gql`
  mutation DeleteAddon($id: String!, $restaurant: String!) {
    deleteAddon(id: $id, restaurant: $restaurant)
  }
`;
