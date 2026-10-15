export const environment = {
  production: false,
  // API gateway is not scaffolded yet; point straight at each microservice.
  apiUrl: 'http://localhost:8001/api/v1',
  productsApiUrl: 'http://localhost:8002/api/v1',
  ordersApiUrl: 'http://localhost:8003/api/v1',
  // Your own Stripe test-mode publishable key (pk_test_...) — create a free
  // account at https://dashboard.stripe.com/register, grab it from
  // https://dashboard.stripe.com/test/apikeys. Checkout won't work without
  // one (Stripe Elements needs it to mount), and orders-service needs the
  // matching sk_test_ secret key set as STRIPE_SECRET_KEY.
  stripePublishableKey: 'pk_test_51UPMGlGeUvr6InPrHlC5wZaHR1yOceszodurghsCBF9zDL5wHdYpn6JJUeWE7l87gCUqMX4qeQ8CWOqi3HyI9TLK0060nv2x0w',
};
