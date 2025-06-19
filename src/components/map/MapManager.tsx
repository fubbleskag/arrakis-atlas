
"use client";

import { useState, useEffect } from 'react';
import { useMap } from '@/contexts/MapContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { PlusCircle, Loader2, MapPin, Settings2, Trash2, Copy, ExternalLink } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns'; // Added parseISO
import { useAuth } from '@/contexts/AuthContext';
import type { MapData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '../ui/separator';
import { Timestamp } from 'firebase/firestore'; // Import Timestamp

export function MapManager() {
  const {
    userMapList,
    isLoadingMapList,
    selectMap,
    createMap,
    deleteMap,
    updateMapName,
    currentMapData: selectedMapFromContext,
    togglePublicView,
    regeneratePublicViewId
  } = useMap();
  const { user } = useAuth();
  const { toast } = useToast();
  const [newMapName, setNewMapName] = useState('');
  const [isCreatingMap, setIsCreatingMap] = useState(false);

  const [selectedMapForSettings, setSelectedMapForSettings] = useState<MapData | null>(null);
  const [settingsMapName, setSettingsMapName] = useState('');
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [publicLinkBase, setPublicLinkBase] = useState('');

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPublicLinkBase(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (selectedMapForSettings?.id && userMapList.length > 0) {
      const mapInDialogId = selectedMapForSettings.id;
      const freshMapDataFromList = userMapList.find(m => m.id === mapInDialogId);

      if (freshMapDataFromList) {
        // Deep comparison or specific field check might be better if objects are complex
        // For now, a simple stringify should work for detecting relevant changes like publicViewId or isPublicViewable
        if (JSON.stringify(selectedMapForSettings) !== JSON.stringify(freshMapDataFromList)) {
          setSelectedMapForSettings(freshMapDataFromList);
           // Only update settingsMapName if it's different AND the input isn't focused
          if (settingsMapName !== freshMapDataFromList.name && document.activeElement?.id !== 'settingsMapName') {
             setSettingsMapName(freshMapDataFromList.name);
          }
        }
      } else {
        // If the map is no longer in the list (e.g., deleted elsewhere), close the dialog
        setSelectedMapForSettings(null);
      }
    }
  }, [userMapList, selectedMapForSettings, settingsMapName]);


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
  };

  const handleUpdateNameSetting = async () => {
    if (!selectedMapForSettings || !settingsMapName.trim() || !user) return;
    const isOwner = selectedMapForSettings.ownerId === user.uid;
    if (!isOwner) {
      toast({title: "Permission Denied", description: "You don't have permission to change settings for this map.", variant: "destructive"});
      return;
    }
    setIsUpdatingSettings(true);
    try {
      await updateMapName(selectedMapForSettings.id, settingsMapName.trim());
      // selectedMapForSettings will be updated by the useEffect listening to userMapList
    } catch (error) {
      // Error is handled by updateMapName or context
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleTogglePublicView = async (mapId: string, enable: boolean) => {
    if (!selectedMapForSettings || selectedMapForSettings.id !== mapId) return; 
    setIsUpdatingSettings(true);
    await togglePublicView(mapId, enable);
    setIsUpdatingSettings(false);
  };

  const handleRegeneratePublicViewId = async (mapId: string) => {
     if (!selectedMapForSettings || selectedMapForSettings.id !== mapId) return; 
    setIsUpdatingSettings(true);
    await regeneratePublicViewId(mapId);
    setIsUpdatingSettings(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied!", description: "Link copied to clipboard." });
    }).catch(err => {
      toast({ title: "Error", description: "Could not copy link.", variant: "destructive" });
    });
  };

  const getFormattedDate = (dateValue: Timestamp | string | undefined) => {
    if (!dateValue) return 'N/A';
    const date = dateValue instanceof Timestamp ? dateValue.toDate() : parseISO(dateValue as string);
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
                id="mapName"
                placeholder="E.g., My Personal Map"
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {userMapList.map((map) => {
            const isMapOwner = user && map.ownerId === user.uid;
            return (
              <Card key={map.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl group-hover:text-primary transition-colors mb-1">{map.name}</CardTitle>
                  </div>
                  <CardDescription>
                    Last updated {getFormattedDate(map.updatedAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  {/* Content placeholder */}
                </CardContent>
                <CardFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
                  <Button onClick={() => selectMap(map.id)} className="w-full sm:w-auto flex-grow">
                    View Map
                  </Button>
                  {isMapOwner && (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Dialog onOpenChange={(isOpen) => { if (!isOpen) setSelectedMapForSettings(null); }}>
                          <DialogTrigger asChild>
                              <Button variant="outline" size="icon" title="Settings" onClick={() => openSettingsDialog(map)}>
                                  <Settings2 className="h-4 w-4" />
                              </Button>
                          </DialogTrigger>
                          {selectedMapForSettings && selectedMapForSettings.id === map.id && (
                          <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                  <DialogTitle>Map Settings: {selectedMapForSettings.name}</DialogTitle>
                                  <DialogDescription>Manage your map&apos;s details and sharing options.</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-2">
                                  <div>
                                      <Label htmlFor="settingsMapName" className="text-sm font-medium">Map Name</Label>
                                      <Input id="settingsMapName" value={settingsMapName} onChange={e => setSettingsMapName(e.target.value)} className="mt-1" disabled={isUpdatingSettings} />
                                  </div>
                                  <Separator />
                                  <div>
                                    <h4 className="text-sm font-medium mb-2">Public View-Only Link</h4>
                                    <div className="flex items-center space-x-2 mb-2">
                                      <Switch
                                        id={`public-view-switch-${map.id}`}
                                        checked={selectedMapForSettings.isPublicViewable} 
                                        onCheckedChange={(checked) => handleTogglePublicView(map.id, checked)}
                                        disabled={isUpdatingSettings}
                                      />
                                      <Label htmlFor={`public-view-switch-${map.id}`}>
                                        {selectedMapForSettings.isPublicViewable ? "Public Link Enabled" : "Public Link Disabled"}
                                      </Label>
                                    </div>
                                    {selectedMapForSettings.isPublicViewable && selectedMapForSettings.publicViewId && (
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
                                            disabled={isUpdatingSettings}
                                          >
                                            <Copy className="mr-2 h-3 w-3" /> Copy Link
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleRegeneratePublicViewId(map.id)}
                                            disabled={isUpdatingSettings}
                                          >
                                            {isUpdatingSettings && selectedMapForSettings.publicViewId ? <Loader2 className="mr-2 h-3 w-3 animate-spin"/> : null}
                                            Regenerate Link
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                     {!selectedMapForSettings.isPublicViewable && (
                                      <p className="text-xs text-muted-foreground">Enable the switch to generate and share a public view-only link.</p>
                                    )}
                                  </div>
                              </div>
                              <DialogFooter className="mt-4">
                                  <DialogClose asChild><Button variant="ghost" onClick={() => setSelectedMapForSettings(null)} disabled={isUpdatingSettings}>Cancel</Button></DialogClose>
                                  <DialogClose asChild>
                                    <Button onClick={handleUpdateNameSetting} disabled={isUpdatingSettings || !settingsMapName.trim()}>
                                      {isUpdatingSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save & Close
                                    </Button>
                                  </DialogClose>
                              </DialogFooter>
                          </DialogContent>
                          )}
                      </Dialog>
                      <Dialog>
                          <DialogTrigger asChild>
                              <Button variant="destructive" size="icon" title="Delete Map">
                                  <Trash2 className="h-4 w-4" />
                              </Button>
                          </DialogTrigger>
                          <DialogContent>
                              <DialogHeader><DialogTitle>Delete Map: {map.name}</DialogTitle></DialogHeader>
                              <DialogDescription>Are you sure you want to delete this map? This action cannot be undone.</DialogDescription>
                              <DialogFooter>
                                  <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                                  <Button variant="destructive" onClick={() => deleteMap(map.id)}>Delete</Button>
                              </DialogFooter>
                          </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  );
}
