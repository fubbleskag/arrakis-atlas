
"use client";

import type React from 'react';
import { useEffect } from 'react';
import type { MapData, UserProfile } from '@/types';
import type { User } from 'firebase/auth';
import { useMap } from '@/contexts/MapContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Users, Clock, Crown, Loader2, X as XIcon, RotateCcw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface MapDetailsPanelProps {
  mapData: MapData;
  currentUser: User | null;
  className?: string;
}

export function MapDetailsPanel({ mapData, currentUser, className }: MapDetailsPanelProps) {
  const {
    editorProfiles,
    isLoadingEditorProfiles,
    fetchEditorProfiles,
    selectMap,
    resetCurrentMapGrid,
    isLoadingMapData
  } = useMap();

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
  
  allCollaborators.push({
    uid: mapData.ownerId,
    profile: editorProfiles[mapData.ownerId],
    isOwner: true,
    isLoading: typeof editorProfiles[mapData.ownerId] === 'undefined' && isLoadingEditorProfiles,
  });

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
  
  allCollaborators.sort((a, b) => {
    if (a.isOwner && !b.isOwner) return -1;
    if (!a.isOwner && b.isOwner) return 1;
    const nameA = a.profile?.displayName || a.uid;
    const nameB = b.profile?.displayName || b.uid;
    return nameA.localeCompare(nameB);
  });

  const isCurrentUserOwner = mapData.ownerId === currentUser.uid;

  return (
    <Card className={cn("w-full shadow-lg border-border bg-card", className)}>
      <CardHeader className="p-3 md:p-4 flex flex-row justify-between items-center">
        <CardTitle className="text-base font-semibold leading-none text-foreground truncate">
          Details for {mapData.name}
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => selectMap(null)}
          aria-label="Close map details and return to map manager"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <XIcon className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-3 md:p-4 space-y-3 text-sm">
        
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

        {isCurrentUserOwner && (
          <>
            <Separator />
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center">
                 MAP ACTIONS
              </h3>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="w-full" disabled={isLoadingMapData}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Invoke Coriolis Storm
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Invoke a Coriolis Storm?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently reset the grid for the current map
                      (&quot;{mapData?.name || 'Unnamed Map'}&quot;), clearing all placed icons and notes.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={resetCurrentMapGrid}>Continue</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
