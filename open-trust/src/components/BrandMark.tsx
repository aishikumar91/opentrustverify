import { withBasePath } from "../lib/basePath";

type BrandMarkProps = {
  size?: "sm" | "md" | "lg" | "hero";
  className?: string;
  as?: "span" | "h1" | "div";
};

const heightClass: Record<NonNullable<BrandMarkProps["size"]>, string> = {
  sm: "h-7 max-h-7",
  md: "h-10 max-h-10",
  lg: "h-12 max-h-12 sm:h-14 sm:max-h-14",
  hero: "h-20 max-h-20 sm:h-24 sm:max-h-24",
};

/**
 * 3GGA system logo — stacked lime lockup with tagline (public/logo.png).
 * Single mark everywhere; theme-proof (transparent PNG, outlined glyphs).
 */
export default function BrandMark({
  size = "md",
  className = "",
  as: Tag = "span",
}: BrandMarkProps) {
  return (
    <Tag className={`inline-block max-w-full shrink-0 leading-none ${className}`} aria-label="3GGA">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={withBasePath("/logo.png")}
        alt="3GGA — Live on chain fraud opsec"
        width={1000}
        height={640}
        className={`w-auto max-w-[42vw] object-contain object-left sm:max-w-none ${heightClass[size]}`}
      />
    </Tag>
  );
}
