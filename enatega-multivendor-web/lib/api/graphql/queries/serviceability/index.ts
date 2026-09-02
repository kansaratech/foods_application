import { gql } from "@apollo/client";

export const SERVICEABILITY = gql`
  query Serviceability($latitude: Float!, $longitude: Float!) {
    serviceability(latitude: $latitude, longitude: $longitude) {
      serviceable
      storeCount
      nearestArea
      nearestDistanceKm
    }
  }
`;
