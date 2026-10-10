import { withBasePath } from "../lib/basePath";

type BrandMarkProps = {
  size?: "sm" | "md" | "lg" | "hero";
  className?: string;
  as?: "span" | "h1" | "div";
};

/** Tall stacked lockup (430×580). Size by height so the tagline stays legible. */
const heightClass: Record<NonNullable<BrandMarkProps["size"]>, string> = {
  sm: "h-9 max-h-9 sm:h-10 sm:max-h-10",
  md: "h-14 max-h-14 sm:h-16 sm:max-h-16",
  lg: "h-20 max-h-20 sm:h-24 sm:max-h-24",
  hero: "h-28 max-h-28 sm:h-36 sm:max-h-36 md:h-44 md:max-h-44",
};

/**
 * 3GGA system logo — stacked lime lockup + tagline (public/logo.png, transparent).
 * Single mark everywhere; drop-shadow keeps neon glyphs readable on light chrome.
 */
export default function BrandMark({
  size = "md",
  className = "",
  as: Tag = "span",
}: BrandMarkProps) {
  return (
    <Tag className={`brand-mark inline-block max-w-full shrink-0 leading-none ${className}`} aria-label="3GGA">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={withBasePath("/logo.png")}
        alt="3GGA — Live on chain fraud opsec"
        width={430}
        height={580}
        decoding="async"
        className={`brand-mark-img h-auto w-auto max-w-[28vw] object-contain object-left sm:max-w-[160px] md:max-w-none ${heightClass[size]}`}
      />
    </Tag>
  );
}
