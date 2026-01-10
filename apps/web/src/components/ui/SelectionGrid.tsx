import { Card, CardBody } from "@/components/ui";
import { cn } from "@/lib/utils";

interface SelectionOption {
  key: string;
  label: string;
}

interface SelectionGridProps {
  options: SelectionOption[];
  value: string;
  onChange: (value: string) => void;
  columns?: number;
  label?: string;
}

/**
 * Rich selection grid component - replaces text inputs with clickable cards
 */
export function SelectionGrid({
  options,
  value,
  onChange,
  columns = 4,
  label,
}: SelectionGridProps) {
  return (
    <div>
      {label && (
        <label className="text-sm font-medium block mb-2">{label}</label>
      )}
      <div
        className={cn(
          "grid gap-2",
          columns === 2 && "grid-cols-2",
          columns === 3 && "grid-cols-2 sm:grid-cols-3",
          columns === 4 && "grid-cols-2 sm:grid-cols-4"
        )}
      >
        {options.map((opt) => (
          <Card
            key={opt.key}
            className={cn(
              "cursor-pointer border-2 transition-colors",
              value === opt.key
                ? "border-primary bg-primary/10"
                : "border-transparent hover:border-border"
            )}
            onClick={() => onChange(opt.key)}
          >
            <CardBody className="p-2 text-center flex flex-col items-center justify-center gap-0.5">
              <p className="text-sm font-medium leading-tight">
                {opt.label.split(" / ")[0]}
              </p>
              {opt.label.includes(" / ") && (
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {opt.label.split(" / ")[1]}
                </p>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface MultiSelectGridProps {
  options: SelectionOption[];
  values: string[];
  onChange: (values: string[]) => void;
  columns?: number;
  label?: string;
  maxSelections?: number;
}

/**
 * Multi-select grid for selecting multiple options
 */
export function MultiSelectGrid({
  options,
  values,
  onChange,
  columns = 4,
  label,
  maxSelections = 5,
}: MultiSelectGridProps) {
  const handleToggle = (key: string) => {
    if (values.includes(key)) {
      onChange(values.filter((v) => v !== key));
    } else if (values.length < maxSelections) {
      onChange([...values, key]);
    }
  };

  return (
    <div>
      {label && (
        <label className="text-sm font-medium block mb-2">
          {label}{" "}
          {maxSelections > 1 && (
            <span className="text-muted-foreground">(max {maxSelections})</span>
          )}
        </label>
      )}
      <div
        className={cn(
          "grid gap-2",
          columns === 2 && "grid-cols-2",
          columns === 3 && "grid-cols-2 sm:grid-cols-3",
          columns === 4 && "grid-cols-2 sm:grid-cols-4"
        )}
      >
        {options.map((opt) => (
          <Card
            key={opt.key}
            className={cn(
              "cursor-pointer border-2 transition-colors",
              values.includes(opt.key)
                ? "border-primary bg-primary/10"
                : "border-transparent hover:border-border"
            )}
            onClick={() => handleToggle(opt.key)}
          >
            <CardBody className="p-2 text-center flex flex-col items-center justify-center gap-0.5">
              <p className="text-sm font-medium leading-tight">
                {opt.label.split(" / ")[0]}
              </p>
              {opt.label.includes(" / ") && (
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {opt.label.split(" / ")[1]}
                </p>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
