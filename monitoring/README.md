# Ghost Privacy Monitoring Dashboard

Real-time operational monitoring and metrics visualization for Ghost Privacy Protocol.

## Features

### Real-Time Metrics
- Transaction activity (deposits, withdrawals, private transfers)
- Performance metrics (proving time, verification time, latency)
- Pool statistics (TVL, commitments, nullifiers)
- Network health and status

### Relayer Monitoring
- Active relayer tracking
- Success rate and reputation scoring
- Response time measurements
- Status indicators (online/offline/degraded)

### Circuit Performance
- Per-circuit proving time statistics
- Success/failure rates
- Constraint counts
- Performance trends

### System Health
- Automated health checks
- Error rate monitoring
- RPC latency tracking
- Overall system status

## Installation

```bash
cd monitoring
npm install
```

Dependencies:
- express
- socket.io
- cors
- chart.js (frontend)

## Configuration

Set environment variables:

```bash
# Dashboard port (default: 5000)
export MONITOR_PORT=5000

# Ghost configuration (automatically loaded)
export GHOST_ENV=mainnet
export GHOST_RPC_URL=https://api.mainnet-beta.solana.com
export GHOST_PROGRAM_ID=<your_program_id>
```

## Usage

### Start the Dashboard

```bash
# Development
npm run dev

# Production
npm start
```

Dashboard available at: `http://localhost:5000`

### Integration with Ghost SDK

Record metrics from your application:

```typescript
import axios from 'axios';

// Record circuit proving metrics
async function recordProving(circuitName: string, provingTime: number, success: boolean) {
  await axios.post('http://localhost:5000/api/metrics/circuit-proving', {
    circuitName,
    provingTime,
    success
  });
}

// Record relayer activity
async function recordRelayer(endpoint: string, responseTime: number, success: boolean, feeRate: number) {
  await axios.post('http://localhost:5000/api/metrics/relayer-activity', {
    endpoint,
    responseTime,
    success,
    feeRate
  });
}

// Example usage
const start = Date.now();
try {
  const proof = await generateProof(circuit, inputs);
  await recordProving('transfer', Date.now() - start, true);
} catch (error) {
  await recordProving('transfer', Date.now() - start, false);
}
```

## API Endpoints

### REST API

**GET /api/metrics/current**
Get current metrics summary

**GET /api/metrics/history?minutes=60**
Get historical metrics (default: last 60 minutes)

**GET /api/relayers**
Get all relayer metrics

**GET /api/circuits**
Get circuit performance metrics

**GET /api/health**
Get system health status

**POST /api/metrics/circuit-proving**
Record circuit proving metrics
```json
{
  "circuitName": "transfer",
  "provingTime": 1234,
  "success": true
}
```

**POST /api/metrics/relayer-activity**
Record relayer activity
```json
{
  "endpoint": "https://relayer.example.com",
  "responseTime": 456,
  "success": true,
  "feeRate": 0.001
}
```

### WebSocket Events

Connect to `http://localhost:5000`:

```javascript
const socket = io('http://localhost:5000');

// Receive real-time metric updates
socket.on('metrics:update', (metrics) => {
  console.log('New metrics:', metrics);
});

// Request historical data
socket.emit('metrics:request-history', 60); // Last 60 minutes
socket.on('metrics:history', (history) => {
  console.log('Historical data:', history);
});

// Request relayer data
socket.emit('relayers:request');
socket.on('relayers:data', (relayers) => {
  console.log('Relayers:', relayers);
});

// Request circuit data
socket.emit('circuits:request');
socket.on('circuits:data', (circuits) => {
  console.log('Circuits:', circuits);
});
```

## Metrics Data Structure

### SystemMetrics
```typescript
interface SystemMetrics {
  timestamp: number;

  // Transaction Metrics
  totalDeposits: number;
  totalWithdrawals: number;
  totalPrivateTransfers: number;
  totalVolume: number; // lamports

  // Performance Metrics
  avgProvingTime: number; // ms
  avgVerificationTime: number; // ms
  avgTransactionTime: number; // ms

  // Relayer Metrics
  activeRelayers: number;
  totalRelayedTransactions: number;
  avgRelayerFee: number;

  // Pool Metrics
  totalValueLocked: number; // lamports
  activeCommitments: number;
  spentNullifiers: number;
  merkleTreeDepth: number;

  // Network Metrics
  rpcLatency: number; // ms
  blockHeight: number;
  tps: number;

  // Error Metrics
  failedProofs: number;
  failedTransactions: number;
  errorRate: number; // percentage
}
```

### RelayerMetrics
```typescript
interface RelayerMetrics {
  endpoint: string;
  status: 'online' | 'offline' | 'degraded';
  reputation: number; // 0-100
  totalRelayed: number;
  successRate: number; // percentage
  avgResponseTime: number; // ms
  lastSeen: number; // timestamp
  feeRate: number;
}
```

### CircuitMetrics
```typescript
interface CircuitMetrics {
  circuitName: string;
  avgProvingTime: number; // ms
  minProvingTime: number; // ms
  maxProvingTime: number; // ms
  totalProofs: number;
  failedProofs: number;
  constraintCount: number;
}
```

## Health Checks

The dashboard performs automated health checks:

- **Error Rate**: Critical if >10%, degraded if >5%
- **RPC Latency**: Critical if >5000ms, degraded if >2000ms
- **Relayers**: Critical if 0 online, degraded if <3 online
- **Overall Status**: healthy | degraded | critical

## Data Persistence

Metrics are automatically saved to `monitoring/data/metrics.json` and loaded on startup. Historical data is kept for 24 hours (1440 minutes).

## Production Deployment

### Using Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY monitoring/package*.json ./
RUN npm ci --production

COPY monitoring/ ./

EXPOSE 5000

CMD ["node", "dashboard-server.js"]
```

### Using PM2

```bash
pm2 start monitoring/dashboard-server.ts --name ghost-monitor
pm2 save
pm2 startup
```

### Nginx Reverse Proxy

```nginx
server {
  listen 80;
  server_name monitor.ghostprivacy.io;

  location / {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }

  location /socket.io/ {
    proxy_pass http://localhost:5000/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
  }
}
```

## Alerting (Optional)

Add webhook notifications for critical events:

```typescript
// In dashboard-server.ts
import axios from 'axios';

async function sendAlert(message: string) {
  if (process.env.SLACK_WEBHOOK_URL) {
    await axios.post(process.env.SLACK_WEBHOOK_URL, {
      text: `🚨 Ghost Privacy Alert: ${message}`
    });
  }
}

// Check health and alert
const health = metricsCollector.getHealthStatus();
if (health.overall === 'critical') {
  await sendAlert(`System critical: ${health.checks.filter(c => c.status === 'critical').map(c => c.name).join(', ')}`);
}
```

## Troubleshooting

**Dashboard not updating:**
- Check WebSocket connection in browser console
- Verify metrics collection is running (check logs)
- Ensure no firewall blocking port 5000

**Metrics showing zeros:**
- Verify SDK is recording metrics (check POST requests)
- Check RPC URL is correct and accessible
- Ensure program ID matches deployed program

**High memory usage:**
- Reduce MAX_HISTORY in metrics-collector.ts
- Clear old data: `rm monitoring/data/metrics.json`
- Restart dashboard server

## Development

```bash
# Watch mode with auto-reload
npm run dev

# Run tests
npm test

# Lint
npm run lint
```

## License

MIT License - Part of Ghost Privacy Protocol
