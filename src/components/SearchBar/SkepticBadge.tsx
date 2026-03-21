import React from 'react';
import { Shield, ShieldCheck, ShieldAlert } from 'lucide-react';

interface SkepticBadgeProps {
  state?: 'verified' | 'unverified' | 'unknown' | string;
  size?: number;
}

export const SkepticBadge: React.FC<SkepticBadgeProps> = ({ state, size = 14 }) => {
  if (!state || state === 'unknown') return null;

  const config = {
    verified: {
      icon: ShieldCheck,
      color: 'var(--tokyo-green)',
      title: 'Verified by Repo Intelligence (Static Analysis Match)',
    },
    unverified: {
      icon: ShieldAlert,
      color: 'var(--tokyo-red)',
      title: 'Unverified: Documentation mismatch or missing implementation evidence',
    },
  }[state as 'verified' | 'unverified'] || {
    icon: Shield,
    color: 'var(--tokyo-comment)',
    title: `Audit Status: ${state}`,
  };

  const Icon = config.icon;

  return (
    <span 
      className={`skeptic-badge state-${state}`} 
      title={config.title}
      style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '6px', color: config.color, verticalAlign: 'middle' }}
    >
      <Icon size={size} />
    </span>
  );
};
