import { apiClient } from './client';

export interface UsageSnapshotTokens {
  input_tokens?: number;
  output_tokens?: number;
  cached_tokens?: number;
  cache_read_tokens?: number;
  cache_creation_tokens?: number;
}

export interface UsageSnapshotRecord {
  provider?: string;
  model?: string;
  alias?: string;
  failed?: boolean;
  tokens?: UsageSnapshotTokens;
}

export const usageSnapshotApi = {
  list: (count = 20_000) =>
    apiClient.get<UsageSnapshotRecord[]>('/usage-snapshot', {
      params: { count },
    }),
};
