import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Order, OrderCreateRequest, OrderCreateResponse } from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.ordersApiUrl}/orders`;

  create(request: OrderCreateRequest): Observable<OrderCreateResponse> {
    return this.http.post<OrderCreateResponse>(this.baseUrl, request);
  }

  confirm(orderId: string): Observable<Order> {
    return this.http.post<Order>(`${this.baseUrl}/${orderId}/confirm`, {});
  }

  get(orderId: string): Observable<Order> {
    return this.http.get<Order>(`${this.baseUrl}/${orderId}`);
  }
}
