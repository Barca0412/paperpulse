import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-medium leading-4 transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        tierA:
          "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        tierB:
          "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-300",
        tierC:
          "border-transparent bg-slate-500/15 text-slate-600 dark:text-slate-400",
        cs:
          "border-transparent bg-violet-500/10 text-violet-700 dark:text-violet-300",
        finance:
          "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
        crosscut:
          "border-transparent bg-teal-500/15 text-teal-700 dark:text-teal-300",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
