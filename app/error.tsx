'use client';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-4">
      <div className="text-9xl mb-4">🛌😵</div>
      <h1 className="text-4xl font-extrabold text-gray-900 mb-2">System thak gaya hai (Error!)</h1>
      <p className="text-lg text-gray-600 mb-8">{error.message || "An unexpected network or system error occurred."}</p>
      <button onClick={() => reset()} className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 transition">
        Utho aur Try Again
      </button>
    </div>
  );
}
