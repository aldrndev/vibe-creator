import { Button } from "./Button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

export interface PaginationProps {
  /** Current page (1-indexed) */
  page: number;
  /** Total number of pages */
  total: number;
  /** Called when page changes */
  onChange: (page: number) => void;
  /** Number of sibling pages to show */
  siblings?: number;
  /** Additional class names */
  className?: string;
}

/**
 * Generate page numbers with ellipsis
 */
function generatePageNumbers(
  current: number,
  total: number,
  siblings: number = 1
): (number | "ellipsis")[] {
  const pages: (number | "ellipsis")[] = [];

  const start = Math.max(1, current - siblings);
  const end = Math.min(total, current + siblings);

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push("ellipsis");
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (end < total) {
    if (end < total - 1) pages.push("ellipsis");
    pages.push(total);
  }

  return pages;
}

/**
 * Pagination component
 */
export function Pagination({
  page,
  total,
  onChange,
  siblings = 1,
  className,
}: PaginationProps) {
  const pages = generatePageNumbers(page, total, siblings);

  if (total <= 1) return null;

  return (
    <nav
      className={cn("flex items-center justify-center gap-1", className)}
      aria-label="Pagination"
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </Button>

      {pages.map((p, i) => {
        if (p === "ellipsis") {
          return (
            <span
              key={`ellipsis-${i}`}
              className="flex items-center justify-center w-8 h-8"
            >
              <MoreHorizontal size={16} className="text-muted-foreground" />
            </span>
          );
        }

        return (
          <Button
            key={p}
            variant={p === page ? "default" : "ghost"}
            size="sm"
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
            className="w-8 h-8 p-0"
          >
            {p}
          </Button>
        );
      })}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange(page + 1)}
        disabled={page === total}
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </Button>
    </nav>
  );
}
