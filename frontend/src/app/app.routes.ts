import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
    canActivate: [guestGuard],
  },
  // Public: anyone can browse; cart / wishlist actions check auth themselves.
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'products/:id',
    loadComponent: () =>
      import('./features/product-detail/product-detail').then((m) => m.ProductDetail),
  },
  {
    path: 'account',
    loadComponent: () => import('./features/account/account').then((m) => m.Account),
    canActivate: [authGuard],
  },
  {
    path: 'cart',
    loadComponent: () => import('./features/cart/cart').then((m) => m.Cart),
    canActivate: [authGuard],
  },
  {
    path: 'checkout',
    loadComponent: () => import('./features/checkout/checkout').then((m) => m.Checkout),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'dashboard' },
];
