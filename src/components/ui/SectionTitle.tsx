import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
}

export function SectionTitle({ children, icon: Icon, action }: Props) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5 text-primary-light" />}
        <h2 className="font-display text-lg font-bold text-slate-100">
          {children}
        </h2>
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}