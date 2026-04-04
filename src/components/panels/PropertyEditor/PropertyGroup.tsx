import React, { useCallback, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface PropertyGroupProps {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export const PropertyGroup: React.FC<PropertyGroupProps> = ({
  title,
  defaultExpanded = true,
  children,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const handleToggle = useCallback(() => {
    setIsExpanded((current) => !current);
  }, []);

  return (
    <div className="property-group">
      <button
        type="button"
        className="property-group__header"
        onClick={handleToggle}
        aria-expanded={isExpanded}
      >
        <span className="property-group__title">{title}</span>
        <span className="property-group__toggle">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>
      {isExpanded && <div className="property-group__content">{children}</div>}
    </div>
  );
};
