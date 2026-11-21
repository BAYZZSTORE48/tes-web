// AM Verif Web - server tanpa dependensi (Node 18+). Jalan di Pterodactyl: port diambil dari SERVER_PORT.
const http = require('http'), fs = require('fs'), path = require('path')

const PORT = Number(process.env.SERVER_PORT || process.env.PORT || 3000)
const BASE = 'https://am-premiumms.ai.studio'
const HEADERS = {
  'Content-Type': 'application/json', Accept: 'application/json', Origin: BASE, Referer: `${BASE}/`,
  'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
}
const PUB = path.join(__dirname, 'public')
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' }

// Batas 8 permintaan / menit / IP
const hits = new Map()
const limited = (ip) => {
  const now = Date.now(), arr = (hits.get(ip) || []).filter(t => now - t < 60000)
  arr.push(now); hits.set(ip, arr); return arr.length > 8
}
setInterval(() => { for (const [k, v] of hits) if (!v.some(t => Date.now() - t < 60000)) hits.delete(k) }, 60000).unref()

async function upstream(endpoint, payload) {
  const r = await fetch(BASE + endpoint, { method: 'POST', headers: HEADERS, body: JSON.stringify(payload), signal: AbortSignal.timeout(30000) })
  const raw = await r.text()
  let d
  try { d = JSON.parse(raw) } catch { throw new Error(`Respons server tidak valid (HTTP ${r.status})`) }
  if (!r.ok || !d.success) throw new Error(d.message || `Request gagal (${d.code || r.status})`)
  return d
}

const json = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)) }
const readBody = (req) => new Promise((resolve, reject) => {
  let s = ''
  req.on('data', c => { s += c; if (s.length > 8192) { reject(new Error('Data terlalu besar')); req.destroy() } })
  req.on('end', () => { try { resolve(JSON.parse(s || '{}')) } catch { reject(new Error('Format data salah')) } })
})
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  const url = (req.url || '/').split('?')[0]

  if (req.method === 'POST' && (url === '/api/send' || url === '/api/verify')) {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress
    if (limited(ip)) return json(res, 429, { ok: false, message: 'Terlalu banyak percobaan. Tunggu satu menit lalu coba lagi.' })
    try {
      const { email = '', link = '' } = await readBody(req)
      const mail = String(email).trim()
      if (!EMAIL.test(mail) || mail.length > 120) return json(res, 400, { ok: false, message: 'Format email tidak valid.' })
      if (url === '/api/send') {
        const d = await upstream('/api/send-link', { email: mail })
        return json(res, 200, { ok: true, message: d.message || 'Link verifikasi sudah dikirim. Cek inbox atau folder spam.' })
      }
      const magic = String(link).trim()
      if (!/^https?:\/\//i.test(magic) || magic.length > 2000) return json(res, 400, { ok: false, message: 'Tempel link verifikasi lengkap dari email (diawali https://).' })
      const d = await upstream('/api/verify-link', { email: mail, magicLink: magic })
      return json(res, 200, { ok: true, message: d.message || 'Verifikasi berhasil.' })
    } catch (e) {
      return json(res, 400, { ok: false, message: e.message || 'Terjadi kesalahan.' })
    }
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { ok: false, message: 'Method tidak diizinkan' })
  let file
  try { file = path.normalize(path.join(PUB, decodeURIComponent(url === '/' ? '/index.html' : url))) } catch { file = '' }
  if (!file.startsWith(PUB)) { res.writeHead(403); return res.end('Forbidden') }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Tidak ditemukan') }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' })
    res.end(req.method === 'HEAD' ? undefined : data)
  })
}).listen(PORT, '0.0.0.0', () => console.log(`AM Verif Web aktif di port ${PORT}`))
