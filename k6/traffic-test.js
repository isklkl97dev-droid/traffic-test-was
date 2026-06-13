import http from 'k6/http'
import { sleep } from 'k6'

// 실행 전 환경변수로 URL 지정 (아래 "k6 run" 예시 참고)
const BASE_URL = __ENV.BASE_URL || 'https://YOUR-SUBDOMAIN.awen.3vi.co.kr'
const TRAFFIC_PATH = __ENV.TRAFFIC_PATH || '/api/traffic?bytes=1048576'
const TARGET_URL = `${BASE_URL.replace(/\/$/, '')}${TRAFFIC_PATH}`

// 목표: 초당 5요청 × 10분 ≈ 3000요청 (1MB 응답이면 수 GB급 트래픽)
export const options = {
  scenarios: {
    steady_traffic: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.RATE || 5),
      timeUnit: '1s',
      duration: __ENV.DURATION || '10m',
      preAllocatedVUs: 5,
      maxVUs: 30,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
  },
}

export default function () {
  http.get(TARGET_URL)
  sleep(0.1)
}

export function handleSummary(data) {
  const sent = data.metrics.data_sent?.values?.count ?? 0
  const received = data.metrics.data_received?.values?.count ?? 0
  const reqs = data.metrics.http_reqs?.values?.count ?? 0

  const lines = [
    '',
    '========== k6 트래픽 테스트 결과 ==========',
    `대상 URL     : ${TARGET_URL}`,
    `총 요청 수   : ${reqs}`,
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
