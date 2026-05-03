import { Badge } from '@/components/ui/badge';

interface DataSourceBadgeProps {
  source?: string;
  isMock?: boolean;
  className?: string;
}

export function DataSourceBadge({ source, isMock, className }: DataSourceBadgeProps) {
  if (!source) return null;

  const getLabel = () => {
    if (isMock) {
      return 'Mock fallback';
    }

    switch (source) {
      case 'weather-api':
        return 'Weather API';
      case 'news-api':
        return 'News API';
      case 'stock-api':
        return 'Stock API';
      case 'forex-api':
        return 'Forex API';
      case 'historical-api':
        return 'Historical API';
      case 'database':
        return 'Database';
      case 'generated-fallback':
        return 'Generated';
      default:
        return source;
    }
  };

  const getVariant = () => {
    if (isMock) {
      return 'secondary' as const;
    }
    return 'default' as const;
  };

  return (
    <Badge variant={getVariant()} className={className}>
      {getLabel()}
    </Badge>
  );
}
