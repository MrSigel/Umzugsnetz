import { Suspense } from 'react';
import PasswortZuruecksetzenClient from './PasswortZuruecksetzenClient';

export default function PasswortZuruecksetzenPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <PasswortZuruecksetzenClient />
    </Suspense>
  );
}
