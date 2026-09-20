"use client";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = () => {
    setLoading(true);
    fetch("/api/get-tickets")
      .then(res => res.json())
      .then(data => {
        setTickets(data.tickets || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchTickets(); }, []);

  const urgencyColor = (u: string) => {
    if (u === "High") return { border: "border-red-500", badge: "bg-red-100 text-red-700" };
    if (u === "Medium") return { border: "border-yellow-500", badge: "bg-yellow-100 text-yellow-700" };
    return { border: "border-green-500", badge: "bg-green-100 text-green-700" };
  };

  return (
    <div className="max-w-5xl mx-auto mt-10 p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Municipal Dispatch Dashboard</h1>
        <button onClick={fetchTickets} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 animate-pulse text-center py-12">Loading live tickets from AWS DynamoDB...</p>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-gray-500 text-lg">No tickets yet. Go to the home page to report an issue!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tickets.map((t, i) => {
            const colors = urgencyColor(t.urgency);
            return (
              <div key={i} className={`p-6 rounded-xl shadow-md bg-white border-l-8 ${colors.border}`}>
                <div className="flex justify-between items-start mb-3">
                  <span className="bg-gray-100 text-gray-800 text-xs font-bold px-3 py-1 rounded-full">{t.category}</span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${colors.badge}`}>{t.urgency} URGENCY</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.summary}</h3>
                <p className="text-sm text-gray-600 font-medium bg-gray-50 p-2 rounded mb-2">
                  📍 Routed to: <span className="text-blue-700 font-bold">{t.department}</span>
                </p>
                <div className="flex justify-between items-center text-xs text-gray-400 mt-3">
                  <span>🤖 {t.aiSource === "aws-bedrock-nova-lite" ? "AWS Bedrock AI" : t.aiSource === "smart-fallback" ? "Smart Fallback AI" : "AI Processed"}</span>
                  <span className="text-green-600 font-bold">● DISPATCHED</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
