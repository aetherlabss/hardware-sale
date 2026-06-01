import { gateBrowserRequest } from './_security';

export default async function handler(req: any, res: any) {
  if (!gateBrowserRequest(req, res, { rateLimit: 60, windowMs: 60_000 })) return;

  const { input } = req.query;
  if (!input || typeof input !== 'string' || input.length < 2 || input.length > 100) {
    return res.status(400).json({ error: 'Input is required and must be 2–100 chars' });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'GOOGLE_MAPS_API_KEY env var is not set' });
  }

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:mz&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error('Error fetching places:', err);
    res.status(500).json({ error: 'Failed to fetch places' });
  }
}
