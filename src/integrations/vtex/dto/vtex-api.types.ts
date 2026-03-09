export interface VtexOrderListResponse {
  list: VtexOrderSummary[];
  paging: { total: number; pages: number; currentPage: number; perPage: number };
}

export interface VtexOrderSummary {
  orderId: string;
  creationDate: string;
  status: string;
  totalValue: number;
  currencyCode: string;
}

export interface VtexOrderDetail {
  orderId: string;
  sequence: string;
  status: string;
  creationDate: string;
  value: number;
  totals: VtexTotal[];
  items: VtexOrderItem[];
  clientProfileData: VtexClientProfile;
  shippingData: { address: VtexAddress };
  paymentData: { transactions: VtexTransaction[] };
  packageAttachment?: { packages?: VtexPackage[] };
}

export interface VtexOrderItem {
  id: string;
  productId: string;
  refId: string;
  name: string;
  skuName: string;
  quantity: number;
  price: number;
  sellingPrice: number;
  imageUrl: string;
}

export interface VtexClientProfile {
  email: string;
  firstName: string;
  lastName: string;
  document: string;
  documentType: string;
  phone: string;
  isCorporate: boolean;
  corporateName?: string;
  tradeName?: string;
}

export interface VtexAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface VtexTotal {
  id: string;
  name: string;
  value: number;
}

export interface VtexTransaction {
  payments: { paymentSystemName: string; value: number }[];
}

export interface VtexPackage {
  invoiceNumber: string;
  invoiceValue: number;
  invoiceUrl?: string;
  invoiceKey?: string;
}

export interface VtexWebhookPayload {
  Domain: string;
  OrderId: string;
  State: string;
  LastState: string;
  LastChange: string;
  CurrentChange: string;
  Origin: { Account: string; Key: string };
}

export interface VtexInvoiceData {
  type: string;
  invoiceNumber: string;
  invoiceValue: number;
  issuanceDate: string;
  items: { id: string; quantity: number; price: number }[];
}
