import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CategorySummary,
  Product,
  ProductFacets,
  ProductListResponse,
  ProductSort,
  ReviewListResponse,
} from '../models/product.model';

export interface ProductListQuery {
  category?: string;
  search?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  minRating?: number | null;
  onSale?: boolean;
  badge?: string | null;
  sort?: ProductSort;
  limit?: number;
  offset?: number;
}

export interface ProductFacetsQuery {
  category?: string;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.productsApiUrl}/products`;

  list(query: ProductListQuery = {}): Observable<ProductListResponse> {
    let params = scopeParams(query);

    if (query.minPrice != null) {
      params = params.set('minPrice', query.minPrice);
    }
    if (query.maxPrice != null) {
      params = params.set('maxPrice', query.maxPrice);
    }
    if (query.minRating != null) {
      params = params.set('minRating', query.minRating);
    }
    if (query.onSale) {
      params = params.set('onSale', true);
    }
    if (query.badge) {
      params = params.set('badge', query.badge);
    }
    if (query.sort) {
      params = params.set('sort', query.sort);
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

  categorySummaries(): Observable<CategorySummary[]> {
    return this.http.get<CategorySummary[]>(`${this.baseUrl}/categories/summary`);
  }

  facets(query: ProductFacetsQuery = {}): Observable<ProductFacets> {
    return this.http.get<ProductFacets>(`${this.baseUrl}/facets`, { params: scopeParams(query) });
  }

  get(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/${id}`);
  }

  reviews(productId: string, limit: number, offset: number): Observable<ReviewListResponse> {
    const params = new HttpParams().set('limit', limit).set('offset', offset);
    return this.http.get<ReviewListResponse>(`${this.baseUrl}/${productId}/reviews`, { params });
  }
}

function scopeParams(query: ProductFacetsQuery): HttpParams {
  let params = new HttpParams();

  if (query.category && query.category.toLowerCase() !== 'all') {
    params = params.set('category', query.category);
  }
  if (query.search) {
    params = params.set('search', query.search);
  }

  return params;
}
