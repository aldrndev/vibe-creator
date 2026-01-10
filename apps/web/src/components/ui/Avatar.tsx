import * as React from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Name to generate initials from */
  name?: string;
  /** Image source */
  src?: string;
  /** Alt text for image */
  alt?: string;
  /** Size of avatar */
  size?: "sm" | "md" | "lg";
}

/**
 * Avatar component with image or initials fallback
 */
const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, name, src, alt, size = "md", ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false);

    const sizeClasses = {
      sm: "h-8 w-8 text-xs",
      md: "h-10 w-10 text-sm",
      lg: "h-12 w-12 text-base",
    };

    const getInitials = (name: string) => {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    };

    const showFallback = !src || imageError;

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground font-medium",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {showFallback ? (
          <span>{name ? getInitials(name) : "?"}</span>
        ) : (
          <img
            src={src}
            alt={alt || name || "Avatar"}
            className="aspect-square h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        )}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

export { Avatar };
