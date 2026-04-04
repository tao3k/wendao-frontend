import React from "react";
import { Shield, ShieldCheck, ShieldAlert } from "lucide-react";

interface SkepticBadgeProps {
  state?: "verified" | "unverified" | "unknown" | string;
  size?: number;
}

const SKEPTIC_BADGE_BASE_STYLE = Object.freeze({
  display: "inline-flex",
  alignItems: "center",
  marginLeft: "6px",
  verticalAlign: "middle",
});

function getSkepticBadgeConfig(state: string) {
  switch (state) {
    case "verified":
      return {
        icon: ShieldCheck,
        color: "var(--tokyo-green)",
        title: "Verified by Repo Intelligence (Static Analysis Match)",
      };
    case "unverified":
      return {
        icon: ShieldAlert,
        color: "var(--tokyo-red)",
        title: "Unverified: Documentation mismatch or missing implementation evidence",
      };
    default:
      return {
        icon: Shield,
        color: "var(--tokyo-comment)",
        title: `Audit Status: ${state}`,
      };
  }
}

export const SkepticBadge: React.FC<SkepticBadgeProps> = ({ state, size = 14 }) => {
  if (!state || state === "unknown") return null;

  const config = getSkepticBadgeConfig(state);
  const Icon = config.icon;
  const style = React.useMemo(
    () => ({ ...SKEPTIC_BADGE_BASE_STYLE, color: config.color }),
    [config.color],
  );

  return (
    <span className={`skeptic-badge state-${state}`} title={config.title} style={style}>
      <Icon size={size} />
    </span>
  );
};
