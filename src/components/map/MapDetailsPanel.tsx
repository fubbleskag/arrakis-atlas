
"use client";

import type React from 'react';
import { useEffect } from 'react';
import type { MapData, UserProfile } from '@/types';
import type { User } from 'firebase/auth';
import { useMap } from '@/contexts/MapContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Users, Clock, Crown, Loader2 } from 'lucide-react'; 

interface MapDetailsPanelProps {
  mapData: MapData;
  currentUser: User | null;
  className?: string;
}

export function MapDetailsPanel({ mapData, currentUser, className }: MapDetailsPanelProps) {
  const { editorProfiles, isLoadingEditorProfiles, fetchEditorProfiles } = useMap();

  useEffect(() => {
    const uidsInPanel = [mapData.ownerId, ...(mapData.editors || [])];
    const uidsToFetch = uidsInPanel.filter(uid => uid && typeof editorProfiles[uid] === 'undefined');
    
    if (uidsToFetch.length > 0) {
      fetchEditorProfiles(uidsToFetch);
    }
  }, [mapData.ownerId, mapData.editors, editorProfiles, fetchEditorProfiles]);


  if (!mapData || !currentUser) {
    return null; 
  }

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

  const allCollaborators: Array<{ uid: string; profile?: UserProfile | null; isOwner: boolean; isLoading: boolean }> = [];
  
  // Add owner
  allCollaborators.push({
    uid: mapData.ownerId,
    profile: editorProfiles[mapData.ownerId],
    isOwner: true,
    isLoading: typeof editorProfiles[mapData.ownerId] === 'undefined' && isLoadingEditorProfiles,
  });

  // Add editors, ensuring they are not the owner
  (mapData.editors || []).forEach(editorUid => {
    if (editorUid !== mapData.ownerId) {
      allCollaborators.push({
        uid: editorUid,
        profile: editorProfiles[editorUid],
        isOwner: false,
        isLoading: typeof editorProfiles[editorUid] === 'undefined' && isLoadingEditorProfiles,
      });
    }
  });
  
  // Sort by owner first, then by display name or UID
  allCollaborators.sort((a, b) => {
    if (a.isOwner && !b.isOwner) return -1;
    if (!a.isOwner && b.isOwner) return 1;
    const nameA = a.profile?.displayName || a.uid;
    const nameB = b.profile?.displayName || b.uid;
    return nameA.localeCompare(nameB);
  });


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
          <h3 className="text-xs font-medium text-muted-foreground mb-1 flex items-center">
            <Users className="h-3.5 w-3.5 mr-1.5 text-primary" /> COLLABORATORS
          </h3>
          {(isLoadingEditorProfiles && allCollaborators.some(c => c.isLoading)) && (
            <div className="flex items-center text-xs text-muted-foreground py-1">
                <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Loading details...
            </div>
          )}
          <ul className="space-y-1 text-xs max-h-32 overflow-y-auto">
            {allCollaborators.map(collab => {
              let displayName = `${collab.uid.substring(0,10)}... (UID)`;
              if (collab.isLoading) {
                displayName = `${collab.uid.substring(0,10)}...`;
              } else if (collab.profile === null) {
                 displayName = `${collab.uid.substring(0,10)}... (Unknown User)`;
              } else if (collab.profile && collab.profile.displayName) {
                displayName = collab.profile.displayName;
              } else if (collab.profile && !collab.profile.displayName) {
                displayName = `${collab.uid.substring(0,10)}... (No Name)`;
              }

              return (
              <li key={collab.uid} className={cn(
                "flex items-center justify-between group",
                collab.uid === currentUser.uid && "text-primary font-semibold"
              )}>
                <div className="flex items-center truncate">
                  {collab.isLoading && <Loader2 className="mr-1.5 h-3 w-3 animate-spin shrink-0" />}
                  <span className="truncate" title={collab.uid}>
                    {displayName}
                  </span>
                  {collab.isOwner && <Crown className="ml-1.5 h-3.5 w-3.5 text-yellow-400 shrink-0" title="Owner" />}
                </div>
              </li>
              );
            })}
          </ul>
        </div>
        
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

