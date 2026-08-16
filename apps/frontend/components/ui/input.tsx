import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-11 w-full rounded-lg border border-[#dce3dc] bg-white px-3 py-2 text-sm text-[#202820] outline-none transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-[#a0aaa1] focus:border-[#607b67] focus:shadow-[0_0_0_3px_rgba(91,119,98,0.12)] disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
