import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type IconInputProps = Omit<React.ComponentProps<"input">, "size"> & {
  icon?: LucideIcon
  trailing?: React.ReactNode
  fieldSize?: "md" | "lg"
  wrapperClassName?: string
}

// Input dengan ikon di kiri dan slot opsional di kanan (mis. tombol tampilkan sandi).
// Ring fokus dipasang pada pembungkus supaya ikon dan tombol ikut ter-bingkai.
function IconInput({ icon: Icon, trailing, fieldSize = "lg", className, wrapperClassName, ...props }: IconInputProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border border-input bg-card transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 has-[input:disabled]:opacity-50",
        fieldSize === "lg" ? "h-[52px] px-[15px]" : "h-[46px] px-[13px]",
        wrapperClassName
      )}
    >
      {Icon && <Icon aria-hidden className="size-[18px] shrink-0 text-muted-foreground" />}
      <input
        data-slot="input"
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-[#98A3AD]",
          fieldSize === "lg" && "text-sm",
          className
        )}
        {...props}
      />
      {trailing}
    </div>
  )
}

export { IconInput }
