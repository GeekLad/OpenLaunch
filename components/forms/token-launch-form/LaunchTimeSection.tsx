"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UseFormRegister } from "react-hook-form";
import { TokenFormSchemaType } from "./schema";
import { Calendar } from "lucide-react";

interface LaunchTimeSectionProps {
  register: UseFormRegister<TokenFormSchemaType>;
  isLoading: boolean;
  enableTimedLaunch: boolean;
  setEnableTimedLaunch: (enabled: boolean) => void;
  launchDate: string;
  setLaunchDate: (date: string) => void;
  launchHour: string;
  setLaunchHour: (hour: string) => void;
  launchMinute: string;
  setLaunchMinute: (minute: string) => void;
  launchPeriod: "AM" | "PM";
  setLaunchPeriod: (period: "AM" | "PM") => void;
  updateDateTime: (dateStr: string, hourStr: string, minuteStr: string, period: "AM" | "PM") => void;
  getLocalDateString: (date?: Date) => string;
}

export function LaunchTimeSection({
  register,
  isLoading,
  enableTimedLaunch,
  setEnableTimedLaunch,
  launchDate,
  setLaunchDate,
  launchHour,
  setLaunchHour,
  launchMinute,
  setLaunchMinute,
  launchPeriod,
  setLaunchPeriod,
  updateDateTime,
  getLocalDateString,
}: LaunchTimeSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Launch Time</CardTitle>
        </div>
        <CardDescription>Schedule when your token becomes tradeable</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="enableTimedLaunch"
            {...register("enableTimedLaunch")}
            checked={enableTimedLaunch}
            onChange={(e) => setEnableTimedLaunch(e.target.checked)}
            disabled={isLoading}
            className="h-4 w-4"
          />
          <Label htmlFor="enableTimedLaunch">Enable Timed Launch</Label>
        </div>

        {enableTimedLaunch && (
          <div className="space-y-2">
            <Label>
              Launch Date &amp; Time (Local Time: {Intl.DateTimeFormat().resolvedOptions().timeZone} UTC
              {new Date().getTimezoneOffset() <= 0 ? "+" : "-"}
              {Math.abs(new Date().getTimezoneOffset() / 60).toString().padStart(2, "0")}:
              {(Math.abs(new Date().getTimezoneOffset()) % 60).toString().padStart(2, "0")})
            </Label>
            <div className="flex gap-1.5 items-end">
              <div className="flex-1 max-w-[200px]">
                <Input
                  id="launchDate"
                  type="date"
                  value={launchDate}
                  min={getLocalDateString()}
                  onChange={(e) => {
                    setLaunchDate(e.target.value);
                    updateDateTime(e.target.value, launchHour, launchMinute, launchPeriod);
                  }}
                  disabled={isLoading}
                />
              </div>
              <div className="w-16">
                <Input
                  id="launchHour"
                  type="number"
                  min="1"
                  max="12"
                  value={launchHour}
                  placeholder="HH"
                  onChange={(e) => setLaunchHour(e.target.value)}
                  disabled={isLoading}
                  className="text-center"
                />
              </div>
              <span className="text-lg font-bold pb-2">:</span>
              <div className="w-16">
                <Input
                  id="launchMinute"
                  type="number"
                  min="0"
                  max="59"
                  value={launchMinute}
                  placeholder="MM"
                  onChange={(e) => setLaunchMinute(e.target.value)}
                  disabled={isLoading}
                  className="text-center"
                />
              </div>
              <div className="w-16">
                <select
                  id="launchPeriod"
                  value={launchPeriod}
                  onChange={(e) => {
                    const p = e.target.value as "AM" | "PM";
                    setLaunchPeriod(p);
                    updateDateTime(launchDate, launchHour, launchMinute, p);
                  }}
                  disabled={isLoading}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-center font-medium"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
