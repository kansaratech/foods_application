export interface IRiderResponseZone {
  __typename: 'Zone';
  _id: string;
  title: string;
}

export interface IRiderCurrentTask {
  __typename?: 'RiderCurrentTask';
  orderId: string;
  status: string;
}

export interface IRiderDocumentSummary {
  __typename?: 'RiderDocumentSummary';
  required: number;
  submitted: number;
  verified: number;
  rejected: number;
  pending: number;
}

export type TRiderEmploymentType = 'INDEPENDENT' | 'STORE_ASSIGNED';

export interface IRiderStats {
  __typename?: 'RiderStats';
  total: number;
  online: number;
  onDelivery: number;
  documentsPending: number;
}

export interface IRiderStatsResponse {
  riderStats: IRiderStats;
}

export interface IRiderResponse {
  __typename: 'Rider';
  _id: string;
  name: string;
  username: string;
  phone: string;
  email?: string | null;
  image?: string | null;
  available: boolean;
  isActive?: boolean;
  status?: string;
  employmentType?: TRiderEmploymentType;
  vehicleType: string;
  assigned: string[];
  zone: IRiderResponseZone | null;
  currentTask?: IRiderCurrentTask | null;
  vehicleDetails?: { number?: string | null } | null;
  documentSummary?: IRiderDocumentSummary;
}

export interface ISingleRiderResponse {
  __typename: 'Rider';
  _id: string;
  name: string;
  email: string;
  image?: string | null;
  isActive?: boolean;
  status?: string;
  employmentType?: TRiderEmploymentType;
  vehicleType?: string;
  username: string;
  phone: string;
  available: boolean;
  assigned: string[];
  zone: IRiderResponseZone | null;
  bussinessDetails: IBusinessDetails;
  licenseDetails: ILicenseDetails;
  vehicleDetails: IVehicleDetails;
}

export interface IBusinessDetails {
  bankName: string;
  accountName: string;
  accountCode: string;
  accountNumber: number;
  businessRegNo: number;
  companyRegNo: number;
  taxRate: number;
}

export interface ILicenseDetails {
  number: string;
  expiryDate: string; // ISO date string (e.g., "2024-12-31T00:00:00Z")
  image: string;
}

export interface IVehicleDetails {
  number: string;
  image: string;
}

// Define the structure of the query result object
export interface IRidersDataResponse {
  riders: IRiderResponse[];
}

export interface IRidersPaginatedDataResponse {
  ridersPaginated: {
    data: IRiderResponse[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  };
}

export interface IRiderDetailDataResponse {
  rider: ISingleRiderResponse;
}

export type TRiderStatusFilter = 'all' | 'online' | 'on_delivery' | 'offline';

export interface IRidersTableHeaderProps {
  globalFilterValue: string;
  onGlobalFilterChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  zoneFilter: string | null;
  onZoneFilterChange: (zoneId: string | null) => void;
  statusFilter: TRiderStatusFilter;
  onStatusFilterChange: (status: TRiderStatusFilter) => void;
  vehicleTypeFilter: string | null;
  onVehicleTypeFilterChange: (vehicleType: string | null) => void;
  onClearFilters: () => void;
}
export interface IRiderReponse {
  _id: string;
  name: string;
  username: string;
  phone: string;
  available: boolean;
  zone: {
    _id: string;
    title: string;
    __typename: 'Zone';
  } | null;
  __typename: 'Rider';
}

export interface IRidersResponseGraphQL {
  riders: IRiderReponse[];
}

export interface IRiderDetailsProps {
  loading: boolean;
  rider: ISingleRiderResponse | undefined;
}
