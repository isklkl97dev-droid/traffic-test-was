'use strict'

const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const ENV_FILE = path.join(ROOT, 'k6.env')
const SCRIPT = path.join(ROOT, 'k6', 'traffic-test.js')
const DEFAULT_BASE_URL = 'https://6e77uxt2.awen.3vi.co.kr'

const PRESETS = {
  default: {
    BASE_URL: DEFAULT_BASE_URL,
    RATE: '5',
    DURATION: '10m',
    TRAFFIC_PATH: '/api/traffic?bytes=1048576',
  },
  light: {
    BASE_URL: DEFAULT_BASE_URL,
    RATE: '2',
    DURATION: '1m',
    TRAFFIC_PATH: '/api/traffic?bytes=65536',
  },
  medium: {
    BASE_URL: DEFAULT_BASE_URL,
    RATE: '10',
    DURATION: '5m',
    TRAFFIC_PATH: '/api/traffic?bytes=524288',
  },
  local: {
    BASE_URL: 'http://localhost:3000',
    RATE: '2',
    DURATION: '1m',
    TRAFFIC_PATH: '/api/traffic?bytes=65536',
  },
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const env = {}
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    if (!key || key.startsWith('#')) continue
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    } else {
      const hashIdx = value.indexOf('#')
      if (hashIdx !== -1) value = value.slice(0, hashIdx).trim()
      const slashComment = value.match(/\s+\/\//)
      if (slashComment) value = value.slice(0, slashComment.index).trim()
    }
    if (value) env[key] = value
  }
  return env
}

function parseCliOverrides(argv) {
  const overrides = {}
  for (const arg of argv) {
    if (arg.startsWith('--preset=')) continue
    if (arg.startsWith('--base-url=')) {
      overrides.BASE_URL = arg.slice('--base-url='.length)
      continue
    }
    if (arg.startsWith('--rate=')) {
      overrides.RATE = arg.slice('--rate='.length)
      continue
    }
    if (arg.startsWith('--duration=')) {
      overrides.DURATION = arg.slice('--duration='.length)
      continue
    }
    if (arg.startsWith('--traffic-path=')) {
      overrides.TRAFFIC_PATH = arg.slice('--traffic-path='.length)
    }
  }
  return overrides
}

function resolveK6Bin() {
  if (process.env.K6_BIN) return process.env.K6_BIN

  const candidates = []
  if (process.platform === 'win32') {
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files'
    candidates.push(path.join(programFiles, 'k6', 'k6.exe'))
    if (process.env.LOCALAPPDATA) {
      candidates.push(path.join(process.env.LOCALAPPDATA, 'Programs', 'k6', 'k6.exe'))
    }
  }
  candidates.push('k6')

  for (const candidate of candidates) {
    if (candidate === 'k6') return candidate
    if (fs.existsSync(candidate)) return candidate
  }
  return 'k6'
}

function main() {
  const argv = process.argv.slice(2)
  const presetName = argv.find((arg) => arg.startsWith('--preset='))?.split('=')[1] || 'default'
  const preset = PRESETS[presetName] || PRESETS.default
  const merged = { ...preset, ...loadEnvFile(ENV_FILE), ...parseCliOverrides(argv) }

  const args = ['run', SCRIPT]
  for (const [key, value] of Object.entries(merged)) {
    if (value) args.push('-e', `${key}=${value}`)
  }

  const k6Bin = resolveK6Bin()
  const result = spawnSync(k6Bin, args, {
    stdio: 'inherit',
    cwd: ROOT,
    shell: process.platform === 'win32' && k6Bin === 'k6',
  })

  if (result.error && k6Bin === 'k6') {
    console.error('k6를 찾을 수 없습니다.')
    console.error('')
    console.error('  winget install GrafanaLabs.k6')
    console.error('  또는 K6_BIN="C:\\Program Files\\k6\\k6.exe" npm run k6')
    process.exit(1)
  }
  process.exit(result.status ?? 1)
}

main()
