import { Droplets, Wifi, Zap } from "lucide-react";

export type ResourceKind = "water" | "electricity" | "internet";

const map = {
  water: { Icon: Droplets, color: "#1B6CA8" },
  electricity: { Icon: Zap, color: "#F5A623" },
  internet: { Icon: Wifi, color: "#00C9A7" },
} as const;

export function ResourceIcon({
  resource,
  size = 18,
}: {
  resource: ResourceKind;
  size?: number;
}) {
  const { Icon, color } = map[resource];
  return <Icon size={size} color={color} />;
}