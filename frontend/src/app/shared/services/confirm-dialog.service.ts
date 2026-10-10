import { Injectable, signal } from '@angular/core';

export type ConfirmDialogTone = 'default' | 'danger';

export interface ConfirmDialogOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmDialogTone;
}

interface PendingConfirm extends ConfirmDialogOptions {
  resolve: (confirmed: boolean) => void;
}

/**
 * One pending confirmation at a time, resolved via a promise so call sites
 * read as `if (await confirm(...)) { ... }` instead of juggling callbacks.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly _request = signal<PendingConfirm | null>(null);
  readonly request = this._request.asReadonly();

  confirm(options: ConfirmDialogOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this._request.set({ ...options, resolve });
    });
  }

  respond(confirmed: boolean): void {
    const current = this._request();
    if (!current) {
      return;
    }
    this._request.set(null);
    current.resolve(confirmed);
  }
}
