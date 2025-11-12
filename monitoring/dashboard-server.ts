/**
 * Monitoring Dashboard Server
 *
 * Serves real-time metrics via REST API and WebSocket
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { MetricsCollector } from './metrics-collector';
import config from '../config/production.config';
import * as path from 'path';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load configuration
const cfg = config.load();
const metricsCollector = new MetricsCollector(
  cfg.network.rpcUrl,
  cfg.network.programId
);

// Collect metrics every minute
setInterval(async () => {
  try {
    const metrics = await metricsCollector.collectMetrics();

    // Broadcast to all connected clients
    io.emit('metrics:update', metrics);
  } catch (error) {
    console.error('Failed to collect metrics:', error);
  }
}, 60000);

// REST API Endpoints

/**
 * Get current metrics summary
 */
app.get('/api/metrics/current', (req, res) => {
  const summary = metricsCollector.getCurrentSummary();
  res.json(summary);
});

/**
 * Get metrics history
 */
app.get('/api/metrics/history', (req, res) => {
  const minutes = parseInt(req.query.minutes as string) || 60;
  const history = metricsCollector.getMetricsHistory(minutes);
  res.json(history);
});

/**
 * Get relayer metrics
 */
app.get('/api/relayers', (req, res) => {
  const relayers = metricsCollector.getRelayerMetrics();
  res.json(relayers);
});

/**
 * Get circuit metrics
 */
app.get('/api/circuits', (req, res) => {
  const circuits = metricsCollector.getCircuitMetrics();
  res.json(circuits);
});

/**
 * Get health status
 */
app.get('/api/health', (req, res) => {
  const health = metricsCollector.getHealthStatus();
  res.json(health);
});

/**
 * Record circuit proving (for integration)
 */
app.post('/api/metrics/circuit-proving', (req, res) => {
  const { circuitName, provingTime, success } = req.body;

  if (!circuitName || provingTime === undefined || success === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  metricsCollector.recordCircuitProving(circuitName, provingTime, success);
  res.json({ success: true });
});

/**
 * Record relayer activity (for integration)
 */
app.post('/api/metrics/relayer-activity', (req, res) => {
  const { endpoint, responseTime, success, feeRate } = req.body;

  if (!endpoint || responseTime === undefined || success === undefined || feeRate === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  metricsCollector.recordRelayerActivity(endpoint, responseTime, success, feeRate);
  res.json({ success: true });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send current metrics immediately
  const current = metricsCollector.getCurrentSummary();
  if (current) {
    socket.emit('metrics:update', current);
  }

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  // Allow clients to request specific data
  socket.on('metrics:request-history', (minutes: number) => {
    const history = metricsCollector.getMetricsHistory(minutes);
    socket.emit('metrics:history', history);
  });

  socket.on('relayers:request', () => {
    const relayers = metricsCollector.getRelayerMetrics();
    socket.emit('relayers:data', relayers);
  });

  socket.on('circuits:request', () => {
    const circuits = metricsCollector.getCircuitMetrics();
    socket.emit('circuits:data', circuits);
  });
});

// Start server
const PORT = process.env.MONITOR_PORT || 5000;

httpServer.listen(PORT, () => {
  console.log('\n');
  console.log('   ▄████  ██░ ██  ▒█████    ██████ ▄▄▄█████▓');
  console.log('  ██▒ ▀█▒▓██░ ██▒▒██▒  ██▒▒██    ▒ ▓  ██▒ ▓▒');
  console.log(' ▒██░▄▄▄░▒██▀▀██░▒██░  ██▒░ ▓██▄   ▒ ▓██░ ▒░');
  console.log(' ░▓█  ██▓░▓█ ░██ ▒██   ██░  ▒   ██▒░ ▓██▓ ░ ');
  console.log(' ░▒▓███▀▒░▓█▒░██▓░ ████▓▒░▒██████▒▒  ▒██▒ ░ ');
  console.log('  ░▒   ▒  ▒ ░░▒░▒░ ▒░▒░▒░ ▒ ▒▓▒ ▒ ░  ▒ ░░   ');
  console.log('   ░   ░  ▒ ░▒░ ░  ░ ▒ ▒░ ░ ░▒  ░ ░    ░    ');
  console.log(' ░ ░   ░  ░  ░░ ░░ ░ ░ ▒  ░  ░  ░    ░      ');
  console.log('       ░  ░  ░  ░    ░ ░        ░           ');
  console.log('\n');
  console.log('========================================');
  console.log('Ghost Privacy - Monitoring Dashboard');
  console.log('========================================');
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket available for real-time updates`);
  console.log('\nAPI Endpoints:');
  console.log('  GET  /api/metrics/current - Current metrics');
  console.log('  GET  /api/metrics/history - Historical data');
  console.log('  GET  /api/relayers - Relayer status');
  console.log('  GET  /api/circuits - Circuit performance');
  console.log('  GET  /api/health - System health');
  console.log('  POST /api/metrics/circuit-proving - Record proving');
  console.log('  POST /api/metrics/relayer-activity - Record activity');
  console.log('\nDashboard: http://localhost:' + PORT);
});

export { metricsCollector };
