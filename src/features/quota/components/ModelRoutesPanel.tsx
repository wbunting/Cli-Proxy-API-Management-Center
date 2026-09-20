import type { ModelRoute } from '@/services/api';
import styles from './ModelRoutesPanel.module.scss';

type Props = {
  routes: ModelRoute[];
  loading: boolean;
  error: string;
};

const pct = (value?: number) => `${Math.round((value ?? 0) * 100)}%`;
const compact = (value: number) =>
  new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);

function RouteCards({ routes }: { routes: ModelRoute[] }) {
  return (
    <div className={styles.grid}>
      {routes.map((route) => (
        <article className={styles.card} key={route.alias}>
          <div className={styles.cardHead}>
            <div>
              <span className={styles.kind}>{route.kind}</span>
              <h3>{route.display_name || route.alias}</h3>
              <code>{route.alias}</code>
            </div>
            <div className={styles.remaining}>
              <strong>
                {route.aggregate_remaining_known ? pct(route.aggregate_remaining) : '—'}
              </strong>
              <span>aggregate remaining</span>
            </div>
          </div>

          <div className={styles.routeSummary}>
            <div>
              <span>Active</span>
              <strong>{route.active?.model ?? 'No available model'}</strong>
              <small>{route.active?.provider ?? 'unavailable'}</small>
            </div>
            <span className={styles.arrow}>→</span>
            <div>
              <span>Next</span>
              <strong>{route.next?.model ?? 'End of route'}</strong>
              <small>{route.next?.provider ?? '—'}</small>
            </div>
          </div>

          <div className={styles.members}>
            {route.members.map((member, index) => (
              <div className={styles.member} key={`${member.provider}:${member.model}`}>
                <span className={styles.rank}>{index + 1}</span>
                <div className={styles.memberName}>
                  <strong>{member.model}</strong>
                  <small>{member.provider}</small>
                </div>
                <span className={member.available ? styles.available : styles.cooling}>
                  {member.available ? 'ready' : 'cooling'}
                </span>
                <span className={styles.memberQuota}>
                  {member.quota_known ? pct(member.quota_remaining) : 'quota —'}
                  {member.quota_known && (member.quota_capacity ?? 0) > 1
                    ? ` · ${member.quota_capacity}× cap`
                    : ''}
                </span>
                <span className={styles.usage}>
                  {compact(member.requests)} req ·{' '}
                  {compact(member.input_tokens + member.output_tokens)} tok
                </span>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

export function ModelRoutesPanel({ routes, loading, error }: Props) {
  const tiers = routes.filter((route) => route.kind === 'tier');
  const roles = routes.filter((route) => route.kind === 'role');

  if (loading && routes.length === 0) {
    return <section className={styles.panel}>Loading tier quota and role routes…</section>;
  }

  return (
    <section className={styles.panel} aria-label="Role and tier routing">
      <div className={styles.headingRow}>
        <div>
          <p className={styles.eyebrow}>Routing pools</p>
          <h2 className={styles.title}>Quota by tier</h2>
        </div>
        <span className={styles.count}>{routes.length} routes</span>
      </div>
      <p className={styles.description}>
        Tier capacity sits below the provider quota cards. Remaining quota is capacity-weighted
        across known plans—for example, Max 20× contributes four times as much as Max 5×. Role
        routes follow with the current model, next fallback, and retained usage.
      </p>
      {error ? <div className={styles.error}>{error}</div> : null}
      {routes.length === 0 ? (
        <div className={styles.empty}>No role-* or tier-* aliases are configured.</div>
      ) : (
        <>
          {tiers.length > 0 ? <RouteCards routes={tiers} /> : null}
          {roles.length > 0 ? (
            <div className={styles.roleSection}>
              <div className={styles.subheading}>
                <h3>Role routes</h3>
                <span>{roles.length} roles</span>
              </div>
              <RouteCards routes={roles} />
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
