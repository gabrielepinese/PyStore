import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowRight,
  faAngleLeft,
  faAngleRight,
  faHeart as faHeartSolid,
  faShareNodes,
  faStar,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons';
import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { CartService } from '../../core/cart/cart.service';
import {
  CategorySummary,
  Product,
  ProductFacets,
  ProductSort,
} from '../../core/models/product.model';
import { ProductListQuery, ProductService } from '../../core/products/product.service';
import { DotLoader } from '../../shared/components/dot-loader/dot-loader';
import { ProductCardSkeleton } from '../../shared/components/product-card-skeleton/product-card-skeleton';
import { Topbar } from '../../shared/components/topbar/topbar';

type TileSize = 'lg' | 'tall' | 'sm' | 'wide' | 'full';

interface CategoryTile extends CategorySummary {
  size: TileSize;
  background: string;
  foreground: string;
  shapes: string[];
}

interface Filters {
  sort: ProductSort;
  minPrice: number | null;
  maxPrice: number | null;
  minRating: number | null;
  onSale: boolean;
  badge: string | null;
}

type FilterKey = 'price' | 'minRating' | 'onSale' | 'badge';

const DEFAULT_FILTERS: Filters = {
  sort: 'newest',
  minPrice: null,
  maxPrice: null,
  minRating: null,
  onSale: false,
  badge: null,
};

const ALL = 'All';

// Six tiles fill a 4-column bento block exactly (two rows of lg+tall+sm+sm,
// then one row of 2 wide). Categories arrive biggest-first, so the biggest
// categories get the largest tiles.
const TILE_PATTERN: TileSize[] = ['lg', 'tall', 'sm', 'sm', 'wide', 'wide'];

// When the last block is incomplete, the final tile stretches to close the gap.
const LAST_TILE_FILL: Record<number, TileSize> = { 1: 'full', 2: 'lg', 3: 'tall', 5: 'full' };

function tileSize(index: number, count: number): TileSize {
  if (index === count - 1) {
    const fill = LAST_TILE_FILL[count % TILE_PATTERN.length];
    if (fill) return fill;
  }
  return TILE_PATTERN[index % TILE_PATTERN.length];
}

function isLight(hex: string): boolean {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) return true;
  const value = parseInt(match[1], 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  // Perceived luminance (Rec. 601)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
}

