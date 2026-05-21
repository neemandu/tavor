import * as React from "react"
import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  max = 100,
  ...props
}: React.ComponentProps<"div"> & { value?: number; max?: number }) {
  const pct = Math.min(100, Math.max(0, ((value ?? 0) / (max || 1)) * 100))
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    >
      <div
        className="h-full bg-primary transition-all duration-300 rounded-full"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export { Progress }
