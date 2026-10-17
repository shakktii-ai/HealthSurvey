/**
 * Reusable Input component following Emerald/Slate design system.
 */
export default function Input({
  type = "text",
  className = "",
  error = false,
  ...props
}) {
  return (
    <input
      type={type}
      className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 ${
        error
          ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
          : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20"
      } disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  );
}
