
"use client";

import { useState, useEffect } from 'react';
import { useMap } from '@/contexts/MapContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { PlusCircle, Loader2, MapPin, Settings2, Trash2, Copy, ExternalLink, UserPlus, UserX, Link as LinkIcon, RefreshCw, XCircle } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import type { MapData, UserProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Timestamp } from 'firebase/firestore'; 
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


export function MapManager() {
  const {
    userMapList,
    isLoadingMapList,
    selectMap,
    createMap,
    deleteMap,
    updateMapName,
    currentMapData: selectedMapFromContext, // Can be used if needed, but dialog uses its own state
    togglePublicView,
    regeneratePublicViewId,
    addEditorToMap,
    removeEditorFromMap,
    editorProfiles, 
    isLoadingEditorProfiles, 
    fetchEditorProfiles, 
    regenerateCollaboratorShareId,
    disableCollaboratorShareId,
  } = useMap();
  const { user } = useAuth();
  const { toast } = useToast();
  const [newMapName, setNewMapName] = useState('');
  const [isCreatingMap, setIsCreatingMap] = useState(false);

  const [selectedMapForSettings, setSelectedMapForSettings] = useState<MapData | null>(null);
  const [settingsMapName, setSettingsMapName] = useState('');
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false); // General flag for any setting update
  const [publicLinkBase, setPublicLinkBase] = useState('');
  const [newEditorUid, setNewEditorUid] = useState('');
  const [isManagingEditors, setIsManagingEditors] = useState(false);


  useEffect(() => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) {
      setPublicLinkBase(appUrl.replace(/\/$/, ''));
    } else if (typeof window !== "undefined") {
      setPublicLinkBase(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (selectedMapForSettings?.id && userMapList.length > 0) {
      const mapInDialogId = selectedMapForSettings.id;
      const freshMapDataFromList = userMapList.find(m => m.id === mapInDialogId);

      if (freshMapDataFromList) {
        let needsUpdate = false;
        if (JSON.stringify(selectedMapForSettings) !== JSON.stringify(freshMapDataFromList)) {
            needsUpdate = true;
        }
        
        if (needsUpdate) {
            setSelectedMapForSettings(freshMapDataFromList);
            if (settingsMapName !== freshMapDataFromList.name && document.activeElement?.id !== 'settingsMapNameInput') {
                setSettingsMapName(freshMapDataFromList.name);
            }
            if (JSON.stringify(selectedMapForSettings.editors) !== JSON.stringify(freshMapDataFromList.editors) && freshMapDataFromList.editors && freshMapDataFromList.editors.length > 0) {
              fetchEditorProfiles(freshMapDataFromList.editors);
            }
        }
      } else {
        setSelectedMapForSettings(null);
      }
    }
  }, [userMapList, selectedMapForSettings, settingsMapName, fetchEditorProfiles]);


  const handleCreateMap = async () => {
    if (!newMapName.trim()) {
      toast({title: "Validation Error", description: "Please enter a map name.", variant: "destructive"});
      return;
    }
    setIsCreatingMap(true);
    await createMap(newMapName.trim());
    setNewMapName('');
    setIsCreatingMap(false);
  };

  const openSettingsDialog = (map: MapData) => {
    setSelectedMapForSettings(map);
    setSettingsMapName(map.name);
    setNewEditorUid(''); 
    if (map.editors && map.editors.length > 0) {
      fetchEditorProfiles(map.editors);
    }
  };

  const handleUpdateNameSetting = async () => {
    if (!selectedMapForSettings || !settingsMapName.trim() || !user) return;
    if (selectedMapForSettings.ownerId !== user.uid) {
      toast({title: "Permission Denied", description: "Only the owner can change the map name.", variant: "destructive"});
      return;
    }
    setIsUpdatingSettings(true);
    try {
      await updateMapName(selectedMapForSettings.id, settingsMapName.trim());
    } catch (error) { /* Handled by context */ }
    finally { setIsUpdatingSettings(false); }
  };

  const handleTogglePublicView = async (mapId: string, enable: boolean) => {
    if (!selectedMapForSettings || selectedMapForSettings.id !== mapId || !user) return; 
    if (selectedMapForSettings.ownerId !== user.uid) {
      toast({title: "Permission Denied", description: "Only the owner can change public sharing.", variant: "destructive"});
      return;
    }
    setIsUpdatingSettings(true);
    await togglePublicView(mapId, enable);
    setIsUpdatingSettings(false);
  };

  const handleRegeneratePublicViewId = async (mapId: string) => {
     if (!selectedMapForSettings || selectedMapForSettings.id !== mapId || !user) return; 
     if (selectedMapForSettings.ownerId !== user.uid) {
      toast({title: "Permission Denied", description: "Only the owner can regenerate public links.", variant: "destructive"});
      return;
    }
    setIsUpdatingSettings(true);
    await regeneratePublicViewId(mapId);
    setIsUpdatingSettings(false);
  };

  const handleAddEditor = async () => {
    if (!selectedMapForSettings || !newEditorUid.trim() || !user) return;
    if (selectedMapForSettings.ownerId !== user.uid) {
      toast({title: "Permission Denied", description: "Only the owner can add editors.", variant: "destructive"});
      return;
    }
    setIsManagingEditors(true);
    await addEditorToMap(selectedMapForSettings.id, newEditorUid.trim());
    setNewEditorUid('');
    setIsManagingEditors(false);
  };

  const handleRemoveEditor = async (editorUidToRemove: string) => {
    if (!selectedMapForSettings || !editorUidToRemove || !user) return;
     if (selectedMapForSettings.ownerId !== user.uid) {
      toast({title: "Permission Denied", description: "Only the owner can remove editors.", variant: "destructive"});
      return;
    }
    setIsManagingEditors(true);
    await removeEditorFromMap(selectedMapForSettings.id, editorUidToRemove);
    setIsManagingEditors(false);
  };

  const handleRegenerateCollaboratorShareId = async (mapId: string) => {
    if (!selectedMapForSettings || selectedMapForSettings.id !== mapId || !user) return;
    if (selectedMapForSettings.ownerId !== user.uid) {
      toast({title: "Permission Denied", description: "Only the owner can manage invite links.", variant: "destructive"});
      return;
    }
    setIsUpdatingSettings(true);
    await regenerateCollaboratorShareId(mapId);
    setIsUpdatingSettings(false);
  };

  const handleDisableCollaboratorShareId = async (mapId: string) => {
    if (!selectedMapForSettings || selectedMapForSettings.id !== mapId || !user) return;
    if (selectedMapForSettings.ownerId !== user.uid) {
      toast({title: "Permission Denied", description: "Only the owner can manage invite links.", variant: "destructive"});
      return;
    }
    setIsUpdatingSettings(true);
    await disableCollaboratorShareId(mapId);
    setIsUpdatingSettings(false);
  };


  const copyToClipboard = (text: string, message: string = "Link copied to clipboard.") => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied!", description: message });
    }).catch(err => {
      toast({ title: "Error", description: "Could not copy link.", variant: "destructive" });
    });
  };

  const getFormattedDate = (dateValue: Timestamp | string | undefined) => {
    if (!dateValue) return 'N/A';
    
    let date: Date;
    if (dateValue instanceof Timestamp) {
        date = dateValue.toDate();
    } else if (typeof dateValue === 'string') {
        date = parseISO(dateValue);
    } else {
        if (typeof dateValue === 'object' && 'seconds' in dateValue && 'nanoseconds' in dateValue) {
          try {
            date = new Timestamp((dateValue as any).seconds, (dateValue as any).nanoseconds).toDate();
          } catch {
            return 'Processing date...';
          }
        } else {
          return 'Invalid date';
        }
    }
    return formatDistanceToNow(date, { addSuffix: true });
  };

  if (isLoadingMapList) {
    return (
      <div className="flex flex-col items-center justify-center flex-grow p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your maps...</p>
      </div>
    );
  }

  const ownedMaps = userMapList.filter(map => user && map.ownerId === user.uid);
  const sharedMaps = userMapList.filter(map => user && map.ownerId !== user.uid);

  const renderMapCard = (map: MapData) => {
    const isMapOwner = user && map.ownerId === user.uid;
    const mapRole = isMapOwner ? "Owner" : (map.editors?.includes(user?.uid || '') ? "Editor" : "Viewer (indirectly)");
    return (
      <Card key={map.id} className="flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-xl group-hover:text-primary transition-colors mb-1">{map.name}</CardTitle>
          </div>
          <CardDescription>
            Role: {mapRole} <br/>
            Last updated {getFormattedDate(map.updatedAt)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
        </CardContent>
        <CardFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
          <Button onClick={() => selectMap(map.id)} className="w-full sm:w-auto flex-grow">
            View Map
          </Button>
            {(isMapOwner || map.editors?.includes(user?.uid || '')) && (
            <div className="flex gap-2 w-full sm:w-auto">
              <TooltipProvider>
                <Dialog onOpenChange={(isOpen) => { if (!isOpen) setSelectedMapForSettings(null); }}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DialogTrigger asChild>
                          <Button variant="outline" size="icon" onClick={() => openSettingsDialog(map)}>
                              <Settings2 className="h-4 w-4" />
                          </Button>
                      </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent><p>Settings</p></TooltipContent>
                  </Tooltip>
                  {selectedMapForSettings && selectedMapForSettings.id === map.id && (
                  <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                          <DialogTitle>Map Settings: {selectedMapForSettings.name}</DialogTitle>
                          <DialogDescription>Manage your map&apos;s details and sharing options.</DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="max-h-[calc(100vh-200px)]">
                        <div className="space-y-4 p-1 pr-4">
                          {isMapOwner && (
                            <>
                              <div>
                                  <Label htmlFor="settingsMapNameInput" className="text-sm font-medium">Map Name</Label>
                                  <Input id="settingsMapNameInput" value={settingsMapName} onChange={e => setSettingsMapName(e.target.value)} className="mt-1" disabled={isUpdatingSettings || !isMapOwner} />
                              </div>
                              <Separator />
                            </>
                          )}
                          
                          {isMapOwner && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Editors (UID)</h4>
                              <div className="flex items-center gap-2 mb-2">
                                <Input 
                                  id="newEditorUidInput" 
                                  placeholder="Enter User ID to add" 
                                  value={newEditorUid} 
                                  onChange={e => setNewEditorUid(e.target.value)} 
                                  className="flex-grow"
                                  disabled={isManagingEditors || !isMapOwner}
                                />
                                <Button onClick={handleAddEditor} size="sm" disabled={isManagingEditors || !newEditorUid.trim() || !isMapOwner}>
                                  {isManagingEditors ? <Loader2 className="h-4 w-4 animate-spin"/> : <UserPlus className="h-4 w-4"/>}
                                </Button>
                              </div>
                              {selectedMapForSettings.editors && selectedMapForSettings.editors.length > 0 ? (
                                <ul className="space-y-1 text-xs max-h-32 overflow-y-auto border rounded-md p-2 bg-muted/50">
                                  {selectedMapForSettings.editors.map(editorId => {
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
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveEditor(editorId)} className="h-6 w-6" disabled={isManagingEditors || !isMapOwner}>
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

                          {isMapOwner && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Editor Invite Link</h4>
                              {selectedMapForSettings.collaboratorShareId && publicLinkBase ? (
                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground break-all">
                                        Share this invite link: <br />
                                        <a
                                          href={`${publicLinkBase}/join/${selectedMapForSettings.collaboratorShareId}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline"
                                        >
                                          {`${publicLinkBase}/join/${selectedMapForSettings.collaboratorShareId}`}
                                          <ExternalLink className="inline-block h-3 w-3 ml-1"/>
                                        </a>
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(`${publicLinkBase}/join/${selectedMapForSettings.collaboratorShareId}`, "Invite link copied!")} disabled={isUpdatingSettings} >
                                            <Copy className="mr-2 h-3 w-3" /> Copy Invite
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => handleRegenerateCollaboratorShareId(map.id)} disabled={isUpdatingSettings} >
                                            <RefreshCw className="mr-2 h-3 w-3" /> Regenerate
                                        </Button>
                                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDisableCollaboratorShareId(map.id)} disabled={isUpdatingSettings} >
                                            <XCircle className="mr-2 h-3 w-3" /> Disable
                                        </Button>
                                    </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">No active invite link. Generate one to allow others to join as editors.</p>
                                    <Button variant="default" size="sm" onClick={() => handleRegenerateCollaboratorShareId(map.id)} disabled={isUpdatingSettings} >
                                        <LinkIcon className="mr-2 h-3 w-3" /> Generate Invite Link
                                    </Button>
                                </div>
                              )}
                              <Separator className="my-4" />
                            </div>
                          )}

                          {isMapOwner && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Public View-Only Link</h4>
                              <div className="flex items-center space-x-2 mb-2">
                                <Switch
                                  id={`public-view-switch-${map.id}`}
                                  checked={selectedMapForSettings.isPublicViewable} 
                                  onCheckedChange={(checked) => handleTogglePublicView(map.id, checked)}
                                  disabled={isUpdatingSettings || !isMapOwner}
                                />
                                <Label htmlFor={`public-view-switch-${map.id}`}>
                                  {selectedMapForSettings.isPublicViewable ? "Public Link Enabled" : "Public Link Disabled"}
                                </Label>
                              </div>
                              {selectedMapForSettings.isPublicViewable && selectedMapForSettings.publicViewId && publicLinkBase && (
                                <div className="space-y-2">
                                  <p className="text-xs text-muted-foreground break-all">
                                    Share this link for view-only access: <br />
                                    <a
                                      href={`${publicLinkBase}/view/map/${selectedMapForSettings.publicViewId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline"
                                    >
                                      {`${publicLinkBase}/view/map/${selectedMapForSettings.publicViewId}`}
                                      <ExternalLink className="inline-block h-3 w-3 ml-1"/>
                                    </a>
                                  </p>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => copyToClipboard(`${publicLinkBase}/view/map/${selectedMapForSettings.publicViewId}`)}
                                      disabled={isUpdatingSettings || !publicLinkBase || !isMapOwner}
                                    >
                                      <Copy className="mr-2 h-3 w-3" /> Copy Link
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleRegeneratePublicViewId(map.id)}
                                      disabled={isUpdatingSettings || !isMapOwner}
                                    >
                                      {isUpdatingSettings && selectedMapForSettings.publicViewId ? <Loader2 className="mr-2 h-3 w-3 animate-spin"/> : <RefreshCw className="h-3 w-3" />}
                                      Regenerate
                                    </Button>
                                  </div>
                                </div>
                              )}
                              {!selectedMapForSettings.isPublicViewable && (
                                <p className="text-xs text-muted-foreground">Enable the switch to generate and share a public view-only link.</p>
                              )}
                            </div>
                          )}

                          {!isMapOwner && (
                            <p className="text-sm text-muted-foreground">You are an editor for this map. Some settings can only be managed by the owner.</p>
                          )}
                        </div>
                      </ScrollArea>
                      <DialogFooter className="mt-4">
                          <DialogClose asChild><Button variant="ghost" onClick={() => setSelectedMapForSettings(null)} disabled={isUpdatingSettings || isManagingEditors}>Cancel</Button></DialogClose>
                          {isMapOwner && (
                            <DialogClose asChild>
                              <Button onClick={handleUpdateNameSetting} disabled={isUpdatingSettings || isManagingEditors || !settingsMapName.trim() || !isMapOwner}>
                                {(isUpdatingSettings || isManagingEditors) && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save & Close
                              </Button>
                            </DialogClose>
                          )}
                          {!isMapOwner && ( 
                            <DialogClose asChild>
                                <Button disabled={isUpdatingSettings || isManagingEditors}>Close</Button>
                            </DialogClose>
                          )}
                      </DialogFooter>
                  </DialogContent>
                  )}
                </Dialog>
              </TooltipProvider>
              {isMapOwner && ( 
                <TooltipProvider>
                  <Dialog>
                    <Tooltip>
                      <TooltipTrigger asChild>
                          <DialogTrigger asChild>
                              <Button variant="destructive" size="icon">
                                  <Trash2 className="h-4 w-4" />
                              </Button>
                          </DialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent><p>Delete Map</p></TooltipContent>
                    </Tooltip>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Delete Map: {map.name}</DialogTitle></DialogHeader>
                        <DialogDescription>Are you sure you want to delete this map? This action cannot be undone.</DialogDescription>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                            <Button variant="destructive" onClick={() => deleteMap(map.id)}>Delete</Button>
                        </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </TooltipProvider>
              )}
            </div>
          )}
        </CardFooter>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-semibold text-primary">Your Maps</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-5 w-5" /> Create New Map
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Map</DialogTitle>
              <DialogDescription>
                Give your new Arrakis map a name. You can change this later.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Input
                id="newMapNameInput"
                placeholder="E.g., My Guild's Map"
                value={newMapName}
                onChange={(e) => setNewMapName(e.target.value)}
                disabled={isCreatingMap}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={isCreatingMap}>Cancel</Button>
              </DialogClose>
              <Button onClick={handleCreateMap} disabled={isCreatingMap || !newMapName.trim()}>
                {isCreatingMap ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Map
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {userMapList.length === 0 ? (
        <Card className="text-center py-12">
          <CardHeader>
            <MapPin className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <CardTitle>No Maps Yet</CardTitle>
            <CardDescription>
              It looks like you haven&apos;t created any maps. Get started by creating your first one!
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-12">
          <section>
            <h3 className="text-2xl font-semibold text-primary/80 mb-6">Your Maps</h3>
            {ownedMaps.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {ownedMaps.map(renderMapCard)}
              </div>
            ) : (
               <Card className="text-center py-8">
                <CardHeader>
                  <CardTitle className="text-base font-normal text-muted-foreground">You haven&apos;t created any maps yet.</CardTitle>
                  <CardDescription>Click &quot;Create New Map&quot; to begin.</CardDescription>
                </CardHeader>
              </Card>
            )}
          </section>

          {sharedMaps.length > 0 && (
            <section>
              <h3 className="text-2xl font-semibold text-primary/80 mb-6">Shared With You</h3>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sharedMaps.map(renderMapCard)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
