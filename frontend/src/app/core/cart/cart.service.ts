import { Injectable, signal } from '@angular/core';

/** In-memory cart count shared across routes — no backend cart yet. */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly countSignal = signal(0);
  readonly count = this.countSignal.asReadonly();

  add(): void {
    this.countSignal.update((value) => value + 1);
  }
}
