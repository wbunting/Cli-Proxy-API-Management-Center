import { apiClient } from './client';

export type ModelRouteMember = {
  provider: string;
  model: string;
  priority: number;
  available: boolean;
  quota_remaining?: number;
  quota_known: boolean;
  quota_capacity?: number;
  reset_at?: string;
  last_used_at?: string;
  requests: number;
  failures: number;
  input_tokens: number;
  output_tokens: number;
};

export type ModelRoute = {
  alias: string;
  kind: 'role' | 'tier';
  display_name: string;
  members: ModelRouteMember[];
  active?: ModelRouteMember;
  next?: ModelRouteMember;
  aggregate_remaining?: number;
  aggregate_remaining_known: boolean;
  observed_at: string;
};

export type ModelRoutesResponse = {
  observed_at: string;
  routes: ModelRoute[];
};

export const modelRoutesApi = {
  list: () => apiClient.get<ModelRoutesResponse>('/model-routes'),
};
