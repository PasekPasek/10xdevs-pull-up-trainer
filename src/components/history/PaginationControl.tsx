import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";

interface PaginationControlProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PaginationControl({ currentPage, totalPages, onPageChange }: PaginationControlProps) {
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  // Announce page changes to screen readers
  useEffect(() => {
    const announcement = `Page ${currentPage} of ${totalPages}`;
    const ariaLive = document.getElementById("pagination-status");
    if (ariaLive) {
      ariaLive.textContent = announcement;
    }
  }, [currentPage, totalPages]);

  const handlePrevious = () => {
    if (canGoPrevious) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <nav className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4" aria-label="Pagination">
      <div id="pagination-status" className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        Page {currentPage} of {totalPages}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handlePrevious}
        disabled={!canGoPrevious}
        aria-label="Go to previous page"
        className="gap-2"
        data-testid="pagination-previous"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Previous</span>
      </Button>

      <div
        className="flex items-center gap-2 text-sm font-medium"
        aria-current="page"
        data-testid="pagination-info"
      >
        <span className="text-muted-foreground">Page</span>
        <span className="font-semibold">{currentPage}</span>
        <span className="text-muted-foreground">of</span>
        <span className="font-semibold">{totalPages}</span>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleNext}
        disabled={!canGoNext}
        aria-label="Go to next page"
        className="gap-2"
        data-testid="pagination-next"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="size-4" aria-hidden="true" />
      </Button>
    </nav>
  );
}
