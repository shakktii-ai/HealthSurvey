/**
 * Reusable Badge component for phase labels, status indicators, and tags.
 */
export default function Badge({
  children,
  variant = "neutral",
  size = "md",
  className = "",
  ...props
}) {
  const baseStyles =
    "inline-flex items-center font-medium rounded-full transition-colors";

  const variants = {
    neutral: "bg-slate-100 text-slate-700 border border-slate-200",
    primary: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    success: "bg-emerald-100 text-emerald-800 border border-emerald-300",
    warning: "bg-amber-50 text-amber-800 border border-amber-200",
    danger: "bg-rose-50 text-rose-700 border border-rose-200",
    info: "bg-sky-50 text-sky-700 border border-sky-200",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  const variantClass = variants[variant] || variants.neutral;
  const sizeClass = sizes[size] || sizes.md;

  return (
    <span
      className={`${baseStyles} ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
