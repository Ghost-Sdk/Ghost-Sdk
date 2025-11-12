/**
 * Metrics Collector
 *
 * Collects and aggregates operational metrics for Ghost Privacy
 */

import { Connection, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

export interface SystemMetrics {
  timestamp: number;

  // Transaction Metrics
  totalDeposits: number;
  totalWithdrawals: number;
  totalPrivateTransfers: number;
  totalVolume: number; // in lamports

  // Performance Metrics
  avgProvingTime: number; // milliseconds
  avgVerificationTime: number; // milliseconds
  avgTransactionTime: number; // milliseconds

  // Relayer Metrics
  activeRelayers: number;
  totalRelayedTransactions: number;
  avgRelayerFee: number;
  relayerHealthScores: Map<string, number>;

  // Pool Metrics
  totalValueLocked: number; // in lamports
  activeCommitments: number;
  spentNullifiers: number;
  merkleTreeDepth: number;

  // Network Metrics
  rpcLatency: number; // milliseconds
  blockHeight: number;
  tps: number; // transactions per second

  // Error Metrics
  failedProofs: number;
  failedTransactions: number;
  errorRate: number; // percentage
}

export interface RelayerMetrics {
  endpoint: string;
  status: 'online' | 'offline' | 'degraded';
  reputation: number;
  totalRelayed: number;
  successRate: number;
  avgResponseTime: number;
  lastSeen: number;
  feeRate: number;
}

export interface CircuitMetrics {
  circuitName: string;
  avgProvingTime: number;
  minProvingTime: number;
  maxProvingTime: number;
  totalProofs: number;
  failedProofs: number;
  constraintCount: number;
}

export class MetricsCollector {
  private connection: Connection;
  private programId: PublicKey;
  private metricsHistory: SystemMetrics[] = [];
  private relayerMetrics: Map<string, RelayerMetrics> = new Map();
  private circuitMetrics: Map<string, CircuitMetrics> = new Map();

  private readonly METRICS_FILE = path.join(__dirname, 'data', 'metrics.json');
  private readonly MAX_HISTORY = 1440; // 24 hours at 1-minute intervals

  constructor(rpcUrl: string, programId: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.programId = new PublicKey(programId);
    this.loadMetrics();
  }

  /**
   * Collect current system metrics
   */
  async collectMetrics(): Promise<SystemMetrics> {
    const timestamp = Date.now();

    // Collect various metrics
    const [
      transactionMetrics,
      performanceMetrics,
      poolMetrics,
      networkMetrics,
      errorMetrics
    ] = await Promise.all([
      this.collectTransactionMetrics(),
      this.collectPerformanceMetrics(),
      this.collectPoolMetrics(),
      this.collectNetworkMetrics(),
      this.collectErrorMetrics()
    ]);

    const metrics: SystemMetrics = {
      timestamp,
      ...transactionMetrics,
      ...performanceMetrics,
      ...poolMetrics,
      ...networkMetrics,
      ...errorMetrics,
      activeRelayers: this.relayerMetrics.size,
      totalRelayedTransactions: this.getTotalRelayedTransactions(),
      avgRelayerFee: this.getAverageRelayerFee(),
      relayerHealthScores: this.getRelayerHealthScores()
    };

    this.metricsHistory.push(metrics);

    // Keep only last MAX_HISTORY entries
    if (this.metricsHistory.length > this.MAX_HISTORY) {
      this.metricsHistory = this.metricsHistory.slice(-this.MAX_HISTORY);
    }

    this.saveMetrics();

    return metrics;
  }

  /**
   * Collect transaction metrics from on-chain data
   */
  private async collectTransactionMetrics() {
    // In production, query program accounts and parse logs
    // For now, return sample data structure
    return {
      totalDeposits: 0,
      totalWithdrawals: 0,
      totalPrivateTransfers: 0,
      totalVolume: 0
    };
  }

  /**
   * Collect performance metrics
   */
  private async collectPerformanceMetrics() {
    const circuits = ['transfer', 'balance', 'ring_signature'];
    let totalProvingTime = 0;
    let count = 0;

    for (const circuit of circuits) {
      const metrics = this.circuitMetrics.get(circuit);
      if (metrics) {
        totalProvingTime += metrics.avgProvingTime;
        count++;
      }
    }

    return {
      avgProvingTime: count > 0 ? totalProvingTime / count : 0,
      avgVerificationTime: 0, // Measured from on-chain
      avgTransactionTime: 0
    };
  }

  /**
   * Collect pool metrics
   */
  private async collectPoolMetrics() {
    try {
      // Query pool account
      // This is placeholder - implement actual on-chain queries
      return {
        totalValueLocked: 0,
        activeCommitments: 0,
        spentNullifiers: 0,
        merkleTreeDepth: 20
      };
    } catch (error) {
      console.error('Failed to collect pool metrics:', error);
      return {
        totalValueLocked: 0,
        activeCommitments: 0,
        spentNullifiers: 0,
        merkleTreeDepth: 20
      };
    }
  }

  /**
   * Collect network metrics
   */
  private async collectNetworkMetrics() {
    const start = Date.now();

    try {
      const slot = await this.connection.getSlot();
      const rpcLatency = Date.now() - start;

      // Get recent performance samples
      const perfSamples = await this.connection.getRecentPerformanceSamples(1);
      const tps = perfSamples.length > 0 ? perfSamples[0].numTransactions / perfSamples[0].samplePeriodSecs : 0;

      return {
        rpcLatency,
        blockHeight: slot,
        tps
      };
    } catch (error) {
      console.error('Failed to collect network metrics:', error);
      return {
        rpcLatency: 0,
        blockHeight: 0,
        tps: 0
      };
    }
  }

  /**
   * Collect error metrics
   */
  private async collectErrorMetrics() {
    // Calculate from historical data
    const recentMetrics = this.metricsHistory.slice(-60); // Last hour

    let totalProofs = 0;
    let failedProofs = 0;
    let totalTransactions = 0;
    let failedTransactions = 0;

    for (const metric of recentMetrics) {
      failedProofs += metric.failedProofs || 0;
      failedTransactions += metric.failedTransactions || 0;
    }

    const errorRate = totalTransactions > 0 ? (failedTransactions / totalTransactions) * 100 : 0;

    return {
      failedProofs,
      failedTransactions,
      errorRate
    };
  }

  /**
   * Record circuit proving metrics
   */
  recordCircuitProving(circuitName: string, provingTime: number, success: boolean) {
    let metrics = this.circuitMetrics.get(circuitName);

    if (!metrics) {
      metrics = {
        circuitName,
        avgProvingTime: 0,
        minProvingTime: provingTime,
        maxProvingTime: provingTime,
        totalProofs: 0,
        failedProofs: 0,
        constraintCount: 0
      };
      this.circuitMetrics.set(circuitName, metrics);
    }

    metrics.totalProofs++;
    if (!success) {
      metrics.failedProofs++;
    }

    // Update timing stats
    metrics.avgProvingTime = (metrics.avgProvingTime * (metrics.totalProofs - 1) + provingTime) / metrics.totalProofs;
    metrics.minProvingTime = Math.min(metrics.minProvingTime, provingTime);
    metrics.maxProvingTime = Math.max(metrics.maxProvingTime, provingTime);
  }

  /**
   * Record relayer metrics
   */
  recordRelayerActivity(
    endpoint: string,
    responseTime: number,
    success: boolean,
    feeRate: number
  ) {
    let metrics = this.relayerMetrics.get(endpoint);

    if (!metrics) {
      metrics = {
        endpoint,
        status: 'online',
        reputation: 100,
        totalRelayed: 0,
        successRate: 100,
        avgResponseTime: responseTime,
        lastSeen: Date.now(),
        feeRate
      };
      this.relayerMetrics.set(endpoint, metrics);
    }

    metrics.totalRelayed++;
    metrics.lastSeen = Date.now();
    metrics.feeRate = feeRate;

    // Update success rate
    const successCount = Math.round((metrics.successRate / 100) * (metrics.totalRelayed - 1));
    const newSuccessCount = successCount + (success ? 1 : 0);
    metrics.successRate = (newSuccessCount / metrics.totalRelayed) * 100;

    // Update avg response time
    metrics.avgResponseTime = (metrics.avgResponseTime * (metrics.totalRelayed - 1) + responseTime) / metrics.totalRelayed;

    // Update status
    if (success) {
      metrics.status = 'online';
    } else {
      metrics.status = metrics.successRate < 50 ? 'offline' : 'degraded';
    }

    // Update reputation (based on success rate and response time)
    metrics.reputation = Math.min(100, metrics.successRate * 0.7 + (1000 / metrics.avgResponseTime) * 0.3);
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(minutes: number = 60): SystemMetrics[] {
    return this.metricsHistory.slice(-minutes);
  }

  /**
   * Get current metrics summary
   */
  getCurrentSummary(): SystemMetrics | null {
    return this.metricsHistory.length > 0 ? this.metricsHistory[this.metricsHistory.length - 1] : null;
  }

  /**
   * Get all relayer metrics
   */
  getRelayerMetrics(): RelayerMetrics[] {
    return Array.from(this.relayerMetrics.values());
  }

  /**
   * Get all circuit metrics
   */
  getCircuitMetrics(): CircuitMetrics[] {
    return Array.from(this.circuitMetrics.values());
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    overall: 'healthy' | 'degraded' | 'critical';
    checks: { name: string; status: string; message: string }[];
  } {
    const checks: { name: string; status: string; message: string }[] = [];
    let criticalCount = 0;
    let degradedCount = 0;

    const current = this.getCurrentSummary();
    if (!current) {
      return {
        overall: 'critical',
        checks: [{ name: 'System', status: 'critical', message: 'No metrics available' }]
      };
    }

    // Check error rate
    if (current.errorRate > 10) {
      checks.push({ name: 'Error Rate', status: 'critical', message: `High error rate: ${current.errorRate.toFixed(2)}%` });
      criticalCount++;
    } else if (current.errorRate > 5) {
      checks.push({ name: 'Error Rate', status: 'degraded', message: `Elevated error rate: ${current.errorRate.toFixed(2)}%` });
      degradedCount++;
    } else {
      checks.push({ name: 'Error Rate', status: 'healthy', message: `Error rate: ${current.errorRate.toFixed(2)}%` });
    }

    // Check RPC latency
    if (current.rpcLatency > 5000) {
      checks.push({ name: 'RPC Latency', status: 'critical', message: `High latency: ${current.rpcLatency}ms` });
      criticalCount++;
    } else if (current.rpcLatency > 2000) {
      checks.push({ name: 'RPC Latency', status: 'degraded', message: `Elevated latency: ${current.rpcLatency}ms` });
      degradedCount++;
    } else {
      checks.push({ name: 'RPC Latency', status: 'healthy', message: `Latency: ${current.rpcLatency}ms` });
    }

    // Check relayers
    const onlineRelayers = Array.from(this.relayerMetrics.values()).filter(r => r.status === 'online').length;
    if (onlineRelayers === 0) {
      checks.push({ name: 'Relayers', status: 'critical', message: 'No relayers online' });
      criticalCount++;
    } else if (onlineRelayers < 3) {
      checks.push({ name: 'Relayers', status: 'degraded', message: `Only ${onlineRelayers} relayers online` });
      degradedCount++;
    } else {
      checks.push({ name: 'Relayers', status: 'healthy', message: `${onlineRelayers} relayers online` });
    }

    // Determine overall status
    let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalCount > 0) {
      overall = 'critical';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    }

    return { overall, checks };
  }

  /**
   * Helper methods
   */
  private getTotalRelayedTransactions(): number {
    let total = 0;
    for (const metrics of this.relayerMetrics.values()) {
      total += metrics.totalRelayed;
    }
    return total;
  }

  private getAverageRelayerFee(): number {
    const relayers = Array.from(this.relayerMetrics.values());
    if (relayers.length === 0) return 0;

    const total = relayers.reduce((sum, r) => sum + r.feeRate, 0);
    return total / relayers.length;
  }

  private getRelayerHealthScores(): Map<string, number> {
    const scores = new Map<string, number>();
    for (const [endpoint, metrics] of this.relayerMetrics) {
      scores.set(endpoint, metrics.reputation);
    }
    return scores;
  }

  /**
   * Persistence
   */
  private saveMetrics() {
    try {
      const dataDir = path.dirname(this.METRICS_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const data = {
        history: this.metricsHistory,
        relayers: Array.from(this.relayerMetrics.entries()),
        circuits: Array.from(this.circuitMetrics.entries())
      };

      fs.writeFileSync(this.METRICS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save metrics:', error);
    }
  }

  private loadMetrics() {
    try {
      if (fs.existsSync(this.METRICS_FILE)) {
        const data = JSON.parse(fs.readFileSync(this.METRICS_FILE, 'utf-8'));
        this.metricsHistory = data.history || [];
        this.relayerMetrics = new Map(data.relayers || []);
        this.circuitMetrics = new Map(data.circuits || []);
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  }
}
