import { Component, effect, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { Product } from '../../core/models/product.model';
import { ProductService } from '../../core/products/product.service';
import { DotLoader } from '../../shared/components/dot-loader/dot-loader';

@Component({
  selector: 'app-dashboard',
  imports: [DotLoader],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  protected readonly authService = inject(AuthService);
  private readonly productService = inject(ProductService);

  protected readonly searchInputValue = signal('');
  private readonly searchTerm = signal('');
  protected readonly selectedCategory = signal('All');
  protected readonly categories = signal<string[]>(['All']);

  protected readonly products = signal<Product[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal(false);

  protected readonly wishlist = signal<ReadonlySet<string>>(new Set());
  protected readonly cartCount = signal(0);

  private searchDebounceHandle?: ReturnType<typeof setTimeout>;
  private requestId = 0;

  constructor() {
    this.productService.categories().subscribe({
      next: (categories) => this.categories.set(['All', ...categories]),
      error: () => {
        /* category chips just fall back to "All" — not worth surfacing an error for */
      },
    });

    effect(() => {
      const value = this.searchInputValue();
      clearTimeout(this.searchDebounceHandle);
      this.searchDebounceHandle = setTimeout(() => this.searchTerm.set(value), 300);
    });

    effect(() => {
      this.fetchProducts(this.selectedCategory(), this.searchTerm());
    });
  }

  protected readonly stars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (i < Math.round(rating) ? 'full' : 'empty'));

  protected onSearchInput(value: string): void {
    this.searchInputValue.set(value);
  }

  protected selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  protected isWishlisted(id: string): boolean {
    return this.wishlist().has(id);
  }

  protected toggleWishlist(id: string): void {
    const next = new Set(this.wishlist());
    next.has(id) ? next.delete(id) : next.add(id);
    this.wishlist.set(next);
  }

  protected addToCart(): void {
    this.cartCount.update((count) => count + 1);
  }

  private fetchProducts(category: string, search: string): void {
    const requestId = ++this.requestId;
    this.isLoading.set(true);
    this.loadError.set(false);

    this.productService.list({ category, search }).subscribe({
      next: (response) => {
        if (requestId !== this.requestId) return;
        this.products.set(response.items);
        this.isLoading.set(false);
      },
      error: () => {
        if (requestId !== this.requestId) return;
        this.products.set([]);
        this.isLoading.set(false);
        this.loadError.set(true);
      },
    });
  }
}
