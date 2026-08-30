import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm";

function variantClass(variant: Variant): string {
  switch (variant) {
    case "primary":
      return "otv-btn otv-btn-dark";
    case "secondary":
      return "otv-btn otv-btn-border";
    case "ghost":
      return "otv-btn-ghost";
    case "danger":
      return "otv-btn otv-btn-danger";
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}

function sizeClass(size: Size): string {
  switch (size) {
    case "sm":
      return "otv-btn-sm";
    case "md":
      return "";
    default: {
      const _exhaustive: never = size;
      return _exhaustive;
    }
  }
}

function usesFace(variant: Variant): boolean {
  return variant === "primary" || variant === "secondary" || variant === "danger";
}

export function BtnText({ children }: { children: ReactNode }) {
  return (
    <span className="otv-btn-face">
      <small>{children}</small>
      <small aria-hidden>{children}</small>
    </span>
  );
}

export function buttonClassName(variant: Variant = "primary", className?: string, size: Size = "md") {
  return clsx(variantClass(variant), sizeClass(size), className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button className={buttonClassName(variant, className, size)} {...props}>
      {usesFace(variant) ? <BtnText>{children}</BtnText> : children}
    </button>
  );
}
