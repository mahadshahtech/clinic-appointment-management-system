import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, subtitle, icon: Icon, action }: { eyebrow: string; title: string; subtitle?: string; icon?: LucideIcon; action?: ReactNode }) {
  return <header className="page-header"><div className="portal-title"><p>{Icon&&<Icon size={14}/>} {eyebrow}</p><h1>{title}</h1>{subtitle&&<span>{subtitle}</span>}</div>{action&&<div className="page-header-action">{action}</div>}</header>;
}
