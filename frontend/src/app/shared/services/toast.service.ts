import { Injectable, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  description: string;
  type: ToastType;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly transloco = inject(TranslocoService);

  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  private nextId = 0;

  show(message: string, type: ToastType = 'success', duration = 3000, description?: string): void {
    const id = this.nextId++;
    this._toasts.update((list) => [
      ...list,
      {
        id,
        message,
        description: description ?? this.transloco.translate(`toast.defaultDescription.${type}`),
        type,
        duration,
      },
    ]);
    setTimeout(() => this.dismiss(id), duration);
  }

  dismiss(id: number): void {
    this._toasts.update((list) => list.filter((toast) => toast.id !== id));
  }
}
