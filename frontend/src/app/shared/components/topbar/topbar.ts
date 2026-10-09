import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCartShopping, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { Component, inject, input, output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../core/auth/auth.service';
import { CartService } from '../../../core/cart/cart.service';
import { LANG_STORAGE_KEY } from '../../../core/i18n/lang.constants';

@Component({
  selector: 'app-topbar',
  imports: [RouterLink, FaIconComponent, TranslocoPipe],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar {
  protected readonly icons = {
    cart: faCartShopping,
    search: faMagnifyingGlass,
  };

  protected readonly authService = inject(AuthService);
  protected readonly cartService = inject(CartService);
  protected readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);

  protected setLang(lang: string): void {
    this.transloco.setActiveLang(lang);
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  }

  /** Lets the host page control the input (e.g. the dashboard's live filter); defaults to empty. */
  readonly searchValue = input('');
  readonly searchValueChange = output<string>();
  /** Fired on Enter — pages without their own search results use this to jump to the catalog. */
  readonly searchSubmit = output<string>();
  readonly brandClick = output<void>();

  protected onSearchInput(value: string): void {
    this.searchValueChange.emit(value);
  }

  protected onSearchSubmit(value: string): void {
    this.searchSubmit.emit(value);
  }

  protected onBrandClick(): void {
    this.brandClick.emit();
  }

  protected openCart(): void {
    // No cart page yet — for guests the icon is just another sign-in entry point.
    if (!this.authService.isAuthenticated()) {
      this.router.navigateByUrl('/login');
    }
  }
}
