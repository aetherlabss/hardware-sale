// Tmcel e-Mola Payment API — Mozambique
// Register at: https://emola.co.mz/business
// Required env vars: EMOLA_API_URL, EMOLA_API_TOKEN, EMOLA_MERCHANT_CODE

import { gateBrowserRequest } from './_security';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!gateBrowserRequest(req, res, { rateLimit: 10, windowMs: 60_000 })) return;

  const { phone, amount, reference, orderId } = req.body;
  if (!phone || !amount || !orderId) {
    return res.status(400).json({ error: 'phone, amount and orderId are required' });
  }

  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0 || numAmount > 5_000_000) {
    return res.status(400).json({ error: 'Invalid amount.' });
  }
  if (!/^\d{9,15}$/.test(String(phone).replace(/\D/g, ''))) {
    return res.status(400).json({ error: 'Invalid phone number.' });
  }
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(String(orderId))) {
    return res.status(400).json({ error: 'Invalid orderId.' });
  }

  const apiUrl = process.env.EMOLA_API_URL;
  const apiToken = process.env.EMOLA_API_TOKEN;
  const merchantCode = process.env.EMOLA_MERCHANT_CODE;

  if (!apiUrl || !apiToken || !merchantCode) {
    return res.status(503).json({ error: 'e-Mola not configured. Add env vars to Vercel.' });
  }

  try {
    const cleanPhone = phone.replace(/\D/g, '');
    const msisdn = cleanPhone.startsWith('258') ? cleanPhone : `258${cleanPhone}`;

    // e-Mola standard payment initiation payload
    const payload = {
      amount: String(amount),
      msisdn: msisdn,
      reference: reference || orderId,
      merchant: merchantCode,
      transaction_id: `HWS-${orderId}-${Date.now()}`,
      description: 'Hardware Sale — Pagamento de Encomenda',
      callback_url: `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''}/api/payment-callback`,
    };

    const payRes = await fetch(`${apiUrl}/payment/initiate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await payRes.json();

    if (payRes.ok && (data.status === 'success' || data.code === '200' || data.transaction_id)) {
      return res.status(200).json({
        success: true,
        transactionReference: data.transaction_id || data.reference,
        message: 'Pedido e-Mola enviado. Aguarda confirmação do cliente.',
      });
    }

    return res.status(400).json({
      success: false,
      code: data.code,
      message: data.message || 'Falha ao iniciar pagamento e-Mola.',
    });

  } catch (err: any) {
    console.error('e-Mola push error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
