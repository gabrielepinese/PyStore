export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  cardholderName: string;
  isDefault: boolean;
  createdAt: string;
}

export interface PaymentMethodCreate {
  cardNumber: string;
  cardholderName: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}
