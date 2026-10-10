'use client';

import { useRouter } from 'next/navigation';
import { Icon, PageHeader } from '@/components/ui';
import { HouseholdManager } from '@/features/household/HouseholdManager';

export default function HouseholdPage() {
  const router = useRouter();
  return (
    <>
      <PageHeader
        title="Household"
        left={
          <button className="icon-btn" aria-label="Back" onClick={() => router.back()}>
            <Icon name="chevronLeft" />
          </button>
        }
      />
      <div className="screen-scroll">
        <div className="screen-pad" style={{ paddingTop: 4, paddingBottom: 32 }}>
          <HouseholdManager />
        </div>
      </div>
    </>
  );
}
