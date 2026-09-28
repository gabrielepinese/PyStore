import { Component, input } from '@angular/core';

/** Placeholder shaped like a product card; the info rows are bars that pulse slowly. */
@Component({
  selector: 'app-product-card-skeleton',
  templateUrl: './product-card-skeleton.html',
  styleUrl: './product-card-skeleton.scss',
  host: { '[style.--skeleton-delay]': 'delay()' },
})
export class ProductCardSkeleton {
  /** Position in the grid; offsets the pulse so cards ripple instead of blinking in unison. */
  readonly index = input(0);

  protected delay(): string {
    return `${(this.index() % 8) * 90}ms`;
  }
}
