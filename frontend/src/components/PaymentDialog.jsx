import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import toast from 'react-hot-toast';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = loadStripe(publishableKey);

function MixedPaymentForm({ clientSecret, onSuccess, registrationId }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    try {
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) }
      });
      if (result.error) {
        toast.error(result.error.message || 'Payment failed');
      } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
        // Immediately mark registration as PAID (manual finalize) instead of waiting for webhook.
        try {
          await api.post('/payments/manual-finalize', { registrationId });
        } catch (e) {
          // Non-fatal; proceed even if finalize fails (will remain processing otherwise)
          console.warn('manual-finalize failed', e?.response?.data || e.message);
        }
        toast.success('Payment successful');
        onSuccess();
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CardElement className="p-3 border rounded bg-white" />
      <button disabled={loading || !stripe} className="px-4 py-2 rounded bg-blue-600 text-white w-full">
        {loading ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
}

export function PaymentDialog({ registrationId, price, walletBalance, onClose, onPaid }) {
  const [walletAmount, setWalletAmount] = useState(0);
  const [mode, setMode] = useState('SELECT'); // SELECT | MIXED
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(false);
  const stripeEnabled = typeof publishableKey === 'string' && publishableKey.startsWith('pk_');

  useEffect(() => {
    if (walletBalance >= price) setWalletAmount(price);
    else setWalletAmount(walletBalance);
  }, [walletBalance, price]);

  const payWalletOnly = async () => {
    setLoading(true);
    try {
      await api.post('/payments/wallet', { registrationId });
      toast.success('Paid with wallet');
      onPaid && onPaid();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Wallet payment failed');
    } finally {
      setLoading(false);
    }
  };

  const initMixed = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/payments/mixed-intent', { registrationId, walletAmount });
      if (data.paid) {
        toast.success('Payment completed');
        onPaid && onPaid();
      } else {
        setClientSecret(data.clientSecret);
        setMode('MIXED');
      }
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  const remaining = Math.max(price - walletAmount, 0);
  const canWalletOnly = walletBalance >= price;

  // Lock body scroll while dialog mounted
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const dialog = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 text-white p-6 rounded-lg w-full max-w-md space-y-4 shadow-xl">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Pay Registration</h2>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-200">✕</button>
        </div>
        {mode === 'SELECT' && (
          <div className="space-y-4">
            <div className="text-sm space-y-1">
              <p><strong>Price:</strong> ${price.toFixed(2)}</p>
              <p><strong>Your Wallet:</strong> ${walletBalance.toFixed(2)}</p>
            </div>
            <div className="space-y-3">
              {canWalletOnly && (
                <button disabled={loading} onClick={payWalletOnly} className="w-full bg-emerald-600 hover:bg-emerald-500 transition px-4 py-2 rounded">
                  {loading ? 'Processing...' : 'Pay Full Amount With Wallet'}
                </button>
              )}
              <div>
                <label className="block text-sm mb-1">Wallet Contribution</label>
                <input
                  type="number"
                  min={0}
                  max={walletBalance}
                  step={0.01}
                  value={walletAmount}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val >= 0 && val <= walletBalance) {
                      setWalletAmount(val);
                    }
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-400 mt-1">Max available: ${walletBalance.toFixed(2)}</p>
              </div>
              {remaining > 0 && <p className="text-xs text-gray-300">Remaining to pay by card: ${remaining.toFixed(2)}</p>}
              {remaining > 0 && stripeEnabled ? (
                <button disabled={loading} onClick={initMixed} className="w-full bg-blue-600 hover:bg-blue-500 transition px-4 py-2 rounded">
                  {loading ? 'Preparing...' : 'Pay Remaining With Card'}
                </button>
              ) : remaining > 0 && !stripeEnabled ? (
                <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded">
                  Card payments are currently unavailable (Stripe not configured).<br />
                  Please top up your wallet or contact support.
                </div>
              ) : remaining === 0 && walletAmount > 0 && (
                <button disabled={loading} onClick={payWalletOnly} className="w-full bg-emerald-600 hover:bg-emerald-500 transition px-4 py-2 rounded">
                  {loading ? 'Processing...' : 'Pay With Wallet'}
                </button>
              )}
            </div>
          </div>
        )}
        {mode === 'MIXED' && clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <MixedPaymentForm registrationId={registrationId} clientSecret={clientSecret} onSuccess={() => { onPaid && onPaid(); }} />
          </Elements>
        )}
        {!stripeEnabled && !canWalletOnly && mode === 'SELECT' && (
          <div className="text-xs text-yellow-400">You do not have enough wallet balance and card payment is disabled.</div>
        )}
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}

export default PaymentDialog;