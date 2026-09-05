export interface IBannerItemProps {
  item: {
    _id: string;
    title: string;
    description: string;
    action: string;
    screen: string;
    file: string;
    parameters?: string[];
    shopType?: string;
    slug?: string;
    couponCode?: string | null;
    placement?: string | null;
    priority?: number | null;
  }
}

export interface IBanner {
  __typename?: string;
  _id: string;
  title: string;
  description: string;
  action: string;
  screen: string;
  file: string;
  parameters?: string[];
  shopType?: string;
  slug?: string;
  startDate?: string | null;
  endDate?: string | null;
  placement?: string | null;
  priority?: number | null;
  couponCode?: string | null;
  isActive?: boolean;
}

export interface IGetBannersResponse {
  banners: IBanner[];
}