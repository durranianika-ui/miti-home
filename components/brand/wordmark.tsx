import { cn } from "@/lib/utils";

/**
 * The Miti Home wordmark, set in Montserrat Light with the signature gold
 * three-bar "E" and optional "Luxury Living" lock-up (per the brand board).
 * Rendered as live text + SVG so it stays crisp at every size and in both
 * themes; the bars use the brand gold in light and dark mode.
 */

function GoldE({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 10 12"
      aria-hidden="true"
      className={cn("inline-block h-[0.72em] w-[0.62em] fill-brand align-baseline", className)}
    >
      <rect x="0" y="0" width="10" height="1.4" />
      <rect x="0" y="5.3" width="10" height="1.4" />
      <rect x="0" y="10.6" width="10" height="1.4" />
    </svg>
  );
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 10 12" aria-hidden="true" className={cn("h-4 w-4 fill-brand", className)}>
      <rect x="0" y="0" width="10" height="1.4" />
      <rect x="0" y="5.3" width="10" height="1.4" />
      <rect x="0" y="10.6" width="10" height="1.4" />
    </svg>
  );
}

export function Wordmark({
  variant = "horizontal",
  withTagline = false,
  className,
}: {
  variant?: "horizontal" | "stacked";
  withTagline?: boolean;
  className?: string;
}) {
  const letters = "font-heading font-light uppercase text-foreground";

  if (variant === "stacked") {
    return (
      <span className={cn("inline-flex flex-col items-center", className)}>
        <span className="sr-only">Miti Home — Luxury Living</span>
        <span aria-hidden="true" className={cn(letters, "tracking-[0.62em] pl-[0.62em] leading-none")}>MITI</span>
        <span aria-hidden="true" className={cn(letters, "mt-[0.45em] tracking-[0.62em] pl-[0.62em] leading-none")}>
          HOM<GoldE />
        </span>
        {withTagline && (
          <span aria-hidden="true" className="mt-[0.9em] flex w-full flex-col items-center gap-[0.6em]">
            <span className="brand-rule w-full text-[0.28em]">
              <span className="h-[0.9em] w-[0.9em] rotate-45 bg-brand" />
            </span>
            <span className="font-heading text-[0.3em] font-normal uppercase tracking-[0.45em] pl-[0.45em] text-brand-strong">
              Luxury Living
            </span>
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex flex-col items-center", className)}>
      <span className="sr-only">Miti Home</span>
      <span aria-hidden="true" className={cn(letters, "whitespace-nowrap tracking-[0.42em] pl-[0.42em] leading-none")}>
        MITI&nbsp;&nbsp;HOM<GoldE />
      </span>
      {withTagline && (
        <span aria-hidden="true" className="mt-[0.55em] font-heading text-[0.34em] font-normal uppercase tracking-[0.5em] pl-[0.5em] text-brand-strong">
          Luxury Living
        </span>
      )}
    </span>
  );
}
