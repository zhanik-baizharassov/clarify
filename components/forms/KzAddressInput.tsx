"use client";

type KzAddressInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** Kept for call-site compatibility; the field no longer queries a geocoder. */
  city?: string;
};

/** Plain address field (street and house number). */
export default function KzAddressInput({
  value,
  onChange,
  disabled,
  placeholder = "Например: проспект Абая 10",
  className = "h-11 w-full rounded-xl border px-3 disabled:opacity-60",
}: KzAddressInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      autoComplete="street-address"
      maxLength={200}
      className={className}
    />
  );
}
