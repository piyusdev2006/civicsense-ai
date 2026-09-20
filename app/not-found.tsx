import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-4">
      <div className="text-9xl mb-4">🐶😢</div>
      <h1 className="text-4xl font-extrabold text-gray-900 mb-2">404 - Not Found</h1>
      <p className="text-lg text-gray-600 mb-8">Arre yaar, ye page yahan nahi hai! (The page you are looking for doesn't exist.)</p>
      <Link href="/" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition">
        Go Back Home
      </Link>
    </div>
  );
}
