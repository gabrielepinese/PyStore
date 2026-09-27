import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProductListResponse } from '../models/product.model';

export interface ProductListQuery {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.productsApiUrl}/products`;

  list(query: ProductListQuery = {}): Observable<ProductListResponse> {
    let params = new HttpParams();

    if (query.category && query.category.toLowerCase() !== 'all') {
      params = params.set('category', query.category);
    }
    if (query.search) {
      params = params.set('search', query.search);
    }
    if (query.limit != null) {
      params = params.set('limit', query.limit);
    }
    if (query.offset != null) {
      params = params.set('offset', query.offset);
    }

    return this.http.get<ProductListResponse>(this.baseUrl, { params });
  }

  categories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/categories`);
  }
}
