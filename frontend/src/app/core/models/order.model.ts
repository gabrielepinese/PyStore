export interface OrderItemInput {
  productId: string;
  qty: number;
}

export interface ShippingAddressInput {
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  postalCode: string;
  country: string;
  phone: string | null;
}

export interface OrderCreateRequest {
  items: OrderItemInput[];
  shippingAddress: ShippingAddressInput;
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  unitPrice: number;
  qty: number;
}

export type OrderStatus = 'pending' | 'paid' | 'failed';

export interface Order {
  id: string;
  status: OrderStatus;
  currency: string;
  subtotal: number;
  total: number;
  createdAt: string;
  items: OrderItem[];
}

export interface OrderCreateResponse {
  order: Order;
  clientSecret: string;
}
