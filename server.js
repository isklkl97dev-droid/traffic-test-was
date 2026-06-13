'use strict'

const path = require('path')
const express = require('express')

const app = express()
const port = Number(process.env.APP_PORT || process.env.PORT || 80)
const host = '0.0.0.0'

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

// k6 부하 테스트용: ?bytes=1048576 → 약 1MB 응답
app.get('/api/traffic', (req, res) => {
  const maxBytes = 5 * 1024 * 1024
  const requested = Number.parseInt(String(req.query.bytes || '65536'), 10)
  const size = Number.isFinite(requested)
    ? Math.min(Math.max(requested, 1024), maxBytes)
    : 65536

  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Traffic-Bytes', String(size))
  res.send(Buffer.alloc(size, 'x'))
})

app.use(express.static(path.join(__dirname, 'wwwroot')))

app.listen(port, host, () => {
  console.log(`traffic-test-was listening on http://${host}:${port}`)
})
