
"use client";

import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { ICON_TYPES, type IconType, type MapData, type GridCellData } from '@/types';
import { ICON_CONFIG_MAP } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Trash2, X as XIcon, Upload, Loader2, ImageIcon } from 'lucide-react';
import { useMap } from '@/contexts/MapContext';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GRID_SIZE } from '@/lib/mapUtils';

interface IconSourcePaletteProps {
  rowIndex: number;
  colIndex: number;
  className?: string;
  isReadOnlyOverride?: boolean; 
  mapDataOverride?: MapData;
  cellDataOverride?: GridCellData;
  onCloseOverride?: () => void; 
}

export function IconSourcePalette({ 
  rowIndex, 
  colIndex, 
  className,
  isReadOnlyOverride,
  mapDataOverride,
  cellDataOverride,
  onCloseOverride
}: IconSourcePaletteProps) {
  
  const isContextMode = typeof isReadOnlyOverride === 'undefined' || isReadOnlyOverride === false;

  const context = isContextMode ? useMap() : null;
  const authData = isContextMode ? useAuth() : { user: null, isAuthenticated: false, isLoading: false };
  const { toast } = useToast(); 

  const { user, isAuthenticated } = authData;

  const currentMapData = isContextMode ? context?.currentMapData : mapDataOverride;
  const currentLocalGrid = isContextMode ? context?.currentLocalGrid : null;
  const cellDataSource = isContextMode ? currentLocalGrid?.[rowIndex]?.[colIndex] : cellDataOverride;

  const [cellData, setCellData] = useState(cellDataSource);
  const [localNotes, setLocalNotes] = useState(cellData?.notes || '');
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const newCellData = isContextMode ? context?.currentLocalGrid?.[rowIndex]?.[colIndex] : cellDataOverride;
    setCellData(newCellData);
    setLocalNotes(newCellData?.notes || '');
  }, [isContextMode, context?.currentLocalGrid, rowIndex, colIndex, cellDataOverride, cellData?.notes]);


  const getCellCoordinateLabel = (rIdx: number, cIdx: number): string => {
    const rowLetter = String.fromCharCode(65 + (GRID_SIZE - 1 - rIdx));
    const colNumber = cIdx + 1;
    return `${rowLetter}-${colNumber}`;
  };
  const cellLabel = getCellCoordinateLabel(rowIndex, colIndex);

  let canEdit = false;
  if (isContextMode && context && user && currentMapData) {
    const isOwner = currentMapData.ownerId === user.uid;
    const isEditor = currentMapData.editors && currentMapData.editors.includes(user.uid);
    canEdit = isOwner || isEditor;
  } else if (!isContextMode) { 
    canEdit = !isReadOnlyOverride; 
  }
  
  const isLoading = isContextMode ? context?.isLoadingMapData ?? (authData.isLoading) : false;

  if (isLoading || (isContextMode && !currentMapData)) {
     return (
      <Card className={cn("w-full h-full shadow-lg flex flex-col overflow-hidden border-border bg-card", className)}>
        <CardContent className="p-4 space-y-4">
            <div className="flex justify-between items-center"> <Skeleton className="h-6 w-2/3" /> <Skeleton className="h-7 w-7 rounded-sm" /> </div>
            <Skeleton className="h-5 w-1/3 mb-1" />
            <Skeleton className="h-20 w-full" />
            <Separator/>
            <Skeleton className="h-5 w-1/3 mb-1" />
            <Skeleton className="h-10 w-full" />
            <Separator/>
            <Skeleton className="h-5 w-1/3 mb-1" />
            <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!cellData) {
    return (
      <Card className={cn("w-full h-full shadow-lg flex flex-col items-center justify-center text-center p-8 space-y-4 border-border bg-card", className)}>
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold text-destructive-foreground">Cell Error</h2>
        <p className="text-muted-foreground text-sm"> Detailed cell data is unavailable. </p>
         <Button variant="outline" size="sm" onClick={isContextMode ? () => context?.setFocusedCellCoordinates(null) : onCloseOverride}>
            Close
        </Button>
      </Card>
    );
  }

  const handleNotesInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (canEdit) {
      setLocalNotes(event.target.value);
    }
  };
  
  const handleNotesBlur = () => {
    if (canEdit && cellData && localNotes !== cellData.notes && isContextMode && context?.updateCellNotes) {
      context.updateCellNotes(rowIndex, colIndex, localNotes);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, iconType: IconType) => {
    if (!canEdit || !isContextMode) { 
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("iconType", iconType as string);
    e.dataTransfer.setData("action", "add");
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEdit || !isContextMode || !context?.uploadCellBackgroundImage) return;
    const file = event.target.files?.[0];
    if (file) {
      setIsUploadingBackground(true);
      try {
        await context.uploadCellBackgroundImage(rowIndex, colIndex, file);
      } catch (error) { /* Toast handled in context */ }
      finally {
        setIsUploadingBackground(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveBackground = async () => {
    if (!canEdit || !isContextMode || !context?.removeCellBackgroundImage) return;
    setIsUploadingBackground(true);
    try {
      await context.removeCellBackgroundImage(rowIndex, colIndex);
    } catch (error) { /* Toast handled in context */ }
    finally { setIsUploadingBackground(false); }
  };
  
  const handleClose = () => {
    if (isContextMode && context?.setFocusedCellCoordinates) {
      context.setFocusedCellCoordinates(null);
    } else if (onCloseOverride) {
      onCloseOverride();
    }
  };

  return (
    <Card className={cn("w-full h-full shadow-lg flex flex-col overflow-hidden border-border bg-card", className)}>
      <CardContent className="flex-grow flex flex-col p-3 md:p-4 overflow-hidden">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-base font-semibold leading-none text-foreground">Details for {cellLabel}</h4>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleClose}
            aria-label="Close editor"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex justify-between items-center mb-0 mt-2">
            <h5 className="text-sm font-medium text-foreground">Markers</h5>
            {canEdit && isContextMode && context?.clearAllPlacedIconsInCell && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                          context.clearAllPlacedIconsInCell(rowIndex, colIndex);
                          setTimeout(() => toast({ title: "Cell Cleared", description: "All icons removed from this cell."}), 0);
                      }}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      disabled={!canEdit || cellData.placedIcons.length === 0}
                      aria-label="Clear all markers from cell"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"> <p>Clear Cell Markers</p> </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
        </div>
        <ScrollArea className="flex-shrink pr-1 max-h-[200px] min-h-[100px]">
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 border-t border-border pt-1.5">
            {ICON_TYPES.map((iconType) => {
              const config = ICON_CONFIG_MAP[iconType];
              const Icon = config.IconComponent;
              return (
                <div
                  key={iconType}
                  onDragStart={(e) => handleDragStart(e, iconType)}
                  draggable={canEdit && isContextMode} 
                  title={(canEdit && isContextMode) ? `Drag to add ${config.label}` : config.label}
                  className={cn(
                    "text-sm font-normal flex items-center p-1.5 rounded-md border border-transparent transition-colors group", 
                    (canEdit && isContextMode) ? "cursor-grab active:cursor-grabbing hover:bg-accent/50 hover:border-accent" : "cursor-not-allowed opacity-70",
                    "text-muted-foreground bg-card hover:text-accent-foreground"
                  )}
                >
                  <Icon className={cn("mr-1.5 h-5 w-5 text-primary", !canEdit && "opacity-70")} />
                  <span className="truncate">{config.label}</span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        
        <Separator className="my-3" />

        <h5 className="text-sm font-medium text-foreground mb-1">Cell Background</h5>
        {canEdit && isContextMode && (
          <div className="flex gap-2 mb-2">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploadingBackground}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="flex-1 text-xs px-2 h-8"
              disabled={isUploadingBackground}
            >
              {isUploadingBackground && !cellData.backgroundImageUrl && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              <Upload className="mr-1 h-3 w-3" />
              {cellData.backgroundImageUrl ? 'Replace' : 'Upload'}
            </Button>
            {cellData.backgroundImageUrl && (
              <Button
                onClick={handleRemoveBackground}
                variant="destructive"
                className="flex-1 text-xs px-2 h-8"
                disabled={isUploadingBackground}
              >
                {isUploadingBackground && cellData.backgroundImageUrl && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                <Trash2 className="mr-1 h-3 w-3" />
                Remove
              </Button>
            )}
          </div>
        )}
        {(!canEdit || !isContextMode) && !cellData.backgroundImageUrl && ( 
            <div className="flex items-center justify-center text-xs text-muted-foreground p-2 border border-dashed rounded-md mb-2">
                <ImageIcon className="mr-2 h-4 w-4" /> No background image.
            </div>
        )}
         {cellData.backgroundImageUrl && (!canEdit || !isContextMode) && ( 
          <div className="flex items-center justify-center text-xs text-muted-foreground p-2 border border-dashed rounded-md mb-2">
            <ImageIcon className="mr-2 h-4 w-4" /> Background image present.
          </div>
        )}

        <Separator className="my-3" />

        <div className="flex-grow flex flex-col mt-1">
          <Label htmlFor="cell-notes" className="text-sm font-medium text-foreground mb-1 block">
            Cell Notes
          </Label>
          <Textarea
            id="cell-notes"
            value={localNotes}
            onChange={handleNotesInputChange}
            onBlur={handleNotesBlur}
            placeholder={canEdit ? "Add general notes for this cell..." : "No notes or view only."}
            className="min-h-[150px] w-full text-sm bg-input placeholder:text-muted-foreground flex-grow"
            aria-label="Cell notes"
            disabled={!canEdit}
            readOnly={!canEdit}
          />
        </div>
      </CardContent>
    </Card>
  );
}
