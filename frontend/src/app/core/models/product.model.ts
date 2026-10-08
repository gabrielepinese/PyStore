export interface Product {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  originalPrice: number | null;
  rating: number;
  reviews: number;
  stock: number;
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
  priceHistogram: number[];
  badges: BadgeFacet[];
  onSaleCount: number;
}

export interface Review {
  id: string;
  productId: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
}

export interface ReviewListResponse {
  items: Review[];
  total: number;
  limit: number;
  offset: number;
  averageRating: number;
  reviewCount: number;
  ratingBreakdown: Record<number, number>;
}
