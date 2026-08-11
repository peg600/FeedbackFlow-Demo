import Image from "next/image";

import { iconPaths } from "@/lib/icons";
import { cn } from "@/lib/utils";

type BrandProps = {
  className?: string;
  inverse?: boolean;
};

export function Brand({ className, inverse = false }: BrandProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        alt=""
        aria-hidden="true"
        height={32}
        src={iconPaths.logoMark}
        width={32}
      />
      <span
        className={cn(
          "text-[17px] leading-[25px] font-bold",
          inverse ? "text-white" : "text-foreground",
        )}
      >
        FeedbackFlow
      </span>
    </div>
  );
}
