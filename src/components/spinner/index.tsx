import "./spinner.css";

type SpinnerSize = "sm" | "md" | "lg";

export interface SpinnerProps {
  size?: SpinnerSize | number;
  stroke?: number;
  className?: string;
}

export const Spinner = ({
  size = "md",
  stroke = 2,
  className = "",
}: SpinnerProps) => {
  const sizeMap: Record<SpinnerSize, number> = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  const numericSize =
    typeof size === "number" ? size : (sizeMap[size] ?? sizeMap.md);

  const lines = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 * Math.PI) / 180;
    const x1 = 12 + Math.sin(angle) * 6;
    const y1 = 12 - Math.cos(angle) * 6;
    const x2 = 12 + Math.sin(angle) * 10;
    const y2 = 12 - Math.cos(angle) * 10;
    return { x1, y1, x2, y2, delay: i * 0.0833 };
  });

  return (
    <svg
      width={numericSize}
      height={numericSize}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--border-level-2)"
      strokeWidth={stroke}
      strokeLinecap="round"
      className={`apple-spinner ${className}`.trim()}
    >
      <title>Loading...</title>
      {lines.map((line, i) => (
        <line
          key={`spinner-line-${i.toString()}`}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          className="spinner-line"
          style={{ animationDelay: `${line.delay}s` }}
        />
      ))}
    </svg>
  );
};
