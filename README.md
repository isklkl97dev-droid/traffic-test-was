# traffic-test-was

AWEN WAS 트래픽 수집·과금 검증용 최소 Node.js 서버 + k6 부하 스크립트.

## 빠른 시작

**사전 요구:** Node.js 20+, [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/)

### 1. k6 설치

```powershell
# Windows (winget, 권장)
winget install k6 --source winget

# macOS
brew install k6

# Linux — https://grafana.com/docs/k6/latest/set-up/install-k6/
```

설치 확인:

```bash
k6 version
```

### 2. 의존성 설치 및 테스트 실행

```bash
npm install
npm run k6:light    # 소량 테스트 (6e77uxt2.awen.3vi.co.kr)
npm run k6          # 기본 부하 테스트
```

k6를 PATH에 못 잡는 경우 (Windows):

```powershell
$env:K6_BIN="C:\Program Files\k6\k6.exe"
npm run k6
```

## npm 스크립트

| 명령 | 설명 |
|------|------|
| `npm start` | WAS 서버 기동 |
| `npm run k6` | k6 기본 테스트 (`6e77uxt2.awen.3vi.co.kr`) |
| `npm run k6:light` | 소량 테스트 (2 req/s × 1분) |
| `npm run k6:medium` | 중간 부하 (10 req/s × 5분) |
| `npm run k6:local` | 로컬 WAS (`localhost:3000`) |
