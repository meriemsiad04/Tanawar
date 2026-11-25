import Icon from "../uiC/Icon.jsx";

/** Read-only star rating (0–5, fractions supported). `size` is an Icon size. */
export default function RatingStars({ value = 0, size = "sm" }) {
  const v = Math.min(5, Math.max(0, Number(value) || 0));
  return (
    <span role="img" aria-label={`${v.toFixed(1)} out of 5`} className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.min(1, Math.max(0, v - i)) * 100;
        return (
          <span key={i} className="relative inline-flex" aria-hidden="true">
            <Icon name="star" size={size} className="text-line-strong" />
            <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill}%` }}>
              <Icon name="star" size={size} className="fill-highlight text-highlight" />
            </span>
          </span>
        );
      })}
    </span>
  );
}
