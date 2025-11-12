/**
 * Relayer Registry - Decentralized Relayer Discovery
 *
 * Allows clients to discover and select relayers from the on-chain registry
 * based on reputation score, stake, and availability.
 */

import { Connection, PublicKey } from '@solana/web3.js';
import * as borsh from 'borsh';

const PROGRAM_ID = new PublicKey('3wiFPaYTQZZD71rd4pohPRr8JaFaGN3XaNWLoGSk31Ck');

/**
 * On-chain relayer account structure
 */
export interface RelayerInfo {
  relayer: PublicKey;
  stake: number;
  successfulRelays: number;
  failedRelays: number;
  lastHeartbeat: number;
  isActive: boolean;
  registeredAt: number;
  endpoint: string;
  bump: number;

  // Computed fields
  reputationScore: number;
  isOnline: boolean;
}

/**
 * Borsh schema for RelayerAccount deserialization
 */
class RelayerAccountSchema {
  relayer: Uint8Array;
  stake: bigint;
  successful_relays: bigint;
  failed_relays: bigint;
  last_heartbeat: bigint;
  is_active: boolean;
  registered_at: bigint;
  endpoint: string;
  bump: number;

  constructor(fields: any) {
    this.relayer = fields.relayer;
    this.stake = fields.stake;
    this.successful_relays = fields.successful_relays;
    this.failed_relays = fields.failed_relays;
    this.last_heartbeat = fields.last_heartbeat;
    this.is_active = fields.is_active;
    this.registered_at = fields.registered_at;
    this.endpoint = fields.endpoint;
    this.bump = fields.bump;
  }
}

const RelayerAccountBorshSchema = new Map([
  [
    RelayerAccountSchema,
    {
      kind: 'struct',
      fields: [
        ['relayer', [32]],
        ['stake', 'u64'],
        ['successful_relays', 'u64'],
        ['failed_relays', 'u64'],
        ['last_heartbeat', 'i64'],
        ['is_active', 'u8'],
        ['registered_at', 'i64'],
        ['endpoint', 'string'],
        ['bump', 'u8'],
      ],
    },
  ],
]);

/**
 * Relayer Registry - manages relayer discovery and selection
 */
