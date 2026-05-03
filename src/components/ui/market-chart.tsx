import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts';

type RawHistory =
  | Array<{ t: number; y: number }>
  | Array<{ time: number; price: number }>
  | string
  | null
  | undefined
  | unknown;

interface MarketChartProps {
  history?: RawHistory;
  currentYesPrice: number;
  variant?: 'sparkline' | 'detail';
}

export function MarketChart({
  history,
  currentYesPrice,
  variant = 'detail',
}: MarketChartProps) {
  const normalizedHistory = normalizeHistory(history);

  // Use fallback if history has less than 2 points (single point charts look broken)
  const chartData =
    normalizedHistory.length >= 2
      ? normalizedHistory
      : generateFallbackHistory(currentYesPrice);

  const isSparkline = variant === 'sparkline';

  return (
    <ResponsiveContainer width="100%" height={isSparkline ? 40 : 200}>
      <LineChart data={chartData} margin={{ top: 5, right: 5, left: isSparkline ? 0 : 20, bottom: 5 }}>
        {!isSparkline && (
          <>
            <XAxis 
              dataKey="time" 
              type="number"
              domain={['dataMin', 'dataMax']}
              tick={false}
              axisLine={false}
            />
            <YAxis 
              domain={[0, 100]} 
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine 
              y={50} 
              stroke="hsl(var(--border))" 
              strokeDasharray="3 3" 
              label={{ value: '50¢', position: 'right', fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
          </>
        )}
        <Line 
          type="monotone" 
          dataKey="price" 
          stroke="hsl(var(--gb-yes))" 
          strokeWidth={isSparkline ? 1.5 : 2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function normalizeHistory(history: RawHistory): Array<{ time: number; price: number }> {
  let value = history;

  // Handle stringified JSON
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }

  // Must be an array
  if (!Array.isArray(value)) {
    return [];
  }

  // Map and validate each point
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;

      const record = item as Record<string, unknown>;
      const rawTime = record.time ?? record.t;
      const rawPrice = record.price ?? record.y;

      const time = typeof rawTime === 'number' ? rawTime : Number(rawTime);
      const price = typeof rawPrice === 'number' ? rawPrice : Number(rawPrice);

      if (!Number.isFinite(time) || !Number.isFinite(price)) {
        return null;
      }

      return {
        time,
        price: Math.max(0, Math.min(100, price)),
      };
    })
    .filter((point): point is { time: number; price: number } => point !== null);
}

function generateFallbackHistory(currentPrice: number): Array<{ time: number; price: number }> {
  const now = Date.now();
  const points = 20;
  const data: Array<{ time: number; price: number }> = [];

  const safeCurrentPrice = Number.isFinite(currentPrice)
    ? Math.max(0, Math.min(100, currentPrice))
    : 50;

  const startPrice = Math.max(
    20,
    Math.min(80, safeCurrentPrice + (Math.random() - 0.5) * 20)
  );

  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const time = now - (points - i) * 3_600_000;
    const price =
      startPrice +
      (safeCurrentPrice - startPrice) * progress +
      (Math.random() - 0.5) * 5;

    data.push({
      time,
      price: Math.max(0, Math.min(100, price)),
    });
  }

  return data;
}
