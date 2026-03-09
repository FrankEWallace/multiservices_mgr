import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-95 touch-manipulation",
  {
    variants: {
      variant: {
        default: "bg-primary/90 text-primary-foreground backdrop-blur-md shadow-[0_4px_16px_hsl(var(--primary)/0.25),inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-primary hover:shadow-[0_6px_24px_hsl(var(--primary)/0.35),inset_0_1px_0_rgba(255,255,255,0.25)] hover:-translate-y-0.5 active:bg-primary/80",
        destructive: "bg-destructive/90 text-destructive-foreground backdrop-blur-md shadow-[0_4px_16px_hsl(var(--destructive)/0.25),inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-destructive hover:shadow-[0_6px_24px_hsl(var(--destructive)/0.35)] active:bg-destructive/80",
        outline: "border border-white/20 bg-background/50 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:bg-accent/60 hover:text-accent-foreground active:bg-accent/80",
        secondary: "bg-secondary/70 text-secondary-foreground backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:bg-secondary/90 active:bg-secondary/60",
        ghost: "hover:bg-accent/50 hover:text-accent-foreground backdrop-blur-sm active:bg-accent/70",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2.5 min-h-[44px]",
        sm: "h-10 rounded-lg px-4 min-h-[40px]",
        lg: "h-12 rounded-xl px-8 min-h-[48px]",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