export class RelayerRegistry {
  private connection: Connection;
  private cachedRelayers: RelayerInfo[] = [];
  private lastUpdate: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute cache

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Derive relayer PDA address
   */
  deriveRelayerAddress(relayerWallet: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('relayer'), relayerWallet.toBuffer()],
      PROGRAM_ID
    );
  }

  /**
   * Fetch all registered relayers from on-chain
   */
  async fetchAllRelayers(): Promise<RelayerInfo[]> {
    // Check cache
    const now = Date.now();
    if (this.cachedRelayers.length > 0 && now - this.lastUpdate < this.CACHE_TTL) {
      return this.cachedRelayers;
    }

    console.log('🔍 Fetching relayers from on-chain registry...');

    // Get all relayer accounts (PDA accounts with discriminator)
    const accounts = await this.connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        {
          // Filter for relayer accounts by checking account size
          dataSize: 32 + 8 + 8 + 8 + 8 + 1 + 8 + 4 + 128 + 1, // RelayerAccount::LEN
        },
      ],
    });

    const relayers: RelayerInfo[] = [];
    const currentTime = Math.floor(Date.now() / 1000);

    for (const { pubkey, account } of accounts) {
      try {
        // Deserialize relayer account
        const data = borsh.deserialize(
          RelayerAccountBorshSchema,
          RelayerAccountSchema,
          account.data
        ) as RelayerAccountSchema;

        // Calculate reputation score
        const total = Number(data.successful_relays) + Number(data.failed_relays);
        let reputationScore = 50; // Default for new relayers
        if (total > 0) {
          reputationScore = Math.min(100, Math.floor((Number(data.successful_relays) * 100) / total));
        }

        // Check if online (heartbeat within last 5 minutes)
        const lastHeartbeat = Number(data.last_heartbeat);
        const isOnline = data.is_active && (currentTime - lastHeartbeat) < 300;

        relayers.push({
          relayer: new PublicKey(data.relayer),
          stake: Number(data.stake),
          successfulRelays: Number(data.successful_relays),
          failedRelays: Number(data.failed_relays),
          lastHeartbeat,
          isActive: data.is_active,
          registeredAt: Number(data.registered_at),
          endpoint: data.endpoint,
          bump: data.bump,
          reputationScore,
          isOnline,
        });
      } catch (error) {
        console.warn(`Failed to deserialize relayer account ${pubkey.toString()}:`, error);
      }
    }

    console.log(`   Found ${relayers.length} registered relayers`);

    this.cachedRelayers = relayers;
    this.lastUpdate = now;

    return relayers;
  }

  /**
   * Select best relayer based on reputation and availability
   */
  async selectBestRelayer(): Promise<RelayerInfo | null> {
    const relayers = await this.fetchAllRelayers();

    // Filter for active and online relayers
    const availableRelayers = relayers.filter(r => r.isActive && r.isOnline);

    if (availableRelayers.length === 0) {
      console.warn('⚠️  No online relayers available');
      return null;
    }

    // Sort by reputation score (descending), then by stake (descending)
    availableRelayers.sort((a, b) => {
      if (a.reputationScore !== b.reputationScore) {
        return b.reputationScore - a.reputationScore;
      }
      return b.stake - a.stake;
    });

    const best = availableRelayers[0];
    console.log(`✅ Selected relayer: ${best.relayer.toString()}`);
    console.log(`   Reputation: ${best.reputationScore}/100`);
    console.log(`   Endpoint: ${best.endpoint}`);
    console.log(`   Stake: ${best.stake / 1e9} SOL`);

    return best;
  }

  /**
   * Get relayer by address
   */
  async getRelayer(relayerWallet: PublicKey): Promise<RelayerInfo | null> {
    const [relayerPDA] = this.deriveRelayerAddress(relayerWallet);

    try {
      const accountInfo = await this.connection.getAccountInfo(relayerPDA);
      if (!accountInfo) {
        return null;
      }

      const data = borsh.deserialize(
        RelayerAccountBorshSchema,
        RelayerAccountSchema,
        accountInfo.data
      ) as RelayerAccountSchema;

      const total = Number(data.successful_relays) + Number(data.failed_relays);
      let reputationScore = 50;
      if (total > 0) {
        reputationScore = Math.min(100, Math.floor((Number(data.successful_relays) * 100) / total));
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const lastHeartbeat = Number(data.last_heartbeat);
      const isOnline = data.is_active && (currentTime - lastHeartbeat) < 300;

      return {
        relayer: new PublicKey(data.relayer),
        stake: Number(data.stake),
        successfulRelays: Number(data.successful_relays),
        failedRelays: Number(data.failed_relays),
        lastHeartbeat,
        isActive: data.is_active,
        registeredAt: Number(data.registered_at),
        endpoint: data.endpoint,
        bump: data.bump,
        reputationScore,
        isOnline,
      };
    } catch (error) {
      console.error(`Failed to fetch relayer ${relayerWallet.toString()}:`, error);
      return null;
    }
  }

  /**
   * List all online relayers sorted by reputation
   */
  async listOnlineRelayers(): Promise<RelayerInfo[]> {
    const relayers = await this.fetchAllRelayers();

    return relayers
      .filter(r => r.isActive && r.isOnline)
      .sort((a, b) => b.reputationScore - a.reputationScore);
  }

  /**
   * Get relayer statistics
   */
  async getStatistics(): Promise<{
    total: number;
    online: number;
    totalStake: number;
    averageReputation: number;
  }> {
    const relayers = await this.fetchAllRelayers();
    const online = relayers.filter(r => r.isActive && r.isOnline);

    const totalStake = relayers.reduce((sum, r) => sum + r.stake, 0);
    const avgReputation = relayers.length > 0
      ? relayers.reduce((sum, r) => sum + r.reputationScore, 0) / relayers.length
      : 0;

    return {
      total: relayers.length,
      online: online.length,
      totalStake,
      averageReputation: Math.floor(avgReputation),
    };
  }
}

/**
 * Example usage
 */
async function main() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const registry = new RelayerRegistry(connection);

  // Get statistics
  const stats = await registry.getStatistics();
  console.log('\n📊 Relayer Network Statistics:');
  console.log(`   Total relayers: ${stats.total}`);
  console.log(`   Online relayers: ${stats.online}`);
  console.log(`   Total stake: ${stats.totalStake / 1e9} SOL`);
  console.log(`   Average reputation: ${stats.averageReputation}/100`);

  // List online relayers
  console.log('\n📋 Online Relayers:');
  const onlineRelayers = await registry.listOnlineRelayers();
  for (const relayer of onlineRelayers) {
    console.log(`\n   Relayer: ${relayer.relayer.toString()}`);
    console.log(`   Endpoint: ${relayer.endpoint}`);
    console.log(`   Reputation: ${relayer.reputationScore}/100`);
    console.log(`   Stake: ${relayer.stake / 1e9} SOL`);
    console.log(`   Relays: ${relayer.successfulRelays} success, ${relayer.failedRelays} failed`);
  }

  // Select best relayer
  console.log('\n🎯 Best Relayer:');
  const best = await registry.selectBestRelayer();
  if (best) {
    console.log(`   Address: ${best.relayer.toString()}`);
    console.log(`   Endpoint: ${best.endpoint}`);
    console.log(`   Reputation: ${best.reputationScore}/100`);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}

export default RelayerRegistry;
