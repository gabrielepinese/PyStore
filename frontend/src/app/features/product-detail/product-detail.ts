import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faAngleLeft,
  faCartShopping,
  faHeart as faHeartSolid,
  faStar,
} from '@fortawesome/free-solid-svg-icons';
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { CartService } from '../../core/cart/cart.service';
import { Product } from '../../core/models/product.model';
import { ProductService } from '../../core/products/product.service';
import { DotLoader } from '../../shared/components/dot-loader/dot-loader';
import { Topbar } from '../../shared/components/topbar/topbar';

type Tab = 'details' | 'shipping';

@Component({
  selector: 'app-product-detail',
  imports: [RouterLink, FaIconComponent, DotLoader, Topbar],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export class ProductDetail {
  protected readonly icons = {
    angleLeft: faAngleLeft,
    cart: faCartShopping,
    heartRegular: faHeartRegular,
    heartSolid: faHeartSolid,
    star: faStar,
  };

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
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
