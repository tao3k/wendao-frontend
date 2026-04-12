import React from "react";

interface StructuredSlotProps {
  id: string;
  title: string;
  subtitle?: string;
  className?: string;
  bodyClassName?: string;
  panelOrder?: number;
  children: React.ReactNode;
}

export const StructuredSlot: React.FC<StructuredSlotProps> = ({
  id,
  title,
  subtitle,
  className,
  bodyClassName,
  panelOrder,
  children,
}) => {
  return (
    <section
      id={id}
      className={className ? `structured-slot ${className}` : "structured-slot"}
      data-panel-order={panelOrder}
      role="region"
      aria-labelledby={`${id}-title`}
      aria-describedby={subtitle ? `${id}-subtitle` : undefined}
    >
      <header className="structured-slot__header">
        <div className="structured-slot__title" id={`${id}-title`}>
          {title}
        </div>
        {subtitle && (
          <div className="structured-slot__subtitle" id={`${id}-subtitle`}>
            {subtitle}
          </div>
        )}
      </header>
      <div
        className={
          bodyClassName ? `structured-slot__body ${bodyClassName}` : "structured-slot__body"
        }
      >
        {children}
      </div>
    </section>
  );
};
