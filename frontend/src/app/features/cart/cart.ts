import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faAngleLeft,
  faCartShopping,
  faMinus,
  faPlus,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CartService } from '../../core/cart/cart.service';
import { Topbar } from '../../shared/components/topbar/topbar';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-cart',
  imports: [FaIconComponent, RouterLink, Topbar, TranslocoPipe],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart {
  protected readonly icons = {
    angleLeft: faAngleLeft,
    cart: faCartShopping,
    minus: faMinus,
    plus: faPlus,
    trash: faTrash,
  };

  protected readonly cartService = inject(CartService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly toastService = inject(ToastService);

  protected goBack(): void {
    this.router.navigateByUrl('/dashboard');
  }

  protected increase(productId: string): void {
    const item = this.cartService.items().find((it) => it.productId === productId);
    if (item) this.cartService.updateQty(productId, item.qty + 1);
  }

  protected decrease(productId: string): void {
    const item = this.cartService.items().find((it) => it.productId === productId);
    if (item) this.cartService.updateQty(productId, item.qty - 1);
  }

  protected remove(productId: string): void {
    this.cartService.removeItem(productId);
    this.toastService.show(this.transloco.translate('toast.cartItemRemoved'), 'info');
  }

  protected checkout(): void {
    this.router.navigateByUrl('/checkout');
  }
}
