export interface MeliTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
}

export interface MeliOrderSearchResponse {
  query: string;
  results: MeliOrderDetail[];
  sort: { id: string; name: string };
  paging: { total: number; offset: number; limit: number };
}

export interface MeliOrderDetail {
  id: number;
  status: string;
  status_detail: string | null;
  date_created: string;
  date_closed: string;
  total_amount: number;
  currency_id: string;
  order_items: MeliOrderItem[];
  payments: MeliPayment[];
  buyer: MeliBuyer;
  shipping: { id: number } | null;
  tags: string[];
  pack_id: number | null;
}

export interface MeliOrderItem {
  item: {
    id: string;
    title: string;
    seller_sku: string | null;
    category_id: string;
    variation_id: number | null;
  };
  quantity: number;
  unit_price: number;
  full_unit_price: number;
  currency_id: string;
}

export interface MeliPayment {
  id: number;
  status: string;
  status_detail: string;
  payment_type: string;
  payment_method_id: string;
  transaction_amount: number;
  currency_id: string;
  date_approved: string | null;
}

export interface MeliBuyer {
  id: number;
  nickname: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: { area_code: string; number: string } | null;
  billing_info: {
    doc_type: string;
    doc_number: string;
  } | null;
}

export interface MeliShipmentDetail {
  id: number;
  status: string;
  receiver_address: {
    street_name: string;
    street_number: string;
    city: { name: string };
    state: { name: string };
    country: { name: string };
    zip_code: string;
  } | null;
}

export interface MeliNotificationPayload {
  resource: string;
  user_id: number;
  topic: string;
  application_id: number;
  attempts: number;
  sent: string;
  received: string;
}

export interface MeliUserResponse {
  id: number;
  nickname: string;
  site_id: string;
}
