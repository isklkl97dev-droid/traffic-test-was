import http from 'k6/http'
import { sleep } from 'k6'

const BASE_URL = __ENV.BASE_URL || 'https://6e77uxt2.awen.3vi.co.kr'
const TRAFFIC_PATH = __ENV.TRAFFIC_PATH || '/api/traffic?bytes=1048576'
const RATE = Number(__ENV.RATE || 5)
const DURATION = __ENV.DURATION || '10m'
const TARGET_URL = `${BASE_URL.replace(/\/$/, '')}${TRAFFIC_PATH}`

// 목표: 초당 5요청 × 10분 ≈ 3000요청 (1MB 응답이면 수 GB급 트래픽)
export const options = {
  scenarios: {
    steady_traffic: {
      executor: 'constant-arrival-rate',
      rate: RATE,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: 5,
      maxVUs: 30,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
  },
}

export function setup() {
  const startMs = Date.now()
  const startTime = formatDateTime(startMs)
  console.log(`[k6] 테스트 시작: ${startTime}`)
  return { startMs }
}

export default function () {
  http.get(TARGET_URL)
  sleep(0.1)
}

export function handleSummary(data) {
  const sent = data.metrics.data_sent?.values?.count ?? 0
  const received = data.metrics.data_received?.values?.count ?? 0
  const reqs = data.metrics.http_reqs?.values?.count ?? 0
  const iterations = data.metrics.iterations?.values?.count ?? 0
  const durationMs = data.state?.testRunDurationMs ?? 0
  const startMs = data.setup_data?.startMs ?? Date.now() - durationMs
  const endMs = startMs + durationMs
  const expectedReqs = Math.round(RATE * parseDurationToSeconds(DURATION))

  const lines = [
    '',
    '========== k6 트래픽 테스트 결과 ==========',
    `시작 시간    : ${formatDateTime(startMs)}`,
    `종료 시간    : ${formatDateTime(endMs)}`,
    `실행 시간    : ${formatDuration(durationMs)}`,
    `설정         : ${RATE} req/s × ${DURATION} (예상 ${expectedReqs}요청)`,
    `대상 URL     : ${TARGET_URL}`,
    `총 요청 수   : ${reqs} (iterations ${iterations})`,
    `보낸 데이터  : ${formatBytes(sent)} (${sent} bytes)`,
    `받은 데이터  : ${formatBytes(received)} (${received} bytes)`,
    `합계(대략)   : ${formatBytes(sent + received)}`,
    '========================================',
    'AWEN analytics totalTraffic 과 비교할 때는 sent+received 를 참고하세요.',
    '',
  ]

  return {
    stdout: lines.join('\n'),
  }
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${bytes} B`
}

function formatDateTime(ms) {
  const pad = (n) => String(n).padStart(2, '0')
  const kst = new Date(ms + 9 * 3600000)
  const y = kst.getUTCFullYear()
  const mo = pad(kst.getUTCMonth() + 1)
  const d = pad(kst.getUTCDate())
  const h = pad(kst.getUTCHours())
  const min = pad(kst.getUTCMinutes())
  const s = pad(kst.getUTCSeconds())
  const kstStr = `${y}-${mo}-${d} ${h}:${min}:${s} KST`
  const utcStr = new Date(ms).toISOString()
  return `${kstStr} (${utcStr})`
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`
  const sec = Math.floor(ms / 1000)
  const min = Math.floor(sec / 60)
  const remSec = sec % 60
  if (min === 0) return `${sec}s`
  if (min < 60) return `${min}m ${remSec}s`
  const hour = Math.floor(min / 60)
  const remMin = min % 60
  return `${hour}h ${remMin}m ${remSec}s`
}

function parseDurationToSeconds(duration) {
  const match = String(duration).trim().match(/^(\d+(?:\.\d+)?)(ms|s|m|h)?$/i)
  if (!match) return 0
  const n = Number(match[1])
  const unit = (match[2] || 's').toLowerCase()
  if (unit === 'ms') return n / 1000
  if (unit === 's') return n
  if (unit === 'm') return n * 60
  if (unit === 'h') return n * 3600
  return n
}
