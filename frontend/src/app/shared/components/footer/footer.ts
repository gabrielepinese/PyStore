import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ProductService } from '../../../core/products/product.service';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  protected readonly authService = inject(AuthService);
  private readonly productService = inject(ProductService);

  protected readonly categories = signal<string[]>([]);
  protected readonly year = new Date().getFullYear();

  constructor() {
    this.productService.categories().subscribe({
      next: (names) => this.categories.set(names.slice(0, 5)),
      error: () => {
        /* footer links just skip categories if the list fails to load */
      },
    });
  }
}
