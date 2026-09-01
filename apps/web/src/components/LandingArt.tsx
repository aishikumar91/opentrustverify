const SIZE = {
  sm: "mx-auto w-full max-w-[160px] sm:max-w-[200px]",
  md: "mx-auto w-full max-w-[200px] sm:max-w-[240px]",
  lg: "mx-auto w-full max-w-[240px] sm:max-w-[280px]",
  wide: "mx-auto w-full max-w-[280px] sm:max-w-[340px]",
} as const;

export function LandingArt({
  src,
  alt,
  size = "md",
  className = "",
}: {
  src: string;
  alt: string;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={`${SIZE[size]} bg-transparent object-contain ${className}`}
    />
  );
}
