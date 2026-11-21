function sanitizeStripeKeys(text) {
  if (!text || typeof text !== 'string') return text;
  // Mask any apparent Stripe API keys in error messages
  // sk_live_..., sk_test_..., pk_live_..., pk_test_...
  return text.replace(/\b(?:sk|pk)_(?:live|test)[A-Za-z0-9_]+\b/g, (m) => m.slice(0, 8) + '********');
}

module.exports = function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error(err);
  const status = err.status || 500;
  const raw = err.message || 'Internal Server Error';
  const message = sanitizeStripeKeys(raw);
  res.status(status).json({ error: message });
};