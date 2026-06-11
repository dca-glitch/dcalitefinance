export interface ServiceItemRecord {
  id: string;
  name: string;
  description: string | null;
  unitPriceMinor: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ServiceItemsListData {
  serviceItems: ServiceItemRecord[];
  page: number;
  limit: number;
  total: number;
}

export interface ServiceItemData {
  serviceItem: ServiceItemRecord;
}

export interface ListServiceItemsParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface ServiceItemMutationInput {
  name: string;
  unitPriceMinor: number;
  description?: string | null;
}
