import fullLogo from "../../uSign_logo.png";
import { cn } from "@/lib/utils";

const logoSizes = {
  sm: "h-12 w-auto max-w-full object-contain",
  lg: "h-16 w-auto max-w-full object-contain sm:h-20",
} as const;

export function Logo({
  className,
  size = "lg",
}: {
  className?: string;
  size?: keyof typeof logoSizes;
}) {
  return (
    <div className={cn("flex items-center", className)}>
      <img src={fullLogo} alt="Usign" className={logoSizes[size]} />
    </div>
  );
}
