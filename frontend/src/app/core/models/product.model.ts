export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice: number | null;
  rating: number;
  reviews: number;
  badge: string | null;
  accent: string;
  createdAt: string;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  limit: number;
  offset: number;
}

export type ProductSort = 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'popular' | 'discount';

export interface CategorySummary {
  name: string;
  productCount: number;
  minPrice: number;
  maxPrice: number;
  avgRating: number;
  onSaleCount: number;
  featuredProduct: string | null;
  accents: string[];
}

export interface BadgeFacet {
  name: string;
  count: number;
}

export interface ProductFacets {
  priceMin: number;
  priceMax: number;
  badges: BadgeFacet[];
  onSaleCount: number;
}
