import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  description: string;
  type: ToastType;
  duration: number;
}

const DEFAULT_DESCRIPTIONS: Record<ToastType, string> = {
  success: 'Continua a navigare.',
  error: 'Riprova o contattaci se il problema persiste.',
  info: 'Continua a navigare.',
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  private nextId = 0;

  show(message: string, type: ToastType = 'success', duration = 3000, description?: string): void {
    const id = this.nextId++;
    this._toasts.update((list) => [
      ...list,
      { id, message, description: description ?? DEFAULT_DESCRIPTIONS[type], type, duration },
    ]);
    setTimeout(() => this.dismiss(id), duration);
  }

  dismiss(id: number): void {
    this._toasts.update((list) => list.filter((toast) => toast.id !== id));
  }
}
