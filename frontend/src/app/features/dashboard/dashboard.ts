import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

/**
 * Stand-in protected page: proves the guard + interceptor chain works end to
 * end. Real product features (catalog, cart, orders...) will live behind
 * this same authGuard once their microservices exist.
 */
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  protected readonly authService = inject(AuthService);
}
