import React, { useCallback } from "react";

interface PropertyFieldProps {
  label: string;
  value: string | number;
  type?: "text" | "number" | "textarea";
  disabled?: boolean;
  placeholder?: string;
  onChange?: (value: string) => void;
}

export const PropertyField: React.FC<PropertyFieldProps> = ({
  label,
  value,
  type = "text",
  disabled = false,
  placeholder,
  onChange,
}) => {
  const inputClass = `property-field__input ${type === "textarea" ? "property-field__input--textarea" : ""} ${type === "number" ? "property-field__input--number" : ""}`;
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange?.(event.target.value);
    },
    [onChange],
  );

  if (type === "textarea") {
    return (
      <div className="property-field">
        <label className="property-field__label">{label}</label>
        <textarea
          className={inputClass}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={handleChange}
        />
      </div>
    );
  }

  return (
    <div className="property-field">
      <label className="property-field__label">{label}</label>
      <input
        type={type}
        className={inputClass}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={handleChange}
      />
    </div>
  );
};
