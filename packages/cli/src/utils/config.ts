import Conf from 'conf';

const config = new Conf({ projectName: 'ghost-sdk' });

export interface GhostConfig {
  network: string;
  rpcUrl: string;
  privateKey: string;
  publicKey: string;
  programId: string;
}

export async function saveConfig(data: GhostConfig): Promise<void> {
  config.set(data);
}

export async function loadConfig(): Promise<GhostConfig> {
  const data = config.store as GhostConfig;

  if (!data.network) {
    throw new Error('Configuration not found. Run: ghost init');
  }

  return data;
}

export async function clearConfig(): Promise<void> {
  config.clear();
}
