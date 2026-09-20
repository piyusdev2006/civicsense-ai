"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, CheckCircle2 } from "lucide-react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Please upload a photo!");
    
    setLoading(true);
    try {
      const imageBase64 = await toBase64(file);
      const res = await fetch("/api/process-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, description }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/dashboard");
      } else {
        alert("Error from server: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Failed to analyze. Try again.");
    }
    setLoading(false);
  };

  return (
    <main className="max-w-2xl mx-auto mt-12 p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Report a Civic Issue</h1>
      <p className="text-gray-500 mb-8">Take a photo of a pothole, garbage dump, or broken light. AWS Bedrock AI will instantly categorize and route it to the right municipal department.</p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <label className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition cursor-pointer flex flex-col items-center block relative overflow-hidden">
          {file ? (
            <img src={URL.createObjectURL(file)} alt="Preview" className="max-h-48 object-contain mb-2 rounded" />
          ) : (
            <>
              <UploadCloud className="mx-auto h-12 w-12 text-gray-400 mb-4 mt-4" />
              <span className="text-gray-600 font-medium mb-2">Click to select a photo</span>
            </>
          )}
          <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded shadow-sm">{file ? file.name : "PNG, JPG up to 5MB"}</span>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" required />
        </label>
        
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">Description (Any Language)</label>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} 
            placeholder="Yahan 4 din se kachra pada hai..." 
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white" required />
        </div>
        
        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-4 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2">
          {loading ? "AWS Bedrock Analyzing..." : <><CheckCircle2 /> Submit Grievance</>}
        </button>
      </form>
    </main>
  );
}
