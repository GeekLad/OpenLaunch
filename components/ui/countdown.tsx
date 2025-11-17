"use client";

import { useEffect, useState } from "react";

interface CountdownProps {
  targetDate: Date;
  onComplete?: () => void;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

function calculateTimeRemaining(targetDate: Date): TimeRemaining {
  const now = new Date().getTime();
  const target = targetDate.getTime();
  const difference = target - now;

  if (difference <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
    };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((difference % (1000 * 60)) / 1000),
    isExpired: false,
  };
}

export function Countdown({ targetDate, onComplete }: CountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(
    calculateTimeRemaining(targetDate)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const newTimeRemaining = calculateTimeRemaining(targetDate);
      setTimeRemaining(newTimeRemaining);

      if (newTimeRemaining.isExpired && onComplete) {
        onComplete();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onComplete]);

  if (timeRemaining.isExpired) {
    return null;
  }



  return (
    <div className="flex gap-2 items-center justify-center">
      {timeRemaining.days > 0 && (
        <>
          <div className="flex flex-col items-center">
            <div className="text-2xl font-bold font-mono tabular-nums">
              {timeRemaining.days.toString().padStart(2, "0")}
            </div>
            <div className="text-xs text-muted-foreground">days</div>
          </div>
          <span className="text-2xl font-bold text-muted-foreground">:</span>
        </>
      )}
      {timeRemaining.hours > 0 && (
        <>
          <div className="flex flex-col items-center">
            <div className="text-2xl font-bold font-mono tabular-nums">
              {timeRemaining.hours.toString().padStart(2, "0")}
            </div>
            <div className="text-xs text-muted-foreground">hours</div>
          </div>
          <span className="text-2xl font-bold text-muted-foreground">:</span>
        </>
      )}
      <div className="flex flex-col items-center">
        <div className="text-2xl font-bold font-mono tabular-nums">
          {timeRemaining.minutes.toString().padStart(2, "0")}
        </div>
        <div className="text-xs text-muted-foreground">min</div>
      </div>
      <span className="text-2xl font-bold text-muted-foreground">:</span>
      <div className="flex flex-col items-center">
        <div className="text-2xl font-bold font-mono tabular-nums">
          {timeRemaining.seconds.toString().padStart(2, "0")}
        </div>
        <div className="text-xs text-muted-foreground">sec</div>
      </div>
    </div>
  );
}

export function CompactCountdown({ targetDate, onComplete }: CountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(
    calculateTimeRemaining(targetDate)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const newTimeRemaining = calculateTimeRemaining(targetDate);
      setTimeRemaining(newTimeRemaining);

      if (newTimeRemaining.isExpired && onComplete) {
        onComplete();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onComplete]);

  if (timeRemaining.isExpired) {
    return null;
  }

  const parts = [];
  if (timeRemaining.days > 0) {
    parts.push(`${timeRemaining.days}d`);
  }
  if (timeRemaining.hours > 0 || timeRemaining.days > 0) {
    parts.push(`${timeRemaining.hours.toString().padStart(2, "0")}h`);
  }
  parts.push(`${timeRemaining.minutes.toString().padStart(2, "0")}m`);
  parts.push(`${timeRemaining.seconds.toString().padStart(2, "0")}s`);

  return (
    <div className="font-mono text-sm font-semibold tabular-nums">
      {parts.join(" ")}
    </div>
  );
}
