import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * A premium, multi-field prompt modal with glassmorphic styling and kinetic animations.
 * @param {boolean} isOpen - Whether the modal is visible.
 * @param {function} onClose - Callback to close the modal.
 * @param {function} onSubmit - Callback when the form is submitted (receives an object of values).
 * @param {string} title - The title displayed at the top.
 * @param {Array} fields - Array of field objects: { name, label, type, initialValue, placeholder }.
 * @param {string} submitLabel - Label for the primary button.
 */
const PromptModal = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  fields = [],
  submitLabel = "Submit",
}) => {
  const [values, setValues] = useState({});
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Initialize values from fields
      const initialValues = {};
      fields.forEach((f) => {
        initialValues[f.name] = f.initialValue || "";
      });
      setValues(initialValues);

      // Focus first input
      setTimeout(() => {
        if (firstInputRef.current) {
          firstInputRef.current.focus();
          firstInputRef.current.select();
        }
      }, 100);
    }
  }, [isOpen, fields]);

  const handleChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const handleSubmit = () => {
    // Validate: only enforce non-empty for fields that aren't marked optional
    const isComplete = fields.every((f) => {
      if (f.required === false) return true; // optional fields always pass
      return String(values[f.name] ?? "").trim() !== "";
    });
    if (!isComplete) return;

    onSubmit(values);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {fields.map((field, idx) => (
            <div className="modal-field" key={field.name}>
              <label htmlFor={field.name}>{field.label}</label>
              {field.type === "select" ? (
                <select
                  id={field.name}
                  className="modal-input modal-select"
                  value={values[field.name] ?? ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                >
                  {(field.options || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={field.name}
                  ref={idx === 0 ? firstInputRef : null}
                  type={field.type || "text"}
                  value={values[field.name] || ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  placeholder={field.placeholder || ""}
                  className="modal-input"
                  autoComplete="off"
                />
              )}
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button className="modal-btn modal-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="modal-btn modal-btn-primary"
            onClick={handleSubmit}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptModal;
