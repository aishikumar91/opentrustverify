export function LandingArt({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={`w-full bg-transparent object-contain ${className}`}
    />
  );
}
