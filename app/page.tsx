'use client';

import dynamic from 'next/dynamic';

const BrickBreaker = dynamic(() => import('@/components/brick-breaker'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-4">
      <div className="text-2xl font-light tracking-wide backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl px-8 py-4">
        LOADING GAME...
      </div>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="min-h-screen bg-black">
      <BrickBreaker />
    </main>
  );
}
