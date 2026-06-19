import type { LucideIcon } from "lucide-react";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { EmptyState } from "@/components/ui/EmptyState";

export function PlaceholderPage({
  icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-5xl">
      <SectionTitle icon={icon}>{title}</SectionTitle>
      <p className="mb-6 text-sm text-slate-400">{description}</p>
      <EmptyState
        icon={icon}
        title="Coming in next phase"
        description="This module will be wired up in the next build phase. Foundation is ready."
      />
    </div>
  );
}