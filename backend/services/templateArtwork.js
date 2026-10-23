const { createHash } = require('node:crypto');
const escape = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const previewUrl = id => '/api/videos/studio/template-thumbnail/' + encodeURIComponent(id || 'scene');
// Established vector-card system: never use a source photograph or recognizable face.
function render(entry) {
  const text = [entry.label, entry.description, entry.imagePrompt, entry.prompt].join(' ');
  const hue = createHash('sha256').update(entry.templateId || text).digest()[0] % 60 + 320;
  let setting = '<path d="M40 520V220Q240 10 440 220V520" fill="none" stroke="#ab8772" stroke-width="12"/>';
  if (/stair|steps/i.test(text)) setting += Array.from({length:8},(_,i)=>`<path d="M${25+i*13} ${570-i*26}H455v20H${25+i*13}Z" fill="${i%2?'#695459':'#49383f'}"/>`).join('');
  if (/garden|floral|flower|bougain|palms|outdoor|forest/i.test(text)) setting += [45,435].map(x=>`<path d="M${x} 580V135" stroke="#64836b" stroke-width="8"/>`+Array.from({length:8},(_,i)=>`<ellipse cx="${x+(i%2?15:-15)}" cy="${160+i*48}" rx="28" ry="13" fill="#7e9475"/><circle cx="${x+20}" cy="${170+i*48}" r="9" fill="#c88a9f"/>`).join('')).join('');
  if (/mirror/i.test(text)) setting += '<ellipse cx="340" cy="260" rx="90" ry="160" fill="#566064" stroke="#d4b77a" stroke-width="8"/>';
  if (/window|lattice|suite|curtain/i.test(text)) setting += '<rect x="50" y="120" width="125" height="280" rx="55" fill="#c6a78b"/><path d="M112 120V400M50 235H175M50 320H175" stroke="#665354" stroke-width="8"/>';
  if (/chandelier|salon|lounge/i.test(text)) setting += '<path d="M240 35V110M150 125Q240 210 330 125M180 120Q240 170 300 120" stroke="#e4c58b" stroke-width="5" fill="none"/>';
  const figure = `<path d="M195 320Q240 295 285 320L340 560Q240 595 140 560Z" fill="hsl(${hue} 35% 42%)" stroke="#e4c58b" stroke-width="3"/><path d="M190 330Q170 195 240 190Q310 195 290 330" fill="hsl(${hue} 30% 29%)" stroke="#e4c58b" stroke-width="3"/><ellipse cx="240" cy="257" rx="27" ry="38" fill="#d6b39b"/><path d="M212 243Q240 210 268 243" fill="#382c32"/><path d="M213 302Q240 330 267 302M175 470Q240 490 305 470M155 530Q240 555 325 530" fill="none" stroke="#e4c58b" stroke-width="6"/><circle cx="240" cy="223" r="5" fill="#e4c58b"/>`;
  const groom = entry.subjectMode === 'couple' ? '<path d="M345 300Q400 290 420 330L435 560H330Z" fill="#baa58a" stroke="#e4c58b" stroke-width="3"/><ellipse cx="380" cy="258" rx="26" ry="37" fill="#b99178"/>' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 640"><rect width="480" height="640" fill="#30232d"/>${setting}${groom}${figure}<rect x="15" y="15" width="450" height="610" rx="30" fill="none" stroke="#e4c58b" stroke-width="2"/><rect x="35" y="40" width="410" height="52" rx="10" fill="#281c29"/><text x="240" y="73" text-anchor="middle" font-family="Georgia,serif" font-size="18" fill="#e4c58b">${escape((entry.label || 'Bridal scene').slice(0,43))}</text><text x="240" y="610" text-anchor="middle" font-family="sans-serif" font-size="11" letter-spacing="2" fill="#e4c58b">ILLUSTRATED SCENE · NOT A REAL PERSON</text></svg>`;
}
module.exports = { previewUrl, render };
