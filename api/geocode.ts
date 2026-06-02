import { gateBrowserRequest } from './_security';

export default async function handler(req: any, res: any) {
  if (!(await gateBrowserRequest(req, res, { rateLimit: 60, windowMs: 60_000 }))) return;

  const { place_id } = req.query;
  if (!place_id || typeof place_id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(place_id)) {
    return res.status(400).json({ error: 'place_id is required and must be valid' });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'GOOGLE_MAPS_API_KEY env var is not set' });
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(place_id)}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data);
  } catch {
    res.status(500).json({ error: 'Failed to fetch geocode' });
  }
}
