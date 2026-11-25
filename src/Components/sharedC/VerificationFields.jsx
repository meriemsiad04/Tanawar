import { forwardRef } from "react";
import Icon from "../uiC/Icon.jsx";
import Input from "../uiC/Input.jsx";
import DocumentDropzone from "./DocumentDropzone.jsx";
import { DOCUMENT_TYPES } from "../../services/verificationService.js";

/**
 * Full name + matricule + document type + document upload.
 * Controlled: `values` ({ fullName, matricule, documentType, document }), `errors` (already filtered to touched fields),
 * `onChange(field, value)`, `onBlur(field)`. The ref goes to the full-name input.
 */
const VerificationFields = forwardRef(function VerificationFields({ values, errors, onChange, onBlur, disabled = false }, ref) {
  return (
    <div className="flex flex-col gap-4">
      <Input
        ref={ref}
        label="Full name *"
        icon="user"
        name="fullName"
        autoComplete="name"
        placeholder="e.g. Amina Belkacem"
        maxLength={80}
        value={values.fullName}
        onChange={(e) => onChange("fullName", e.target.value)}
        onBlur={() => onBlur("fullName")}
        error={errors.fullName}
        disabled={disabled}
        required
      />

      <Input
        label="Student ID (matricule) *"
        icon="idCard"
        name="matricule"
        inputMode="numeric"
        autoComplete="off"
        placeholder="e.g. 202131012345"
        maxLength={14}
        value={values.matricule}
        onChange={(e) => onChange("matricule", e.target.value.replace(/\s+/g, ""))}
        onBlur={() => onBlur("matricule")}
        error={errors.matricule}
        disabled={disabled}
        required
      />

      <fieldset className="flex flex-col gap-1.5" disabled={disabled}>
        <legend className="mb-1.5 text-[13px] font-bold leading-[18px] text-fg">Proof of enrollment *</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {DOCUMENT_TYPES.map((t) => {
            const checked = values.documentType === t.value;
            return (
              <label
                key={t.value}
                className={[
                  "flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary/15",
                  checked ? "border-primary bg-primary-soft" : "border-line-strong bg-surface hover:border-fg-3",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="documentType"
                  value={t.value}
                  checked={checked}
                  onChange={() => onChange("documentType", t.value)}
                  className="sr-only"
                />
                <Icon name={t.icon} size="sm" className={checked ? "text-primary-text" : "text-fg-3"} />
                <span className="flex flex-col">
                  <span className="text-[13px] font-bold leading-[18px] text-fg">{t.label}</span>
                  <span className="text-xs leading-4 text-fg-3">{t.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <DocumentDropzone
        label={values.documentType === "enrollment_certificate" ? "Upload your certificate of enrollment" : "Upload a photo of your student card"}
        file={values.document}
        onChange={(file) => onChange("document", file)}
        onBlur={() => onBlur("document")}
        error={errors.document}
        disabled={disabled}
        required
      />

      <p className="flex items-start gap-2 text-xs leading-4 text-fg-3">
        <Icon name="lock" size="sm" className="!size-3.5 mt-px" />
        Your document is stored privately and only TANAWAR administrators can see it, to confirm you are a UMBB student.
      </p>
    </div>
  );
});

export default VerificationFields;
