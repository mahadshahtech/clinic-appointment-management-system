import type { LucideIcon } from "lucide-react";

export function ProfileInfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value?: string | null | undefined }) {
  return <div className="profile-info-row"><span className="profile-info-icon"><Icon size={17}/></span><div><small>{label}</small><strong>{value?.trim()||"Not added"}</strong></div></div>;
}
