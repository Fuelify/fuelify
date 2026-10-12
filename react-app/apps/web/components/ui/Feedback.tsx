import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { LogoMark } from './Brand';

export function EmptyState({ icon, title, children, action }: { icon: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} /></div>
      <h3>{title}</h3>
      {children && <p className="small">{children}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

export function Spinner() {
  return <div className="spinner" role="status" aria-label="Loading" />;
}

/** Page or section loading: the logo, gently pulsing. */
export function LoadingBlock() {
  return (
    <div className="center-fill" role="status" aria-label="Loading">
      <span className="brand-loader"><LogoMark size={56} title="" /></span>
    </div>
  );
}