function parsePrice(raw: string): number | null {
  if (raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

interface PromoBadge {
  label: string;
  message: string;
}

const PROMO_BADGES: Record<string, PromoBadge> = {
  sale: { label: 'Sale', message: "Limited-time price drop — won't last" },
  bestseller: { label: 'Bestseller', message: 'Loved by thousands of shoppers' },
};

function promoBadge(badge: string | null): PromoBadge | null {
  return badge ? (PROMO_BADGES[badge.toLowerCase()] ?? null) : null;
}

const CATEGORY_BLURBS: Record<string, string> = {
  electronics: 'Reliable tech, built to keep up with your day.',
  fashion: 'A versatile piece that pairs with anything in your closet.',
  home: 'Everyday comfort with a design that fits any room.',
  beauty: 'Gentle, effective, and a favorite among regulars.',
  sports: 'Durable gear made for frequent use.',
  toys: 'Hours of fun, built to survive the playroom.',
};

const DEFAULT_BLURB = 'Solid quality at a fair price — a dependable pick.';

function shortDescription(product: Product): string {
  const promo = promoBadge(product.badge);
  if (promo) return promo.message;
  return product.description ?? CATEGORY_BLURBS[product.category.toLowerCase()] ?? DEFAULT_BLURB;
}

@Component({
  selector: 'app-dashboard',
  imports: [DotLoader, ProductCardSkeleton, RouterLink, FaIconComponent, Topbar],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  protected readonly icons = {
    arrowRight: faArrowRight,
    angleLeft: faAngleLeft,
    angleRight: faAngleRight,
    heartRegular: faHeartRegular,
    heartSolid: faHeartSolid,
    share: faShareNodes,
    star: faStar,
    xmark: faXmark,
  };

  protected readonly authService = inject(AuthService);
  private readonly cartService = inject(CartService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productService = inject(ProductService);

  // ---- search ----
  // Seeded from ?search=, e.g. when the topbar sends a search here from another page.
  private readonly initialSearch = this.route.snapshot.queryParamMap.get('search') ?? '';
  protected readonly searchInputValue = signal(this.initialSearch);
  protected readonly searchTerm = signal(this.initialSearch);

  // ---- navigation: null = category overview, 'All' or a name = product list ----
  // Seeded from ?category=, so a product's "Back to products" link (browser back
  // to this same URL) restores the list instead of landing back on the overview.
  private readonly initialCategory = this.route.snapshot.queryParamMap.get('category');
  protected readonly selectedCategory = signal<string | null>(this.initialCategory);
  protected readonly showingProducts = computed(
    () => this.selectedCategory() !== null || this.searchTerm() !== '',
  );
  protected readonly activeCategory = computed(() => this.selectedCategory() ?? ALL);
  protected readonly listTitle = computed(() => {
    const category = this.selectedCategory();
    if (category && category !== ALL) return category;
    return this.searchTerm() ? 'Search results' : 'All products';
  });

  // ---- categories overview ----
  protected readonly summaries = signal<CategorySummary[]>([]);
  protected readonly categoriesLoading = signal(true);
  protected readonly categoriesError = signal(false);
  protected readonly categoryNames = computed(() => [ALL, ...this.summaries().map((s) => s.name)]);
  protected readonly totalProducts = computed(() =>
    this.summaries().reduce((sum, s) => sum + s.productCount, 0),
  );

  protected categoryCount(name: string): number {
    if (name === ALL) return this.totalProducts();
    return this.summaries().find((s) => s.name === name)?.productCount ?? 0;
  }
  protected readonly tiles = computed<CategoryTile[]>(() => {
    const summaries = this.summaries();
    return summaries.map((summary, index) => {
      const [base = '#B3B4B8', ...rest] = summary.accents;
      return {
        ...summary,
        size: tileSize(index, summaries.length),
        background: base,
        foreground: isLight(base) ? '#1a1a1a' : '#F6F2EF',
        shapes: rest.length ? rest : ['#F6F2EF'],
      };
    });
  });

  // ---- filters ----
  protected readonly filters = signal<Filters>(DEFAULT_FILTERS);
  protected readonly facets = signal<ProductFacets | null>(null);
  protected readonly sortOptions: { value: ProductSort; label: string }[] = [
    { value: 'newest', label: 'Newest' },
    { value: 'popular', label: 'Most popular' },
    { value: 'rating', label: 'Top rated' },
    { value: 'discount', label: 'Biggest discount' },
    { value: 'price_asc', label: 'Price: low to high' },
    { value: 'price_desc', label: 'Price: high to low' },
  ];
  protected readonly ratingOptions: { value: number | null; label: string }[] = [
    { value: null, label: 'Any' },
    { value: 4, label: '4+' },
    { value: 4.5, label: '4.5+' },
  ];
  protected readonly activeFilters = computed(() => {
    const f = this.filters();
    const chips: { key: FilterKey; label: string }[] = [];
    if (f.minPrice != null || f.maxPrice != null) {
      const label =
        f.minPrice != null && f.maxPrice != null
          ? `$${f.minPrice} – $${f.maxPrice}`
          : f.minPrice != null
            ? `From $${f.minPrice}`
            : `Up to $${f.maxPrice}`;
      chips.push({ key: 'price', label });
    }
    if (f.minRating != null) chips.push({ key: 'minRating', label: `${f.minRating}+ stars` });
    if (f.onSale) chips.push({ key: 'onSale', label: 'On sale' });
    if (f.badge) chips.push({ key: 'badge', label: f.badge });
    return chips;
  });

  // ---- product list ----
  protected readonly products = signal<Product[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal(false);

  private readonly pageSize = 8;
  private readonly initialPage = Number(this.route.snapshot.queryParamMap.get('page')) || 1;
  protected readonly offset = signal(Math.max(0, this.initialPage - 1) * this.pageSize);
  protected readonly total = signal(0);
  protected readonly currentPage = computed(() => Math.floor(this.offset() / this.pageSize) + 1);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize)),
  );
  protected readonly pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1),
  );

  // While refreshing, show as many placeholders as there were cards so the page height doesn't jump.
  protected readonly skeletonSlots = computed(() =>
    Array.from({ length: this.products().length || this.pageSize }, (_, i) => i),
  );

  protected readonly wishlist = signal<ReadonlySet<string>>(new Set());

  private readonly listQuery = computed<ProductListQuery | null>(() => {
    if (!this.showingProducts()) return null;
    return {
      category: this.activeCategory(),
      search: this.searchTerm(),
      ...this.filters(),
      limit: this.pageSize,
      offset: this.offset(),
    };
  });

  private readonly resultsEl = viewChild<ElementRef<HTMLElement>>('results');

  private searchDebounceHandle?: ReturnType<typeof setTimeout>;
  private requestId = 0;
  private facetsRequestId = 0;

  constructor() {
    this.productService.categorySummaries().subscribe({
      next: (summaries) => {
        this.summaries.set(summaries);
        this.categoriesLoading.set(false);
      },
      error: () => {
        this.categoriesLoading.set(false);
        this.categoriesError.set(true);
      },
    });

    effect(() => {
      const value = this.searchInputValue().trim();
      clearTimeout(this.searchDebounceHandle);
      this.searchDebounceHandle = setTimeout(() => {
        if (this.searchTerm() !== value) {
          this.searchTerm.set(value);
          this.offset.set(0);
        }
      }, 300);
    });

    effect(() => {
      const query = this.listQuery();
      if (query) this.fetchProducts(query);
    });

    effect(() => {
      if (!this.showingProducts()) return;
      this.fetchFacets(this.activeCategory(), this.searchTerm());
    });

    // Mirror the list state into the URL (replacing, not pushing) so navigating
    // away to a product and back lands on this same list, not the overview.
    effect(() => {
      const category = this.selectedCategory();
      const search = this.searchTerm();
      const page = this.currentPage();

      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          category: category ?? null,
          search: search || null,
          page: page > 1 ? page : null,
        },
        replaceUrl: true,
      });
    });
  }

  protected readonly stars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (i < Math.round(rating) ? 'full' : 'empty'));

  protected readonly promoBadge = (badge: string | null) => promoBadge(badge);
  protected readonly shortDescription = (product: Product) => shortDescription(product);

  protected shareProduct(product: Product): void {
    const url = `${location.origin}/products/${product.id}`;
    if (navigator.share) {
      navigator.share({ title: product.name, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).catch(() => {});
    }
  }

  protected onSearchInput(value: string): void {
    this.searchInputValue.set(value);
  }

  // ---- navigation ----

  protected selectCategory(category: string): void {
    // Different category → drop the previous one's cards so they don't linger dimmed under the loader.
    if (this.selectedCategory() !== category) this.products.set([]);
    this.selectedCategory.set(category);
    this.filters.set(DEFAULT_FILTERS);
    this.offset.set(0);
  }

  protected goToOverview(): void {
    clearTimeout(this.searchDebounceHandle);
    this.searchInputValue.set('');
    this.searchTerm.set('');
    this.selectedCategory.set(null);
    this.products.set([]);
    this.filters.set(DEFAULT_FILTERS);
    this.offset.set(0);
  }

  // ---- filters ----

  protected setSort(value: string): void {
    this.patchFilters({ sort: value as ProductSort });
  }

  protected setPriceRange(rawMin: string, rawMax: string): void {
    let minPrice = parsePrice(rawMin);
    let maxPrice = parsePrice(rawMax);
    if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
      [minPrice, maxPrice] = [maxPrice, minPrice];
    }
    this.patchFilters({ minPrice, maxPrice });
  }

  protected setMinRating(value: number | null): void {
    this.patchFilters({ minRating: value });
  }

  protected toggleOnSale(): void {
    this.patchFilters({ onSale: !this.filters().onSale });
  }

  protected toggleBadge(badge: string): void {
    this.patchFilters({ badge: this.filters().badge === badge ? null : badge });
  }

  protected removeFilter(key: FilterKey): void {
    switch (key) {
      case 'price':
        return this.patchFilters({ minPrice: null, maxPrice: null });
      case 'minRating':
        return this.patchFilters({ minRating: null });
      case 'onSale':
        return this.patchFilters({ onSale: false });
      case 'badge':
        return this.patchFilters({ badge: null });
    }
  }

  protected clearFilters(): void {
    this.patchFilters({ ...DEFAULT_FILTERS, sort: this.filters().sort });
  }

  private patchFilters(patch: Partial<Filters>): void {
    this.filters.update((current) => ({ ...current, ...patch }));
    this.offset.set(0);
  }

  // ---- pagination ----

  protected goToPreviousPage(): void {
    this.offset.update((value) => Math.max(0, value - this.pageSize));
    this.scrollToResults();
  }

  protected goToNextPage(): void {
    if (this.offset() + this.pageSize < this.total()) {
      this.offset.update((value) => value + this.pageSize);
      this.scrollToResults();
    }
  }

  protected goToPage(page: number): void {
    this.offset.set((page - 1) * this.pageSize);
    this.scrollToResults();
  }

  // Filters keep the user where they are; only page changes jump back up to the first card.
  private scrollToResults(): void {
    this.resultsEl()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---- wishlist / cart ----

  protected isWishlisted(id: string): boolean {
    return this.wishlist().has(id);
  }

  protected toggleWishlist(id: string): void {
    if (!this.requireSignIn()) return;

    const next = new Set(this.wishlist());
    next.has(id) ? next.delete(id) : next.add(id);
    this.wishlist.set(next);
  }

  protected addToCart(): void {
    if (!this.requireSignIn()) return;

    this.cartService.add();
  }

  /** Guests can browse but not act: sends them to the login page and returns false. */
  private requireSignIn(): boolean {
    if (this.authService.isAuthenticated()) return true;
    this.router.navigateByUrl('/login');
    return false;
  }

  // ---- data ----

  private fetchProducts(query: ProductListQuery): void {
    const requestId = ++this.requestId;
    this.isLoading.set(true);
    this.loadError.set(false);

    this.productService.list(query).subscribe({
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

  private fetchFacets(category: string, search: string): void {
    const requestId = ++this.facetsRequestId;

    this.productService.facets({ category, search }).subscribe({
      next: (facets) => {
        if (requestId === this.facetsRequestId) this.facets.set(facets);
      },
      error: () => {
        /* filters stay usable without facets — just no placeholders / badge chips */
        if (requestId === this.facetsRequestId) this.facets.set(null);
      },
    });
  }
}
