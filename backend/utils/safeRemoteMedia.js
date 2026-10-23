const dns = require('node:dns');
const https = require('node:https');
const net = require('node:net');
const axios = require('axios');
const blocked = new net.BlockList();
for (const [ip,bits] of [['0.0.0.0',8],['10.0.0.0',8],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.168.0.0',16],['100.64.0.0',10],['198.18.0.0',15],['224.0.0.0',4],['240.0.0.0',4]]) blocked.addSubnet(ip,bits,'ipv4');
for (const [ip,bits] of [['::',128],['::1',128],['fc00::',7],['fe80::',10],['ff00::',8],['2001:db8::',32]]) blocked.addSubnet(ip,bits,'ipv6');
function publicAddress(address) {
  if (address.toLowerCase().startsWith('::ffff:')) address = address.slice(7);
  const version = net.isIP(address);
  return Boolean(version) && !blocked.check(address, version === 4 ? 'ipv4' : 'ipv6');
}
function validateUrl(value) {
  const u = new URL(value);
  const host = u.hostname.replace(/^\[|\]$/g,'');
  if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443') || host === 'localhost' || (net.isIP(host) && !publicAddress(host))) throw new Error('Unsafe remote media URL.');
  return u;
}
const agent = new https.Agent({ lookup(hostname, options, callback) {
  dns.lookup(hostname, { all:true }, (error, addresses) => {
    if (error) return callback(error);
    if (!addresses.length || addresses.some(item => !publicAddress(item.address))) return callback(new Error('Private network media requests are forbidden.'));
    if (options?.all) return callback(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
} });
function get(url, options = {}) {
  validateUrl(url);
  return axios.get(url, { ...options, httpsAgent:agent, proxy:false, maxRedirects:3,
    beforeRedirect: opts => { if (opts.protocol !== 'https:') throw new Error('HTTPS media required.'); validateUrl('https://' + opts.hostname + (opts.port && Number(opts.port)!==443 ? ':'+opts.port : '') + opts.path); },
  });
}
module.exports = { get, validateUrl, publicAddress };
