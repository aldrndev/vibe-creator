import { Card, CardBody } from '@heroui/react';

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
  label 
}: SelectionGridProps) {
  return (
    <div>
      {label && (
        <label className="text-sm font-medium block mb-2">{label}</label>
      )}
      <div className={`grid grid-cols-2 sm:grid-cols-${columns} gap-2`}>
        {options.map((opt) => (
          <Card
            key={opt.key}
            isPressable
            onPress={() => onChange(opt.key)}
            className={`border-2 transition-colors ${
              value === opt.key 
                ? 'border-primary bg-primary/10' 
                : 'border-transparent hover:border-divider'
            }`}
          >
            <CardBody className="p-2 text-center">
              <p className="text-sm font-medium">{opt.label}</p>
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
  maxSelections = 5
}: MultiSelectGridProps) {
  const handleToggle = (key: string) => {
    if (values.includes(key)) {
      onChange(values.filter(v => v !== key));
    } else if (values.length < maxSelections) {
      onChange([...values, key]);
    }
  };

  return (
    <div>
      {label && (
        <label className="text-sm font-medium block mb-2">
          {label} {maxSelections > 1 && <span className="text-foreground/50">(max {maxSelections})</span>}
        </label>
      )}
      <div className={`grid grid-cols-2 sm:grid-cols-${columns} gap-2`}>
        {options.map((opt) => (
          <Card
            key={opt.key}
            isPressable
            onPress={() => handleToggle(opt.key)}
            className={`border-2 transition-colors ${
              values.includes(opt.key) 
                ? 'border-primary bg-primary/10' 
                : 'border-transparent hover:border-divider'
            }`}
          >
            <CardBody className="p-2 text-center">
              <p className="text-sm font-medium">{opt.label}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
