import { Component, computed, effect, inject, signal } from '@angular/core';
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

  private readonly pageSize = 8;
  protected readonly offset = signal(0);
  protected readonly total = signal(0);
  protected readonly currentPage = computed(() => Math.floor(this.offset() / this.pageSize) + 1);
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));
  protected readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

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
      this.searchDebounceHandle = setTimeout(() => {
        if (this.searchTerm() !== value) {
          this.searchTerm.set(value);
          this.offset.set(0);
        }
      }, 300);
    });

    effect(() => {
      this.fetchProducts(this.selectedCategory(), this.searchTerm(), this.offset());
    });
  }

  protected readonly stars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (i < Math.round(rating) ? 'full' : 'empty'));

  protected onSearchInput(value: string): void {
    this.searchInputValue.set(value);
  }

  protected selectCategory(category: string): void {
    this.selectedCategory.set(category);
    this.offset.set(0);
  }

  protected goToPreviousPage(): void {
    this.offset.update((value) => Math.max(0, value - this.pageSize));
  }

  protected goToNextPage(): void {
    if (this.offset() + this.pageSize < this.total()) {
      this.offset.update((value) => value + this.pageSize);
    }
  }

  protected goToPage(page: number): void {
    this.offset.set((page - 1) * this.pageSize);
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

  private fetchProducts(category: string, search: string, offset: number): void {
    const requestId = ++this.requestId;
    this.isLoading.set(true);
    this.loadError.set(false);

    this.productService.list({ category, search, limit: this.pageSize, offset }).subscribe({
      next: (response) => {
        if (requestId !== this.requestId) return;
        this.products.set(response.items);
        this.total.set(response.total);
        this.isLoading.set(false);
      },
      error: () => {
        if (requestId !== this.requestId) return;
        this.products.set([]);
        this.total.set(0);
        this.isLoading.set(false);
        this.loadError.set(true);
      },
    });
  }
}
