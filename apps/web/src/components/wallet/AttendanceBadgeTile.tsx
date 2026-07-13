import { BadgeCheck } from "lucide-react";
import type { Attendance } from "@fanpass/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AttendanceBadgeTileProps {
  attendance: Attendance;
}

/** Populated by real venue check-in (Phase 4/6) — the shape is real, just not yet triggered. */
export function AttendanceBadgeTile({ attendance }: AttendanceBadgeTileProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <BadgeCheck className="size-4 text-success" />
          Attended
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
        <span>{attendance.venue}</span>
        <span className="text-xs">Checked in {new Date(attendance.checkedInAt).toLocaleString()}</span>
      </CardContent>
    </Card>
  );
}
