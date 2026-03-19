import React from 'react';
import { Compass, Languages } from 'lucide-react';

type UiLocale = 'en' | 'zh';

interface ToolbarProps {
  discoveryOpen: boolean;
  locale: UiLocale;
  onDiscoveryToggle: () => void;
  onLocaleToggle: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  discoveryOpen,
  locale,
  onDiscoveryToggle,
  onLocaleToggle,
}) => {
  const discoveryLabel = locale === 'zh' ? '探索' : 'Discovery';
  const localeToggleLabel = locale === 'zh' ? '切换语言' : 'Toggle language';
  const getButtonClassName = (active = false) =>
    ['btn', 'toolbar-btn', 'neon-glow--blue', active ? 'toolbar-btn--active animate-breathe' : '']
      .filter(Boolean)
      .join(' ');

  return (
    <>
      <div className="toolbar-divider" />

      <button
        type="button"
        className={getButtonClassName(discoveryOpen)}
        onClick={onDiscoveryToggle}
        aria-pressed={discoveryOpen}
      >
        <Compass size={14} />
        {discoveryLabel}
      </button>

      <div className="toolbar-spacer" />

      <button
        type="button"
        className={getButtonClassName(locale !== 'en')}
        onClick={onLocaleToggle}
        title={locale === 'en' ? 'Switch to Chinese' : '切换到英文'}
        aria-label={localeToggleLabel}
      >
        <Languages size={14} />
        {locale === 'en' ? 'EN' : '中文'}
      </button>
    </>
  );
};
