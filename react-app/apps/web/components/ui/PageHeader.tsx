import type { ReactNode } from 'react';

export function PageHeader({ title, sub, left, right }: { title: string; sub?: ReactNode; left?: ReactNode; right?: ReactNode }) {
  return (
    <header className="page-header">
      {left}
      <div className="grow">
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {right}
    </header>
  );
}
