export function testingDetailsEnabled() {
  try {
    const saved = localStorage.getItem('lp_office_testing_details');
    return saved === 'on' || (saved !== 'off' && !import.meta.env?.PROD);
  } catch { return false; }
}
export function qualityLabel(value) {
  if (testingDetailsEnabled()) return String(value || '').toUpperCase().replace('P','p').replace('K','K');
  return ({ '480p': 'Normal quality', '720p': 'High quality', '1080p': 'Highest quality', '1k': 'Normal quality', '2k': 'High quality', '4k': 'Highest quality' })[String(value || '').toLowerCase()] || 'Standard quality';
}

export function modelLabel(id) {
  if (testingDetailsEnabled()) return ({grok_video_v15:'Grok Imagine 1.5',wan3_0_prime:'Wan 3.0 Prime',seedance_2_5:'Seedance 2.5 Edit',hf_mult_motion_control:'Genjutsu',hf_mult_motion_control_flash:'Genjutsu Lite',gpt_image_2:'GPT Image 2'})[id] || id;
  return id === 'seedance_2_5' ? 'Reference Edit' : 'Creative Film';
}

export function clientText(value) {
  if (testingDetailsEnabled()) return String(value || '');
  return String(value || '')
    .replace(/(?:grok(?:_video_v15|\s+imagine)?(?:\s+1\.5)?|wan(?:3_0_prime|\s+3\.0\s+prime)|seedance(?:_2_5|\s+2\.5(?:\s+edit)?)|GPT\s+Image\s+2|ChatGPT|Genjutsu|Higgsfield(?:\s+MCP)?|Google\s+Flow)/gi, 'creation service')
    .replace(/\b(?:480p|720p|1080p)\b/gi, qualityLabel);
}
