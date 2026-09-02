import { gql } from '@apollo/client';

const BANNER_FIELDS = `
  _id
  title
  description
  action
  file
  screen
  parameters
  startDate
  endDate
  placement
  priority
  couponCode
  isActive
`;

export const CREATE_BANNER = gql`
  mutation CreateBanner($bannerInput: BannerInput!) {
    createBanner(bannerInput: $bannerInput) {
      ${BANNER_FIELDS}
    }
  }
`;

export const EDIT_BANNER = gql`
  mutation editBanner($bannerInput: BannerInput!) {
    editBanner(bannerInput: $bannerInput) {
      ${BANNER_FIELDS}
    }
  }
`;

export const DELETE_BANNER = gql`
  mutation DeleteBanner($id: String!) {
    deleteBanner(id: $id)
  }
`;
