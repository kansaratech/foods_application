export interface IWaitlistEntry {
  _id: string;
  email: string | null;
  phone: string | null;
  latitude: number;
  longitude: number;
  areaLabel: string | null;
  source: string | null;
  notified: boolean;
  createdAt: string;
}

export interface IWaitlistEntriesResponse {
  waitlistEntries: {
    total: number;
    entries: IWaitlistEntry[];
  };
}
