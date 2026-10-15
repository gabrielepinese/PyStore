import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faAngleLeft, faCheck, faLocationDot } from '@fortawesome/free-solid-svg-icons';
import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Stripe, StripeElements, loadStripe } from '@stripe/stripe-js';
import { environment } from '../../../environments/environment';
import { AccountService } from '../../core/account/account.service';
import { CartService } from '../../core/cart/cart.service';
import { Address } from '../../core/models/address.model';
import { Order } from '../../core/models/order.model';
import { OrderService } from '../../core/orders/order.service';
import { DotLoader } from '../../shared/components/dot-loader/dot-loader';
import { Topbar } from '../../shared/components/topbar/topbar';
import { ToastService } from '../../shared/services/toast.service';

type Stage = 'address' | 'payment' | 'success';

@Component({
  selector: 'app-checkout',
  imports: [FaIconComponent, RouterLink, Topbar, DotLoader, TranslocoPipe],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout {
  protected readonly icons = {
    angleLeft: faAngleLeft,
    check: faCheck,
    location: faLocationDot,
  };

  protected readonly cartService = inject(CartService);
  private readonly accountService = inject(AccountService);
  private readonly orderService = inject(OrderService);
  private readonly toastService = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);

  protected readonly stage = signal<Stage>('address');
  protected readonly addresses = signal<Address[]>([]);
  protected readonly addressesLoading = signal(true);
  protected readonly selectedAddressId = signal<string | null>(null);
  protected readonly placingOrder = signal(false);
  protected readonly paying = signal(false);
  protected readonly paymentError = signal<string | null>(null);
  protected readonly completedOrder = signal<Order | null>(null);
  protected readonly stripeConfigured = !!environment.stripePublishableKey;

  protected readonly cartItems = this.cartService.items();
  protected readonly cartSubtotal = this.cartService.subtotal();

  private readonly paymentElementRef = viewChild<ElementRef<HTMLElement>>('paymentElement');

  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private clientSecret: string | null = null;
  private order: Order | null = null;

  constructor() {
    if (this.cartService.count() === 0) {
      this.router.navigateByUrl('/cart');
      return;
    }

    this.accountService.listAddresses().subscribe({
      next: (addresses) => {
        this.addresses.set(addresses);
        const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];
        if (defaultAddress) this.selectedAddressId.set(defaultAddress.id);
        this.addressesLoading.set(false);
      },
      error: () => this.addressesLoading.set(false),
    });

    if (this.stripeConfigured) {
      loadStripe(environment.stripePublishableKey).then((stripe) => {
        this.stripe = stripe;
      });
    }

    effect(() => {
      const el = this.paymentElementRef();
      if (el && this.stripe && this.clientSecret && !this.elements) {
        this.elements = this.stripe.elements({ clientSecret: this.clientSecret });
        this.elements.create('payment').mount(el.nativeElement);
      }
    });
  }

  protected selectAddress(id: string): void {
    this.selectedAddressId.set(id);
  }

  protected continueToPayment(): void {
    const address = this.addresses().find((a) => a.id === this.selectedAddressId());
    if (!address) return;

    this.placingOrder.set(true);
    this.orderService
      .create({
        items: this.cartItems.map((item) => ({ productId: item.productId, qty: item.qty })),
        shippingAddress: {
          fullName: address.fullName,
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          postalCode: address.postalCode,
          country: address.country,
          phone: address.phone,
        },
      })
      .subscribe({
        next: ({ order, clientSecret }) => {
          this.order = order;
          this.clientSecret = clientSecret;
          this.placingOrder.set(false);
          this.stage.set('payment');
        },
        error: () => {
          this.placingOrder.set(false);
          this.toastService.show(this.transloco.translate('toast.checkoutOrderFailed'), 'error');
        },
      });
  }

  protected async pay(): Promise<void> {
    if (!this.stripe || !this.elements || !this.order) return;

    this.paying.set(true);
    this.paymentError.set(null);

    const { error, paymentIntent } = await this.stripe.confirmPayment({
      elements: this.elements,
      redirect: 'if_required',
      confirmParams: { return_url: `${window.location.origin}/checkout` },
    });

    if (error || paymentIntent?.status !== 'succeeded') {
      this.paying.set(false);
      this.paymentError.set(
        error?.message ?? this.transloco.translate('checkout.paymentGenericError'),
      );
      return;
    }

    this.orderService.confirm(this.order.id).subscribe({
      next: (confirmedOrder) => {
        this.paying.set(false);
        this.completedOrder.set(confirmedOrder);
        this.cartService.clear();
        this.stage.set('success');
      },
      error: () => {
        this.paying.set(false);
        this.toastService.show(this.transloco.translate('toast.checkoutConfirmFailed'), 'error');
      },
    });
  }

  protected backToCart(): void {
    this.router.navigateByUrl('/cart');
  }

  protected goToDashboard(): void {
    this.router.navigateByUrl('/dashboard');
  }
}
