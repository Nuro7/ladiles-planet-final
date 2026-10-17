import axios from 'axios';

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) {
    return res.status(400).send('Missing file id');
  }

  // Google Drive download URL
  const driveUrl = `https://drive.usercontent.google.com/download?id=${id}&export=download`;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
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
  } catch (error) {
    console.error('Error proxying Google Drive video:', error);
    res.status(500).send('Error fetching video');
  }
}
