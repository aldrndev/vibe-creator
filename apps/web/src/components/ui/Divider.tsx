import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Divider/Separator component
 */
const Divider = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    orientation?: 'horizontal' | 'vertical';
  }
>(({ className, orientation = 'horizontal', ...props }, ref) => {
  if (orientation === 'vertical') {
    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={cn('h-full w-[1px] shrink-0 bg-border', className)}
        {...props}
      />
    );
  }

  return (
    <hr
      ref={ref as React.Ref<HTMLHRElement>}
      className={cn('h-[1px] w-full shrink-0 border-0 bg-border', className)}
      {...props}
    />
  );
});
Divider.displayName = 'Divider';

export { Divider };
