import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts';

interface MarketChartProps {
  history: Array<{ t: number; y: number }>;
  currentYesPrice: number;
  variant?: 'sparkline' | 'detail';
}

export function MarketChart({ history, currentYesPrice, variant = 'detail' }: MarketChartProps) {
  // Generate fallback history if empty
  const chartData = history.length > 0 
    ? history.map((h) => ({ time: h.t, price: h.y }))
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

function generateFallbackHistory(currentPrice: number): Array<{ time: number; price: number }> {
  const now = Date.now();
  const points = 20;
  const data: Array<{ time: number; price: number }> = [];
  
  // Generate a simple trend line with some variation
  const startPrice = Math.max(20, Math.min(80, currentPrice + (Math.random() - 0.5) * 20));
  
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const time = now - (points - i) * 3600000; // 1 hour intervals
    const price = startPrice + (currentPrice - startPrice) * progress + (Math.random() - 0.5) * 5;
    data.push({ time, price: Math.max(0, Math.min(100, price)) });
  }
  
  return data;
}
