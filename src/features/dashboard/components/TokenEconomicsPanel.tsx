import { formatCompactNumber } from '@/utils/format';
import type { TokenEconomics } from '../tokenEconomics';
import styles from './TokenEconomicsPanel.module.scss';

type Props = {
  economics: TokenEconomics | null;
  loading: boolean;
  error: string;
};

const formatUsd = (value: number): string => {
  if (!Number.isFinite(value)) return '—';
  const digits = value >= 100 ? 0 : value >= 1 ? 2 : 4;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: digits,
    minimumFractionDigits: value >= 100 ? 0 : Math.min(2, digits),
  }).format(value);
};

export function TokenEconomicsPanel({ economics, loading, error }: Props) {
  if (loading && !economics) {
    return <div className={styles.loading}>Loading retained token usage…</div>;
  }

  if (!economics) {
    return <div className={styles.loading}>{error || 'No retained usage is available.'}</div>;
  }

  const maxTokens = Math.max(
    1,
    ...economics.models.map((model) => model.inputTokens + model.outputTokens)
  );

  return (
    <div className={styles.root}>
      {error ? <div className={styles.error}>{error}</div> : null}
      <div className={styles.summary} aria-label="Token and estimated API cost totals">
        <div>
          <span>Input</span>
          <strong>{formatCompactNumber(economics.inputTokens)}</strong>
          <small>tokens</small>
        </div>
        <div>
          <span>Output</span>
          <strong>{formatCompactNumber(economics.outputTokens)}</strong>
          <small>tokens</small>
        </div>
        <div>
          <span>Cached</span>
          <strong>{formatCompactNumber(economics.cachedTokens)}</strong>
          <small>reported tokens</small>
        </div>
        <div>
          <span>API equivalent</span>
          <strong>{formatUsd(economics.estimatedCostUsd)}</strong>
          <small>base sticker rates</small>
        </div>
      </div>

      <div className={styles.bars}>
        <div className={styles.legend}>
          <span>
            <i className={styles.inputKey} />
            Input
          </span>
          <span>
            <i className={styles.outputKey} />
            Output
          </span>
        </div>
        <div className={styles.rows}>
          {economics.models.map((model) => (
            <div className={styles.row} key={model.model}>
              <span className={styles.model} title={model.model}>
                {model.model}
              </span>
              <div className={styles.track} aria-hidden="true">
                <span
                  className={styles.inputBar}
                  style={{ width: `${(model.inputTokens / maxTokens) * 100}%` }}
                />
                <span
                  className={styles.outputBar}
                  style={{ width: `${(model.outputTokens / maxTokens) * 100}%` }}
                />
              </div>
              <span>{formatCompactNumber(model.inputTokens)} in</span>
              {model.cachedTokens > 0 ? (
                <span>{formatCompactNumber(model.cachedTokens)} cached</span>
              ) : null}
              <span>{formatCompactNumber(model.outputTokens)} out</span>
              <b>
                {model.estimatedCostUsd === null ? 'unpriced' : formatUsd(model.estimatedCostUsd)}
              </b>
            </div>
          ))}
        </div>
      </div>

      <p className={styles.note}>
        Estimate uses public base API prices, not your subscription charge. Cache reads and writes
        use published cache rates so cached context is comparable across models. Batch,
        long-context, tool, and regional modifiers are excluded.
        {economics.unpricedTokens > 0
          ? ` ${formatCompactNumber(economics.unpricedTokens)} tokens use models without a published matching API rate.`
          : ''}
      </p>
    </div>
  );
}
