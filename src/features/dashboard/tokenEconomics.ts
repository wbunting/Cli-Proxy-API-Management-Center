import type { UsageSnapshotRecord } from '@/services/api';

interface ModelPrice {
  input: number;
  output: number;
  cacheRead?: number;
  cacheWrite?: number;
}

export interface ModelEconomics {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  estimatedCostUsd: number | null;
}

export interface TokenEconomics {
  records: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  estimatedCostUsd: number;
  unpricedTokens: number;
  models: ModelEconomics[];
}

const numberOrZero = (value: unknown): number => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

const modelPrice = (model: string): ModelPrice | null => {
  const value = model.toLowerCase().replace(/^claude-code\//, '');

  if (value.includes('z-ai-glm-5-3-flash')) return { input: 0.15, output: 0.5 };
  if (value.includes('z-ai-glm-5-3')) return { input: 1.75, output: 5.5 };
  if (value.includes('zai-org-glm-5-2')) return { input: 1.4, output: 4.4 };
  if (value.includes('deepseek-v4-1-flash')) return { input: 0.38, output: 1.5 };
  if (value.includes('venice-uncensored-1-2')) return { input: 0.2, output: 0.9 };
  if (value.includes('kimi-k3')) return { input: 3.75, output: 18.75 };

  if (
    value.includes('claude-fable-5-1') ||
    value.includes('claude-fable-5.1') ||
    value.includes('claude-fable-5')
  ) {
    return { input: 10, output: 50, cacheRead: 2.5, cacheWrite: 12.5 };
  }
  if (/claude-opus-(5|4-8|4\.8|4-7|4\.7|4-6|4\.6)/.test(value)) {
    return { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 };
  }
  if (value.includes('claude-sonnet-5')) {
    return { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 };
  }
  if (/claude-sonnet-(4-6|4\.6)/.test(value)) {
    return { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 };
  }
  if (/claude-haiku-(4-5|4\.5)/.test(value)) {
    return { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 };
  }

  if (value.includes('gpt-6-astra')) return { input: 10, output: 50 };
  if (value.includes('gpt-5.6-sol')) return { input: 4, output: 20 };
  if (value.includes('gpt-5.6-terra')) return { input: 2, output: 12 };
  if (value.includes('gpt-5.6-luna')) return { input: 0.2, output: 1.2 };
  if (value.includes('gpt-5.5')) return { input: 5, output: 30 };

  if (/grok-4[-.]6/.test(value)) return { input: 2, output: 6 };
  if (/grok-4[-.]5/.test(value)) return { input: 2, output: 6 };
  if (/grok-4[-.]3/.test(value)) return { input: 1.25, output: 2.5 };
  if (/grok-4[-.]20/.test(value)) return { input: 1.25, output: 2.5 };
  if (/grok-build-0[-.]1/.test(value)) return { input: 1, output: 2 };
  if (value.includes('grok-3-mini-fast')) return { input: 0.6, output: 4 };
  if (value.includes('grok-3-mini')) return { input: 0.3, output: 0.5 };

  return null;
};

export function buildTokenEconomics(records: UsageSnapshotRecord[]): TokenEconomics {
  const byModel = new Map<string, ModelEconomics>();

  records.forEach((record) => {
    if (record.failed) return;
    // Price and group by the concrete upstream model. Role/tier aliases describe routing policy,
    // not a billable model, and would otherwise make routed traffic appear unpriced.
    const model = String(record.model || record.alias || '').trim();
    if (!model) return;

    const tokens = record.tokens ?? {};
    const entry = byModel.get(model) ?? {
      model,
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      estimatedCostUsd: 0,
    };

    const cacheReadTokens = numberOrZero(tokens.cache_read_tokens);
    const cacheCreationTokens = numberOrZero(tokens.cache_creation_tokens);
    const cachedTokens = Math.max(cacheReadTokens, numberOrZero(tokens.cached_tokens));

    entry.inputTokens += numberOrZero(tokens.input_tokens);
    entry.outputTokens += numberOrZero(tokens.output_tokens);
    entry.cachedTokens += cachedTokens;
    entry.cacheReadTokens += cacheReadTokens;
    entry.cacheCreationTokens += cacheCreationTokens;
    byModel.set(model, entry);
  });

  let estimatedCostUsd = 0;
  let unpricedTokens = 0;
  const models = Array.from(byModel.values()).map((entry) => {
    const price = modelPrice(entry.model);
    if (!price) {
      entry.estimatedCostUsd = null;
      unpricedTokens += entry.inputTokens + entry.outputTokens + entry.cachedTokens;
      return entry;
    }

    let cacheReadTokens = entry.cacheReadTokens;
    const cacheCreationTokens = entry.cacheCreationTokens;
    if (cacheReadTokens === 0 && cacheCreationTokens === 0) {
      cacheReadTokens = entry.cachedTokens;
    }
    const uncachedInputTokens = Math.max(
      0,
      entry.inputTokens - Math.min(entry.inputTokens, cacheReadTokens + cacheCreationTokens)
    );
    const cost =
      (uncachedInputTokens * price.input +
        cacheReadTokens * (price.cacheRead ?? price.input) +
        cacheCreationTokens * (price.cacheWrite ?? price.input) +
        entry.outputTokens * price.output) /
      1_000_000;

    entry.estimatedCostUsd = cost;
    estimatedCostUsd += cost;
    return entry;
  });

  models.sort(
    (left, right) =>
      right.inputTokens +
        right.outputTokens +
        right.cachedTokens -
        (left.inputTokens + left.outputTokens + left.cachedTokens) ||
      left.model.localeCompare(right.model)
  );

  return {
    records: records.filter((record) => !record.failed).length,
    inputTokens: models.reduce((sum, model) => sum + model.inputTokens, 0),
    outputTokens: models.reduce((sum, model) => sum + model.outputTokens, 0),
    cachedTokens: models.reduce((sum, model) => sum + model.cachedTokens, 0),
    estimatedCostUsd,
    unpricedTokens,
    models,
  };
}
