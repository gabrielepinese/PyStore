import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faAngleLeft,
  faAward,
  faBarcode,
  faBoxOpen,
  faCalendarDays,
  faCartShopping,
  faFolderOpen,
  faHeart as faHeartSolid,
  faStar,
  faTag,
} from '@fortawesome/free-solid-svg-icons';
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons';
import { DatePipe, Location } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { CartService } from '../../core/cart/cart.service';
import { Product, Review } from '../../core/models/product.model';
import { ProductService } from '../../core/products/product.service';
import { DotLoader } from '../../shared/components/dot-loader/dot-loader';
import { Topbar } from '../../shared/components/topbar/topbar';

type Tab = 'details' | 'shipping' | 'reviews';

const REVIEWS_PAGE_SIZE = 5;

interface ReviewsSummary {
  averageRating: number;
  reviewCount: number;
  ratingBreakdown: Record<number, number>;
}

interface BreakdownRow {
  star: number;
  count: number;
  percent: number;
}

interface ImageLayer {
  top: string;
  left: string;
  size: string;
  opacity: number;
}

interface ProductView {
  label: string;
  layers: ImageLayer[];
}

// No real product photography yet — each entry is a distinct abstract
// composition over the accent color, standing in for a separate seller photo
// (not the same image rotated).
const PRODUCT_VIEWS: ProductView[] = [
  { label: 'Front', layers: [{ top: '50%', left: '50%', size: '55%', opacity: 0.18 }] },
  {
    label: 'Side',
    layers: [
      { top: '35%', left: '68%', size: '42%', opacity: 0.22 },
      { top: '75%', left: '28%', size: '26%', opacity: 0.14 },
    ],
  },
  {
    label: 'Back',
    layers: [
      { top: '25%', left: '25%', size: '38%', opacity: 0.16 },
      { top: '70%', left: '65%', size: '55%', opacity: 0.2 },
    ],
  },
  {
    label: 'Detail',
    layers: [
      { top: '50%', left: '50%', size: '85%', opacity: 0.12 },
      { top: '50%', left: '50%', size: '30%', opacity: 0.3 },
    ],
  },
  {
    label: 'Packaging',
    layers: [
      { top: '20%', left: '50%', size: '30%', opacity: 0.25 },
      { top: '60%', left: '30%', size: '20%', opacity: 0.18 },
      { top: '60%', left: '70%', size: '20%', opacity: 0.18 },
    ],
  },
  {
    label: 'In use',
    layers: [
      { top: '40%', left: '40%', size: '50%', opacity: 0.2 },
      { top: '75%', left: '80%', size: '18%', opacity: 0.3 },
    ],
  },
  {
    label: 'Top',
    layers: [{ top: '50%', left: '50%', size: '70%', opacity: 0.16 }],
  },
  {
    label: 'Scale',
    layers: [
      { top: '30%', left: '30%', size: '22%', opacity: 0.28 },
      { top: '65%', left: '65%', size: '45%', opacity: 0.14 },
    ],
  },
];

@Component({
  selector: 'app-product-detail',
  imports: [FaIconComponent, DotLoader, Topbar, DatePipe],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export class ProductDetail {
  protected readonly icons = {
    angleLeft: faAngleLeft,
    award: faAward,
    barcode: faBarcode,
    boxOpen: faBoxOpen,
    calendar: faCalendarDays,
    cart: faCartShopping,
    folder: faFolderOpen,
    heartRegular: faHeartRegular,
    heartSolid: faHeartSolid,
    star: faStar,
    tag: faTag,
  };

  protected readonly views = PRODUCT_VIEWS;
  protected readonly activeView = signal(0);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly productService = inject(ProductService);
  private readonly cartService = inject(CartService);
  protected readonly authService = inject(AuthService);

  protected readonly product = signal<Product | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly isWishlisted = signal(false);
  protected readonly addedToCart = signal(false);
  protected readonly activeTab = signal<Tab>('details');

  protected readonly discountPercent = computed(() => {
    const product = this.product();
    if (!product?.originalPrice) return null;
    return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
  });

  protected readonly aboutBullets = computed(() => {
    const description = this.product()?.description;
    if (!description) return [];
    return description
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
  });

  protected readonly reviews = signal<Review[]>([]);
  protected readonly reviewsSummary = signal<ReviewsSummary | null>(null);
  protected readonly reviewsLoading = signal(false);
  protected readonly reviewsTotal = signal(0);
  protected readonly reviewsInitialized = signal(false);
  protected readonly hasMoreReviews = computed(() => this.reviews().length < this.reviewsTotal());

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isLoading.set(false);
      this.loadError.set(true);
      return;
    }

    this.productService.get(id).subscribe({
      next: (product) => {
        this.product.set(product);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.loadError.set(true);
      },
    });
  }

  protected readonly stars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (i < Math.round(rating) ? 'full' : 'empty'));

  protected setTab(tab: Tab): void {
    this.activeTab.set(tab);
    if (tab === 'reviews' && !this.reviewsInitialized()) {
      this.loadReviews(true);
    }
  }

  protected loadMoreReviews(): void {
    this.loadReviews(false);
  }

  protected breakdownRows(summary: ReviewsSummary): BreakdownRow[] {
    return [5, 4, 3, 2, 1].map((star) => {
      const count = summary.ratingBreakdown[star] ?? 0;
      const percent = summary.reviewCount > 0 ? Math.round((count / summary.reviewCount) * 100) : 0;
      return { star, count, percent };
    });
  }

  private loadReviews(reset: boolean): void {
    const product = this.product();
    if (!product) return;

    const offset = reset ? 0 : this.reviews().length;
    this.reviewsInitialized.set(true);
    this.reviewsLoading.set(true);

    this.productService.reviews(product.id, REVIEWS_PAGE_SIZE, offset).subscribe({
      next: (response) => {
        this.reviews.update((current) => (reset ? response.items : [...current, ...response.items]));
        this.reviewsTotal.set(response.total);
        this.reviewsSummary.set({
          averageRating: response.averageRating,
          reviewCount: response.reviewCount,
          ratingBreakdown: response.ratingBreakdown,
        });
        this.reviewsLoading.set(false);
      },
      error: () => this.reviewsLoading.set(false),
    });
  }

  protected goToView(index: number): void {
    this.activeView.set(index);
  }

  protected prevView(): void {
    this.activeView.update((i) => (i - 1 + this.views.length) % this.views.length);
  }

  protected nextView(): void {
    this.activeView.update((i) => (i + 1) % this.views.length);
  }

  protected goBack(): void {
    // navigationId > 1 means we got here via in-app navigation (e.g. from the
    // product list) — go back there. Otherwise (direct link, refresh) there's
    // no in-app page to return to, so land on the dashboard instead.
    const navigationId = (history.state as { navigationId?: number } | null)?.navigationId;
    if (navigationId && navigationId > 1) {
      this.location.back();
    } else {
      this.router.navigateByUrl('/dashboard');
    }
  }

  protected goToDashboardSearch(term: string): void {
    this.router.navigate(['/dashboard'], { queryParams: { search: term } });
  }

  protected addToCart(): void {
    if (!this.requireSignIn()) return;
    this.cartService.add();
    this.addedToCart.set(true);
  }

  protected toggleWishlist(): void {
    if (!this.requireSignIn()) return;
    this.isWishlisted.update((value) => !value);
  }

  private requireSignIn(): boolean {
    if (this.authService.isAuthenticated()) return true;
    this.router.navigateByUrl('/login');
    return false;
  }
}
