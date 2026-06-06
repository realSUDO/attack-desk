type MaterialIconProps = {
  name: string;
  size?: number | string;
  className?: string;
  filled?: boolean;
  style?: React.CSSProperties;
};

export function MaterialIcon({
  name,
  size = 18,
  className,
  filled = false,
  style,
}: MaterialIconProps) {
  const fontSize = typeof size === "number" ? `${size}px` : size;
  return (
    <span
      className={`material-symbols-outlined ${className ?? ""}`}
      style={{
        fontSize,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
        ...style,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
