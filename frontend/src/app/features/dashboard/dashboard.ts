import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowRight,
  faAngleLeft,
  faAngleRight,
  faChevronDown,
  faHeart as faHeartSolid,
  faShareNodes,
  faStar,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons';
import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
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
  badges: string[];
  inStock: boolean;
}

type FilterKey = 'price' | 'minRating' | 'onSale' | 'badge' | 'inStock';

const DEFAULT_FILTERS: Filters = {
  sort: 'newest',
  minPrice: null,
  maxPrice: null,
  minRating: null,
  onSale: false,
  badges: [],
  inStock: false,
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


interface PromoBadge {
  label: string;
  message: string;
}

const PROMO_KEYS = new Set(['sale', 'bestseller']);
const BLURB_CATEGORIES = new Set(['electronics', 'fashion', 'home', 'beauty', 'sports', 'toys']);

interface ActiveFilterChip {
  key: FilterKey;
  value?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [DotLoader, ProductCardSkeleton, RouterLink, FaIconComponent, Topbar, TranslocoPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  protected readonly icons = {
    arrowRight: faArrowRight,
    angleLeft: faAngleLeft,
    angleRight: faAngleRight,
    chevronDown: faChevronDown,
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
  private readonly transloco = inject(TranslocoService);

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
  /** Raw category name, or null to mean "show the generic title" (decided at display time so it stays in sync with the active language). */
  protected readonly listTitle = computed(() => {
    const category = this.selectedCategory();
    return category && category !== ALL ? category : null;
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
  protected readonly sortOptions: { value: ProductSort; labelKey: string }[] = [
    { value: 'newest', labelKey: 'dashboard.sort.newest' },
    { value: 'popular', labelKey: 'dashboard.sort.popular' },
    { value: 'rating', labelKey: 'dashboard.sort.rating' },
    { value: 'discount', labelKey: 'dashboard.sort.discount' },
    { value: 'price_asc', labelKey: 'dashboard.sort.priceAsc' },
    { value: 'price_desc', labelKey: 'dashboard.sort.priceDesc' },
  ];
  protected readonly sortMenuOpen = signal(false);

  protected sortLabel(value: ProductSort): string {
    const option = this.sortOptions.find((o) => o.value === value);
    return option ? this.transloco.translate(option.labelKey) : '';
  }
  // Booking-style range sliders. Bounds come from the live facets (falling
  // back to a wide default before they load); the slider's resting position
  // at either bound means "no constraint there", same as the old null state.
  protected readonly priceBounds = computed(() => {
    const f = this.facets();
    return { min: f ? Math.floor(f.priceMin) : 0, max: f ? Math.ceil(f.priceMax) : 1000 };
  });
  protected readonly priceSliderMin = computed(
    () => this.filters().minPrice ?? this.priceBounds().min,
  );
  protected readonly priceSliderMax = computed(
    () => this.filters().maxPrice ?? this.priceBounds().max,
  );
  protected readonly priceFillLeft = computed(() => {
    const { min, max } = this.priceBounds();
    return ((this.priceSliderMin() - min) / (max - min || 1)) * 100;
  });
  protected readonly priceFillRight = computed(() => {
    const { min, max } = this.priceBounds();
    return 100 - ((this.priceSliderMax() - min) / (max - min || 1)) * 100;
  });

  // Booking's price slider shows a little histogram of how many products
  // fall in each price band, bars scaled to the tallest bucket, lit up
  // wherever they overlap the currently selected range.
  protected readonly priceHistogramBars = computed(() => {
    const histogram = this.facets()?.priceHistogram ?? [];
    if (!histogram.length) return [];

    const peak = Math.max(1, ...histogram);
    const bounds = this.priceBounds();
    const bucketWidth = (bounds.max - bounds.min || 1) / histogram.length;
    const selMin = this.priceSliderMin();
    const selMax = this.priceSliderMax();

    return histogram.map((count, i) => {
      const bucketStart = bounds.min + i * bucketWidth;
      const bucketEnd = bucketStart + bucketWidth;
      return {
        height: (count / peak) * 100,
        active: bucketEnd > selMin && bucketStart < selMax,
      };
    });
  });

  protected readonly ratingSliderValue = computed(() => this.filters().minRating ?? 0);
  protected readonly ratingFillPercent = computed(() => (this.ratingSliderValue() / 5) * 100);

  protected readonly activeFilters = computed(() => {
    const f = this.filters();
    const chips: ActiveFilterChip[] = [];
    if (f.minPrice != null || f.maxPrice != null) {
      chips.push({ key: 'price', minPrice: f.minPrice ?? undefined, maxPrice: f.maxPrice ?? undefined });
    }
    if (f.minRating != null) chips.push({ key: 'minRating', minRating: f.minRating });
    if (f.onSale) chips.push({ key: 'onSale' });
    if (f.inStock) chips.push({ key: 'inStock' });
    for (const badge of f.badges) chips.push({ key: 'badge', value: badge });
    return chips;
  });

  protected chipLabel(chip: ActiveFilterChip): string {
    switch (chip.key) {
      case 'price':
        if (chip.minPrice != null && chip.maxPrice != null) {
          return this.transloco.translate('dashboard.priceRange', { min: chip.minPrice, max: chip.maxPrice });
        }
        if (chip.minPrice != null) {
          return this.transloco.translate('dashboard.priceFrom', { min: chip.minPrice });
        }
        return this.transloco.translate('dashboard.priceUpTo', { max: chip.maxPrice });
      case 'minRating':
        return this.transloco.translate('dashboard.ratingPlus', { value: chip.minRating });
      case 'onSale':
        return this.transloco.translate('dashboard.onSaleFilter');
      case 'inStock':
        return this.transloco.translate('dashboard.inStockOnly');
      case 'badge':
        return chip.value!;
    }
  }

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

  protected promoBadge(badge: string | null): PromoBadge | null {
    if (!badge) return null;
    const key = badge.toLowerCase();
    if (!PROMO_KEYS.has(key)) return null;
    return {
      label: this.transloco.translate(`dashboard.promo.${key}.label`),
      message: this.transloco.translate(`dashboard.promo.${key}.message`),
    };
  }

  protected shortDescription(product: Product): string {
    const promo = this.promoBadge(product.badge);
    if (promo) return promo.message;
    if (product.description) return product.description;
    const category = product.category.toLowerCase();
    const key = BLURB_CATEGORIES.has(category) ? `dashboard.blurb.${category}` : 'dashboard.blurb.default';
    return this.transloco.translate(key);
  }

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

  protected toggleSortMenu(): void {
    this.sortMenuOpen.update((open) => !open);
  }

  protected selectSort(value: ProductSort): void {
    this.setSort(value);
    this.sortMenuOpen.set(false);
  }

  // Each handle is clamped against the other so the two thumbs can't cross;
  // resting exactly on a bound means "no constraint there" (back to null).
  protected onMinPriceSlider(raw: string): void {
    const { min } = this.priceBounds();
    const value = Math.min(Number(raw), this.priceSliderMax());
    this.patchFilters({ minPrice: value <= min ? null : value });
  }

  protected onMaxPriceSlider(raw: string): void {
    const { max } = this.priceBounds();
    const value = Math.max(Number(raw), this.priceSliderMin());
    this.patchFilters({ maxPrice: value >= max ? null : value });
  }

  protected setMinRating(value: number | null): void {
    this.patchFilters({ minRating: value });
  }

  protected onRatingSlider(raw: string): void {
    const value = Number(raw);
    this.setMinRating(value <= 0 ? null : value);
  }

  protected toggleOnSale(): void {
    this.patchFilters({ onSale: !this.filters().onSale });
  }

  protected toggleInStock(): void {
    this.patchFilters({ inStock: !this.filters().inStock });
  }

  // Badges are a multi-select checkbox group: picking a second one adds to the
  // set instead of replacing the first.
  protected toggleBadge(badge: string): void {
    const current = this.filters().badges;
    const badges = current.includes(badge)
      ? current.filter((b) => b !== badge)
      : [...current, badge];
    this.patchFilters({ badges });
  }

  protected removeFilter(chip: ActiveFilterChip): void {
    switch (chip.key) {
      case 'price':
        return this.patchFilters({ minPrice: null, maxPrice: null });
      case 'minRating':
        return this.patchFilters({ minRating: null });
      case 'onSale':
        return this.patchFilters({ onSale: false });
      case 'inStock':
        return this.patchFilters({ inStock: false });
      case 'badge':
        return this.toggleBadge(chip.value!);
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
