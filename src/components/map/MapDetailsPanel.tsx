
"use client";

import type React from 'react';
import type { MapData } from '@/types';
import type { User } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { ShieldCheck, Users, Clock } from 'lucide-react'; // Added icons

interface MapDetailsPanelProps {
  mapData: MapData;
  currentUser: User | null;
  className?: string;
}

export function MapDetailsPanel({ mapData, currentUser, className }: MapDetailsPanelProps) {
  if (!mapData || !currentUser) {
    return null; // Or a loading/error state if preferred
  }

  const getRole = () => {
    if (mapData.ownerId === currentUser.uid) return "Owner";
    if (mapData.editors && mapData.editors.includes(currentUser.uid)) return "Editor";
    return "Viewer"; // Should not happen in this context but good fallback
  };

  const role = getRole();

  const getFormattedDate = (dateValue: Timestamp | string | undefined) => {
    if (!dateValue) return 'N/A';
    let date: Date;
    if (dateValue instanceof Timestamp) {
        date = dateValue.toDate();
    } else if (typeof dateValue === 'string') {
        date = parseISO(dateValue);
    } else if (typeof dateValue === 'object' && 'seconds' in dateValue && 'nanoseconds' in dateValue) {
        date = new Timestamp((dateValue as any).seconds, (dateValue as any).nanoseconds).toDate();
    }
    else {
        return 'Invalid date';
    }
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return (
    <Card className={cn("w-full shadow-lg border-border bg-card", className)}>
      <CardHeader className="p-3 md:p-4">
        <CardTitle className="text-base font-semibold leading-none text-foreground">
          Map Information
        </CardTitle>
        <CardDescription className="text-xs">
          Overview of the current map.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 md:p-4 space-y-3 text-sm">
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-0.5">MAP NAME</h3>
          <p className="font-semibold text-foreground truncate" title={mapData.name}>{mapData.name}</p>
        </div>
        <Separator />
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-0.5 flex items-center">
            <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-primary" /> YOUR ROLE
          </h3>
          <Badge variant={role === "Owner" ? "default" : "secondary"} className="text-xs">
            {role}
          </Badge>
        </div>
        <Separator />
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-0.5 flex items-center">
            <Users className="h-3.5 w-3.5 mr-1.5 text-primary" /> OWNER
          </h3>
          <p className="text-foreground truncate text-xs" title={mapData.ownerId}>
            {mapData.ownerId === currentUser.uid ? `${currentUser.displayName || 'You'} (Owner)` : `UID: ${mapData.ownerId.substring(0,10)}...`}
          </p>
        </div>
         {mapData.editors && mapData.editors.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-0.5 flex items-center">
                 EDITORS
              </h3>
              <p className="text-foreground text-xs">
                {mapData.editors.length} editor(s)
              </p>
            </div>
          </>
        )}
        <Separator />
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-0.5 flex items-center">
            <Clock className="h-3.5 w-3.5 mr-1.5 text-primary" /> LAST UPDATED
          </h3>
          <p className="text-foreground">{getFormattedDate(mapData.updatedAt)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
