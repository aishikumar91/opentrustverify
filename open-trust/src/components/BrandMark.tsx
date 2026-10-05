type BrandMarkProps = {
  size?: "sm" | "md" | "lg" | "hero";
  className?: string;
  as?: "span" | "h1" | "div";
};

const sizeClass: Record<NonNullable<BrandMarkProps["size"]>, string> = {
  sm: "text-xl tracking-[0.14em]",
  md: "text-3xl tracking-[0.16em] md:text-4xl",
  lg: "text-5xl tracking-[0.18em] md:text-6xl",
  hero: "text-6xl tracking-[0.2em] sm:text-7xl md:text-8xl",
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
      className={`brand-3gga inline-block font-brand uppercase leading-none ${sizeClass[size]} ${className}`}
      aria-label="3GGA"
    >
      3GGA
    </Tag>
  );
}
