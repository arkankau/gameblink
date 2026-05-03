import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownProps {
  endsAt: string;
  className?: string;
}

export function Countdown({ endsAt, className = '' }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endsAt).getTime();
      const difference = end - now;

      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft('Closed');
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h left`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m left`);
      } else {
        setTimeLeft(`${minutes}m left`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [endsAt]);

  return (
    <div className={`flex items-center gap-1 text-sm ${isExpired ? 'text-muted-foreground' : 'text-foreground'} ${className}`}>
      <Clock className="h-3 w-3" />
      <span>{timeLeft}</span>
    </div>
  );
}

export function formatCloseDateTime(endsAt: string): string {
  const date = new Date(endsAt);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${dateStr} · ${timeStr}`;
}
