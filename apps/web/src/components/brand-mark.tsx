import { HeartPulse } from "lucide-react";

export function BrandMark() {
  return (
    <div className="brand" aria-label="Nowshera Family Clinic">
      <span className="brand-icon"><HeartPulse size={20} strokeWidth={1.8} /></span>
      <span className="brand-copy">
        <strong>Nowshera</strong>
        <span>Family Clinic</span>
      </span>
    </div>
  );
}
