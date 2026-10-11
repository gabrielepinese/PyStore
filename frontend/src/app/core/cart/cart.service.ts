import { Injectable, computed, signal } from '@angular/core';
import { Product } from '../models/product.model';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  originalPrice: number | null;
  accent: string;
  badge: string | null;
  qty: number;
}

const STORAGE_KEY = 'pystore.cart';

function readStoredItems(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

/** Client-side cart — no order/cart backend yet, so state lives in localStorage. */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly itemsSignal = signal<CartItem[]>(readStoredItems());
  readonly items = this.itemsSignal.asReadonly();

  readonly count = computed(() => this.itemsSignal().reduce((sum, item) => sum + item.qty, 0));
  readonly subtotal = computed(() =>
    this.itemsSignal().reduce((sum, item) => sum + item.price * item.qty, 0),
  );

  addItem(product: Product, qty = 1): void {
    this.itemsSignal.update((items) => {
      const existing = items.find((item) => item.productId === product.id);
      if (existing) {
        return items.map((item) =>
          item.productId === product.id ? { ...item, qty: item.qty + qty } : item,
        );
      }
      return [
        ...items,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          originalPrice: product.originalPrice,
          accent: product.accent,
          badge: product.badge,
          qty,
        },
      ];
    });
    this.persist();
  }

  updateQty(productId: string, qty: number): void {
    if (qty < 1) {
      this.removeItem(productId);
      return;
    }
    this.itemsSignal.update((items) =>
      items.map((item) => (item.productId === productId ? { ...item, qty } : item)),
    );
    this.persist();
  }

  removeItem(productId: string): void {
    this.itemsSignal.update((items) => items.filter((item) => item.productId !== productId));
    this.persist();
  }

  clear(): void {
    this.itemsSignal.set([]);
    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.itemsSignal()));
    } catch {
      // Storage unavailable (private mode / quota) — cart just won't survive a refresh.
    }
  }
}
