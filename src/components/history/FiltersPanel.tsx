import { useState } from "react";
import type { SessionStatus, SessionSortOption } from "@/types";
import type { HistoryFilters } from "./HistoryView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp, Filter, X } from "lucide-react";

interface FiltersPanelProps {
  filters: HistoryFilters;
  onChange: (filters: HistoryFilters) => void;
  onClear: () => void;
}

const statusOptions: { value: SessionStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

const datePresets = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

export function FiltersPanel({ filters, onChange, onClear }: FiltersPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [datePreset, setDatePreset] = useState<string>("custom");

  const handleStatusToggle = (status: SessionStatus, checked: boolean) => {
    const currentStatuses = filters.status || [];
    const newStatuses = checked
      ? [...currentStatuses, status]
      : currentStatuses.filter((s) => s !== status);

    onChange({
      ...filters,
      status: newStatuses.length > 0 ? newStatuses : undefined,
    });
  };

  const handleDatePresetChange = (value: string) => {
    setDatePreset(value);

    if (value === "custom") {
      // Keep current custom dates
      return;
    }

    const preset = datePresets.find((p) => p.label === value);
    if (preset) {
      const dateTo = new Date();
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - preset.days);

      onChange({
        ...filters,
        dateFrom: dateFrom.toISOString().split("T")[0],
        dateTo: dateTo.toISOString().split("T")[0],
      });
    }
  };

  const handleCustomDateChange = (field: "dateFrom" | "dateTo", value: string) => {
    setDatePreset("custom");
    onChange({
      ...filters,
      [field]: value || undefined,
    });
  };

  const handleSortChange = (value: string) => {
    onChange({
      ...filters,
      sort: value as SessionSortOption,
    });
  };

  const hasActiveFilters =
    (filters.status && filters.status.length > 0) ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.sort !== "sessionDate_desc";

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="size-4" aria-hidden="true" />
            <span>Filters</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-expanded={!isCollapsed}
            aria-controls="filters-content"
          >
            {isCollapsed ? (
              <ChevronDown className="size-4" aria-label="Expand filters" />
            ) : (
              <ChevronUp className="size-4" aria-label="Collapse filters" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent
        id="filters-content"
        className={`space-y-6 ${isCollapsed ? "hidden lg:block" : ""}`}
      >
        {/* Status Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Status</Label>
          <div className="space-y-2">
            {statusOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${option.value}`}
                  checked={filters.status?.includes(option.value) || false}
                  onCheckedChange={(checked) =>
                    handleStatusToggle(option.value, checked as boolean)
                  }
                  aria-label={`Filter by ${option.label} status`}
                />
                <Label
                  htmlFor={`status-${option.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Date Range</Label>

          <div className="space-y-3">
            <Select value={datePreset} onValueChange={handleDatePresetChange}>
              <SelectTrigger
                className="w-full"
                aria-label="Select date range preset"
              >
                <SelectValue placeholder="Select preset" />
              </SelectTrigger>
              <SelectContent>
                {datePresets.map((preset) => (
                  <SelectItem key={preset.label} value={preset.label}>
                    {preset.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            <div className="space-y-2">
              <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">
                From
              </Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) => handleCustomDateChange("dateFrom", e.target.value)}
                aria-label="Start date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateTo" className="text-xs text-muted-foreground">
                To
              </Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) => handleCustomDateChange("dateTo", e.target.value)}
                aria-label="End date"
              />
            </div>
          </div>
        </div>

        {/* Sort Order */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Sort Order</Label>
          <Select
            value={filters.sort || "sessionDate_desc"}
            onValueChange={handleSortChange}
          >
            <SelectTrigger className="w-full" aria-label="Select sort order">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sessionDate_desc">Newest First</SelectItem>
              <SelectItem value="sessionDate_asc">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            className="w-full"
            onClick={onClear}
            aria-label="Clear all filters"
          >
            <X className="size-4 mr-2" aria-hidden="true" />
            Clear Filters
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
