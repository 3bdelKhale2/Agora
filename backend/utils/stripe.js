const stripeLib = require('stripe');

let stripeInstance = null;

function getStripe() {
  if (stripeInstance) return stripeInstance;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (/^pk_/.test(key)) {
    const err = new Error('Invalid Stripe secret key configured. Expected a key starting with sk_...');
    err.status = 500;
    throw err;
  }
  stripeInstance = stripeLib(key);
  return stripeInstance;
}

module.exports = { getStripe };