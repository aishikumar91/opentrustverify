type BrandMarkProps = {
  size?: "sm" | "md" | "lg" | "hero";
  className?: string;
  as?: "span" | "h1" | "div";
};

const sizeClass: Record<NonNullable<BrandMarkProps["size"]>, string> = {
  sm: "text-xl tracking-[0.12em]",
  md: "text-3xl tracking-[0.14em] sm:tracking-[0.16em] md:text-4xl",
  /* Mobile: smaller type + tighter tracking so the wordmark fits 320–430px without crowding */
  lg: "text-4xl tracking-[0.12em] min-[400px]:text-5xl min-[400px]:tracking-[0.16em] md:text-6xl md:tracking-[0.18em]",
  hero: "text-5xl tracking-[0.14em] sm:text-7xl sm:tracking-[0.2em] md:text-8xl",
};

/**
 * 3GGA wordmark — dimensional red lettering for dark admin surfaces.
 */
export default function BrandMark({
  size = "md",
  className = "",
  as: Tag = "span",
}: BrandMarkProps) {
  return (
    <Tag
      className={`brand-3gga inline-block max-w-full font-brand uppercase leading-none ${sizeClass[size]} ${className}`}
      aria-label="3GGA"
    >
      3GGA
    </Tag>
  );
}
