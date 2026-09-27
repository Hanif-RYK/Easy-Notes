import { FileText } from "lucide-react";

export function Logo({ className = "h-14 w-14" }) {
  return (
    <div
      className={`flex items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 ${className}`}
    >
      <FileText className="h-1/2 w-1/2" strokeWidth={2} />
    </div>
  );
}
