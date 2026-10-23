import axios from 'axios';

export default async function handler(req, res) {
  const { id } = req.query;
  const allowed = new Set(['1eF-lRp7i1bfLAUXSus89I_AkwUEUifD1','1pgD5n8c-WMb1ujBrTsanncQaTPzY8Ifk','1L582RHeSPVYg13LrGS149e-rpU5LvAEk','1dOInq0yUq9TOnny82NWNztNwVuy6KOrW','14pV_NRMlsjBB_QSG32QUGSeTd9iv4Td-','17engzF5_ScEQuvNWi5lApGletLONR19t']);
  if (!['GET','HEAD'].includes(req.method) || typeof id !== 'string' || !allowed.has(id)) return res.status(404).end();
  if (!id) {
    return res.status(400).send('Missing file id');
  }

  // Google Drive download URL
  const driveUrl = `https://drive.usercontent.google.com/download?id=${id}&export=download`;

  // Set CORS headers
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const headers = {};
  if (req.headers.range) {
    headers['range'] = req.headers.range;
  }

  try {
    const response = await axios({
      method: 'get',
      url: driveUrl,
      headers: headers,
      responseType: 'stream',
      timeout: 15000,
      maxRedirects: 0,
      validateStatus: () => true, // Don't fail on range response statuses (206)
    });

    res.status(response.status);

    // Forward headers from Google Drive
    const forwardHeaders = [
      'content-range',
      'accept-ranges',
      'content-length',
      'content-type',
    ];

    forwardHeaders.forEach((header) => {
      const value = response.headers[header];
      if (value) {
        res.setHeader(header, value);
      }
    });

    response.data.pipe(res);
    req.on('close', () => response.data.destroy());
  } catch (error) {
    console.error('Error proxying Google Drive video:', error);
    res.status(500).send('Error fetching video');
  }
}
