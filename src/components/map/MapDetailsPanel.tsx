
"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import type { MapData, UserProfile } from '@/types';
import type { User } from 'firebase/auth';
import { useMap } from '@/contexts/MapContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Users, Clock, Crown, Loader2, X as XIcon, RotateCcw, Settings2, Copy, ExternalLink, UserPlus, UserX, Link as LinkIcon, RefreshCw, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog'; // Added AlertDialog imports
import { useToast } from '@/hooks/use-toast';


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
    isLoadingMapData: isContextLoadingMapData,
    updateMapName,
    togglePublicView,
    regeneratePublicViewId,
    addEditorToMap,
    removeEditorFromMap,
    regenerateCollaboratorShareId,
    disableCollaboratorShareId,
  } = useMap();
  const { toast } = useToast();

  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [localSettingsMapName, setLocalSettingsMapName] = useState(mapData.name);
  const [localNewEditorUid, setLocalNewEditorUid] = useState('');
  const [isUpdatingSettingsDialog, setIsUpdatingSettingsDialog] = useState(false);
  const [publicLinkBase, setPublicLinkBase] = useState('');


  useEffect(() => {
    setLocalSettingsMapName(mapData.name); // Keep local dialog name in sync if mapData prop changes
  }, [mapData.name]);

  useEffect(() => {
    const uidsInPanel = [mapData.ownerId, ...(mapData.editors || [])];
    const uidsToFetch = uidsInPanel.filter(uid => uid && typeof editorProfiles[uid] === 'undefined');
    
    if (uidsToFetch.length > 0) {
      fetchEditorProfiles(uidsToFetch);
    }
  }, [mapData.ownerId, mapData.editors, editorProfiles, fetchEditorProfiles]);

  useEffect(() => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) {
      setPublicLinkBase(appUrl.replace(/\/$/, ''));
    } else if (typeof window !== "undefined") {
      setPublicLinkBase(window.location.origin);
    }
  }, []);


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

  const copyToClipboard = (text: string, message: string = "Link copied to clipboard.") => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied!", description: message });
    }).catch(err => {
      toast({ title: "Error", description: "Could not copy link.", variant: "destructive" });
    });
  };

  const handleDialogUpdateName = async () => {
    if (!localSettingsMapName.trim() || !isCurrentUserOwner) return;
    setIsUpdatingSettingsDialog(true);
    try {
      await updateMapName(mapData.id, localSettingsMapName.trim());
    } catch (error) { /* Handled by context */ }
    finally { setIsUpdatingSettingsDialog(false); }
  };

  const handleDialogAddEditor = async () => {
    if (!localNewEditorUid.trim() || !isCurrentUserOwner) return;
    setIsUpdatingSettingsDialog(true);
    await addEditorToMap(mapData.id, localNewEditorUid.trim());
    setLocalNewEditorUid(''); // Clear input after attempting to add
    setIsUpdatingSettingsDialog(false);
  };

  const handleDialogRemoveEditor = async (editorUidToRemove: string) => {
    if (!editorUidToRemove || !isCurrentUserOwner) return;
    setIsUpdatingSettingsDialog(true);
    await removeEditorFromMap(mapData.id, editorUidToRemove);
    setIsUpdatingSettingsDialog(false);
  };

  const handleDialogTogglePublicView = async (enable: boolean) => {
    if (!isCurrentUserOwner) return;
    setIsUpdatingSettingsDialog(true);
    await togglePublicView(mapData.id, enable);
    setIsUpdatingSettingsDialog(false);
  };

  const handleDialogRegeneratePublicViewId = async () => {
    if (!isCurrentUserOwner) return;
    setIsUpdatingSettingsDialog(true);
    await regeneratePublicViewId(mapData.id);
    setIsUpdatingSettingsDialog(false);
  };

  const handleDialogRegenerateCollaboratorShareId = async () => {
    if (!isCurrentUserOwner) return;
    setIsUpdatingSettingsDialog(true);
    await regenerateCollaboratorShareId(mapData.id);
    setIsUpdatingSettingsDialog(false);
  };

  const handleDialogDisableCollaboratorShareId = async () => {
    if (!isCurrentUserOwner) return;
    setIsUpdatingSettingsDialog(true);
    await disableCollaboratorShareId(mapData.id);
    setIsUpdatingSettingsDialog(false);
  };
  
  const handleDialogSaveAndClose = async () => {
    if (isCurrentUserOwner && localSettingsMapName.trim() && localSettingsMapName !== mapData.name) {
      await handleDialogUpdateName();
    }
    setIsSettingsDialogOpen(false);
  };


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
              <div className="flex gap-2">
                <Dialog open={isSettingsDialogOpen} onOpenChange={(isOpen) => {
                    setIsSettingsDialogOpen(isOpen);
                    if (isOpen) {
                        setLocalSettingsMapName(mapData.name); // Reset name on dialog open
                        setLocalNewEditorUid(''); // Clear editor UID input
                        // Fetch profiles if needed, though it's likely already done by panel load
                        const editorIds = mapData.editors || [];
                        if (editorIds.length > 0) fetchEditorProfiles(editorIds);
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1" disabled={isContextLoadingMapData}>
                            <Settings2 className="mr-2 h-4 w-4" /> Settings
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Map Settings: {mapData.name}</DialogTitle>
                            <DialogDescription>Manage your map's details and sharing options.</DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="max-h-[calc(100vh-240px)]">
                            <div className="space-y-4 p-1 pr-4">
                                {isCurrentUserOwner && (
                                <>
                                    <div>
                                        <Label htmlFor="panelSettingsMapNameInput" className="text-sm font-medium">Map Name</Label>
                                        <Input 
                                          id="panelSettingsMapNameInput" 
                                          value={localSettingsMapName} 
                                          onChange={e => setLocalSettingsMapName(e.target.value)} 
                                          className="mt-1" 
                                          disabled={isUpdatingSettingsDialog || !isCurrentUserOwner} 
                                        />
                                    </div>
                                    <Separator />
                                </>
                                )}
                                
                                {isCurrentUserOwner && (
                                <div>
                                    <h4 className="text-sm font-medium mb-2">Editors (UID)</h4>
                                    <div className="flex items-center gap-2 mb-2">
                                    <Input 
                                        id="panelNewEditorUidInput" 
                                        placeholder="Enter User ID to add" 
                                        value={localNewEditorUid} 
                                        onChange={e => setLocalNewEditorUid(e.target.value)} 
                                        className="flex-grow"
                                        disabled={isUpdatingSettingsDialog || !isCurrentUserOwner}
                                    />
                                    <Button onClick={handleDialogAddEditor} size="sm" disabled={isUpdatingSettingsDialog || !localNewEditorUid.trim() || !isCurrentUserOwner}>
                                        {isUpdatingSettingsDialog && localNewEditorUid.trim() ? <Loader2 className="h-4 w-4 animate-spin"/> : <UserPlus className="h-4 w-4"/>}
                                    </Button>
                                    </div>
                                    {mapData.editors && mapData.editors.length > 0 ? (
                                    <ul className="space-y-1 text-xs max-h-32 overflow-y-auto border rounded-md p-2 bg-muted/50">
                                        {mapData.editors.map(editorId => {
                                        const profile = editorProfiles[editorId];
                                        let displayContent;
                                        if (typeof profile === 'undefined' && isLoadingEditorProfiles) {
                                            displayContent = <><Loader2 className="h-3 w-3 animate-spin mr-1 inline-block" /> {editorId.substring(0,6)}...</>;
                                        } else if (profile && profile.displayName) {
                                            displayContent = profile.displayName;
                                        } else if (profile && !profile.displayName) {
                                            displayContent = `User (${editorId.substring(0,6)}...)`;
                                        } else if (profile === null) {
                                            displayContent = <span className="text-muted-foreground/70">{editorId.substring(0,6)}... (not found)</span>;
                                        } else {
                                            displayContent = editorId.substring(0,6) + '...';
                                        }
                                        return (
                                            <li key={editorId} className="flex justify-between items-center">
                                            <span className="truncate" title={editorId}>{displayContent}</span>
                                            <Button variant="ghost" size="icon" onClick={() => handleDialogRemoveEditor(editorId)} className="h-6 w-6" disabled={isUpdatingSettingsDialog || !isCurrentUserOwner}>
                                                <UserX className="h-3 w-3 text-destructive"/>
                                            </Button>
                                            </li>
                                        );
                                        })}
                                    </ul>
                                    ) : (
                                    <p className="text-xs text-muted-foreground">No other editors yet.</p>
                                    )}
                                    <Separator className="my-4" />
                                </div>
                                )}

                                {isCurrentUserOwner && (
                                <div>
                                    <h4 className="text-sm font-medium mb-2">Editor Invite Link</h4>
                                    {mapData.collaboratorShareId && publicLinkBase ? (
                                    <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground break-all">
                                            Share this invite link: <br />
                                            <a
                                                href={`${publicLinkBase}/join/${mapData.collaboratorShareId}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline"
                                            >
                                                {`${publicLinkBase}/join/${mapData.collaboratorShareId}`}
                                                <ExternalLink className="inline-block h-3 w-3 ml-1"/>
                                            </a>
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            <Button variant="outline" size="sm" onClick={() => copyToClipboard(`${publicLinkBase}/join/${mapData.collaboratorShareId}`, "Invite link copied!")} disabled={isUpdatingSettingsDialog} >
                                                <Copy className="mr-2 h-3 w-3" /> Copy Invite
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={handleDialogRegenerateCollaboratorShareId} disabled={isUpdatingSettingsDialog} >
                                                <RefreshCw className="mr-2 h-3 w-3" /> Regenerate
                                            </Button>
                                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleDialogDisableCollaboratorShareId} disabled={isUpdatingSettingsDialog} >
                                                <XCircle className="mr-2 h-3 w-3" /> Disable
                                            </Button>
                                        </div>
                                    </div>
                                    ) : (
                                    <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground">No active invite link. Generate one to allow others to join as editors.</p>
                                        <Button variant="default" size="sm" onClick={handleDialogRegenerateCollaboratorShareId} disabled={isUpdatingSettingsDialog} >
                                            <LinkIcon className="mr-2 h-3 w-3" /> Generate Invite Link
                                        </Button>
                                    </div>
                                    )}
                                    <Separator className="my-4" />
                                </div>
                                )}

                                {isCurrentUserOwner && (
                                <div>
                                    <h4 className="text-sm font-medium mb-2">Public View-Only Link</h4>
                                    <div className="flex items-center space-x-2 mb-2">
                                    <Switch
                                        id={`panel-public-view-switch-${mapData.id}`}
                                        checked={mapData.isPublicViewable} 
                                        onCheckedChange={(checked) => handleDialogTogglePublicView(checked)}
                                        disabled={isUpdatingSettingsDialog || !isCurrentUserOwner}
                                    />
                                    <Label htmlFor={`panel-public-view-switch-${mapData.id}`}>
                                        {mapData.isPublicViewable ? "Public Link Enabled" : "Public Link Disabled"}
                                    </Label>
                                    </div>
                                    {mapData.isPublicViewable && mapData.publicViewId && publicLinkBase && (
                                    <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground break-all">
                                        Share this link for view-only access: <br />
                                        <a
                                            href={`${publicLinkBase}/view/map/${mapData.publicViewId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline"
                                        >
                                            {`${publicLinkBase}/view/map/${mapData.publicViewId}`}
                                            <ExternalLink className="inline-block h-3 w-3 ml-1"/>
                                        </a>
                                        </p>
                                        <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => copyToClipboard(`${publicLinkBase}/view/map/${mapData.publicViewId}`)}
                                            disabled={isUpdatingSettingsDialog || !publicLinkBase || !isCurrentUserOwner}
                                        >
                                            <Copy className="mr-2 h-3 w-3" /> Copy Link
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleDialogRegeneratePublicViewId}
                                            disabled={isUpdatingSettingsDialog || !isCurrentUserOwner}
                                        >
                                            {isUpdatingSettingsDialog && mapData.publicViewId ? <Loader2 className="mr-2 h-3 w-3 animate-spin"/> : <RefreshCw className="mr-2 h-3 w-3" />}
                                            Regenerate
                                        </Button>
                                        </div>
                                    </div>
                                    )}
                                    {!mapData.isPublicViewable && (
                                    <p className="text-xs text-muted-foreground">Enable the switch to generate and share a public view-only link.</p>
                                    )}
                                </div>
                                )}
                                {!isCurrentUserOwner && (
                                  <p className="text-sm text-muted-foreground">You are an editor for this map. Some settings can only be managed by the owner.</p>
                                )}
                            </div>
                        </ScrollArea>
                        <DialogFooter className="mt-4">
                            <Button variant="ghost" onClick={() => setIsSettingsDialogOpen(false)} disabled={isUpdatingSettingsDialog}>Cancel</Button>
                            {isCurrentUserOwner && (
                              <Button onClick={handleDialogSaveAndClose} disabled={isUpdatingSettingsDialog || !localSettingsMapName.trim()}>
                                  {isUpdatingSettingsDialog && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save & Close
                              </Button>
                            )}
                            {!isCurrentUserOwner && <Button onClick={() => setIsSettingsDialogOpen(false)} disabled={isUpdatingSettingsDialog}>Close</Button>}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="flex-1" disabled={isContextLoadingMapData}>
                      <RotateCcw className="mr-2 h-4 w-4" /> Coriolis Storm
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
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}


    
