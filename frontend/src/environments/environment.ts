export const environment = {
  production: true,
  apiUrl: 'https://api.example.com',
  productsApiUrl: 'https://api.example.com/products',
  ordersApiUrl: 'https://api.example.com/orders',
  // Publishable keys are meant to ship in client bundles — safe to commit,
  // unlike the secret key (which only ever lives server-side, see
  // backend/services/orders-service). Test-mode only (pk_test_...).
  stripePublishableKey: '',
};
