import { useEffect, useState } from "react";
import { getCountdown } from "@/lib/utils/date";

interface CountdownProps {
  targetDate: string;
  className?: string;
}

export function Countdown({ targetDate, className }: CountdownProps) {
  const [countdown, setCountdown] = useState(() => getCountdown(targetDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getCountdown(targetDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (countdown.totalSeconds === 0) {
    return <span className={className}>Ready!</span>;
  }

  return (
    <span className={className}>
      {countdown.hours}h {countdown.minutes}m {countdown.seconds}s
    </span>
  );
}
