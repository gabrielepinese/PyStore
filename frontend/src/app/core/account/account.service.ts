import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Address, AddressWrite } from '../models/address.model';
import { PaymentMethod, PaymentMethodCreate } from '../models/payment-method.model';

/** Addresses and saved payment methods — both live under /auth/me since
 * they're per-user profile data owned by the auth service, not a separate
 * resource of their own. */
@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/auth/me`;

  listAddresses(): Observable<Address[]> {
    return this.http.get<Address[]>(`${this.baseUrl}/addresses`);
  }

  createAddress(data: AddressWrite): Observable<Address> {
    return this.http.post<Address>(`${this.baseUrl}/addresses`, data);
  }

  updateAddress(id: string, data: AddressWrite): Observable<Address> {
    return this.http.put<Address>(`${this.baseUrl}/addresses/${id}`, data);
  }

  deleteAddress(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/addresses/${id}`);
  }

  listPaymentMethods(): Observable<PaymentMethod[]> {
    return this.http.get<PaymentMethod[]>(`${this.baseUrl}/payment-methods`);
  }

  createPaymentMethod(data: PaymentMethodCreate): Observable<PaymentMethod> {
    return this.http.post<PaymentMethod>(`${this.baseUrl}/payment-methods`, data);
  }

  setDefaultPaymentMethod(id: string): Observable<PaymentMethod> {
    return this.http.put<PaymentMethod>(`${this.baseUrl}/payment-methods/${id}`, {
      isDefault: true,
    });
  }

  deletePaymentMethod(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/payment-methods/${id}`);
  }
}
