// Vodacom Mozambique M-Pesa C2B USSD Push
// Docs: Vodacom OpenAPI (https://developer.vodacom.co.mz)
// Required env vars: MPESA_API_HOST, MPESA_API_KEY, MPESA_PUBLIC_KEY, MPESA_SERVICE_PROVIDER_CODE

import crypto from 'crypto';
import { gateBrowserRequest } from './_security.js';
import { adminDb } from './_firebaseAdmin.js';

async function getMpesaSessionKey(): Promise<string> {
  const apiKey = process.env.MPESA_API_KEY!;
  const publicKeyPem = process.env.MPESA_PUBLIC_KEY!;
  const host = process.env.MPESA_API_HOST!;

  // Vodacom API: encrypt the apiKey with the provided RSA public key
  const pemFormatted = publicKeyPem.includes('BEGIN PUBLIC KEY')
    ? publicKeyPem
    : `-----BEGIN PUBLIC KEY-----\n${publicKeyPem}\n-----END PUBLIC KEY-----`;

  const encrypted = crypto.publicEncrypt(
    { key: pemFormatted, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(apiKey)
  ).toString('base64');

  const res = await fetch(`${host}/api/v1/getbearertoken`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${encrypted}`,
      Origin: '*',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MPesa auth failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  // The output_SessionKey is the session key (bearer token) for subsequent calls
  return data.output_SessionKey as string;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  // Block off-origin browser callers and apply per-IP rate limit (10/min)
  if (!(await gateBrowserRequest(req, res, { rateLimit: 10, windowMs: 60_000 }))) return;

  const orderId = String(req.body?.orderId || '');
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(orderId)) {
    return res.status(400).json({ error: 'Invalid orderId.' });
  }

  // Amount + payer phone come from the SERVER-STORED order, never the client —
  // this is what stops a tampered client from underpaying.
  let numAmount: number;
  let phone: string;
  try {
    const snap = await adminDb().collection('checkouts').doc(orderId).get();
    if (!snap.exists) return res.status(404).json({ error: 'Encomenda não encontrada.' });
    const order = snap.data() as any;
    numAmount = Number(order.total);
    phone = String(order.customerPhone || req.body?.phone || '');
  } catch (e: any) {
    console.error('mpesa-push order read failed:', e?.message);
    return res.status(500).json({ error: 'Erro ao ler a encomenda.' });
  }
  if (!Number.isFinite(numAmount) || numAmount <= 0 || numAmount > 5_000_000) {
    return res.status(400).json({ error: 'Invalid order amount.' });
  }
  if (!/^\d{9,15}$/.test(phone.replace(/\D/g, ''))) {
    return res.status(400).json({ error: 'Invalid phone number.' });
  }

  const host = process.env.MPESA_API_HOST;
  const serviceProviderCode = process.env.MPESA_SERVICE_PROVIDER_CODE;

  if (!host || !serviceProviderCode) {
    return res.status(503).json({ error: 'MPesa not configured. Add env vars to Vercel.' });
  }

  try {
    const sessionKey = await getMpesaSessionKey();

    // Normalise phone: strip country code prefix if present, ensure 258XXXXXXXXX format
    const cleanPhone = phone.replace(/\D/g, '');
    const msisdn = cleanPhone.startsWith('258') ? cleanPhone : `258${cleanPhone}`;

    const payload = {
      input_Amount: String(numAmount),
      input_Country: 'MOZ',
      input_Currency: 'MZN',
      input_CustomerMSISDN: msisdn,
      input_ServiceProviderCode: serviceProviderCode,
      input_ThirdPartyConversationID: `HWS-${orderId}-${Date.now()}`,
      input_TransactionReference: orderId,
      input_PurchasedItemsDesc: 'Hardware Sale — Pagamento de Encomenda',
    };

    const payRes = await fetch(`${host}/ipg/v1/c2bPayment/singleStage/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionKey}`,
        'Content-Type': 'application/json',
        Origin: '*',
      },
      body: JSON.stringify(payload),
    });

    const data = await payRes.json();

    if (data.output_ResponseCode === 'INS-0') {
      // Success: USSD push sent to customer
      return res.status(200).json({
        success: true,
        transactionReference: data.output_TransactionID || data.output_ConversationID,
        message: 'USSD push enviado. Aguarda confirmação do cliente.',
      });
    }

    // MPesa error codes: INS-1 internal error, INS-2 invalid key, etc.
    return res.status(400).json({
      success: false,
      code: data.output_ResponseCode,
      message: data.output_ResponseDesc || 'Falha ao enviar notificação MPesa.',
    });

  } catch (err: any) {
    console.error('MPesa push error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
