import * as React from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FieldProps {
  label: React.ReactNode
  htmlFor: string
  hint?: React.ReactNode
  className?: string
  labelClassName?: string
  children: React.ReactNode
}

// Label + kontrol + petunjuk dengan jarak 8px, sesuai desain.
function Field({ label, htmlFor, hint, className, labelClassName, children }: FieldProps) {
  return (
    <div className={cn("grid min-w-0 gap-2", className)}>
      <Label htmlFor={htmlFor} className={cn("text-xs leading-none font-semibold text-fg-2", labelClassName)}>
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export { Field }
