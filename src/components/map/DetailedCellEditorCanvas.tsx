
"use client";

import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useMap } from '@/contexts/MapContext';
import { ICON_CONFIG_MAP } from '@/components/icons';
import { ICON_TYPES, type PlacedIcon, type IconType } from '@/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Trash2, Edit3, ImageIcon } from 'lucide-react'; // Added Edit3
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Image from 'next/image';

interface DetailedCellEditorCanvasProps {
  rowIndex: number;
  colIndex: number;
  className?: string;
}

// Component for rendering the visual part of the icon
interface PlacedIconVisualProps extends React.HTMLAttributes<HTMLDivElement> {
  iconData: PlacedIcon;
  isEditingThisIcon: boolean; // Used for styling the editing ring
  canEdit: boolean;
  onContextMenuHandler?: (e: React.MouseEvent<HTMLDivElement>) => void; // Optional for icons without notes
}

const PlacedIconVisual: React.FC<PlacedIconVisualProps> = ({
  iconData,
  isEditingThisIcon,
  canEdit,
  onContextMenuHandler,
  ...divProps
}) => {
  const Config = ICON_CONFIG_MAP[iconData.type];
  if (!Config) return null;
  const IconComponent = Config.IconComponent;

  return (
    <div
      {...divProps} // Includes draggable, onDragStart from commonDivProps
      onContextMenu={onContextMenuHandler} // Conditionally applied for icons w/o notes
      className={cn(
        "absolute w-8 h-8 z-[1]", // Base z-index for icons
        canEdit ? "cursor-pointer" : "cursor-default",
        isEditingThisIcon && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-md z-[2]", // Higher z-index when editing
        divProps.className
      )}
      style={{
        left: `${iconData.x}%`,
        top: `${iconData.y}%`,
        transform: 'translate(-50%, -50%)',
        ...divProps.style,
      }}
    >
      <IconComponent className="w-full h-full text-primary" />
    </div>
  );
};


export function DetailedCellEditorCanvas({ rowIndex, colIndex, className }: DetailedCellEditorCanvasProps) {
  const {
    currentLocalGrid,
    isLoadingMapData,
    currentMapData,
    addPlacedIconToCell,
    updatePlacedIconPositionInCell,
    removePlacedIconFromCell,
    updatePlacedIconNote
  } = useMap();
  const { user } = useAuth();
  const { toast } = useToast();

  const [editingIcon, setEditingIcon] = useState<PlacedIcon | null>(null);
  const [editedNote, setEditedNote] = useState<string>('');
  const canvasRef = useRef<HTMLDivElement>(null);

  const cellData = currentLocalGrid?.[rowIndex]?.[colIndex];

  useEffect(() => {
    // No specific anchor needed for popover as PopoverAnchor is used
  }, [editingIcon]);

  let canEdit = false;
  if (user && currentMapData && currentMapData.userId === user.uid) {
    canEdit = true;
  }

  if (isLoadingMapData || !currentMapData) {
    return (
      <div className={cn("relative w-full aspect-square bg-card rounded-lg shadow-xl flex items-center justify-center border border-border", className)}>
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (!cellData) {
    return (
      <div className={cn("relative w-full aspect-square bg-destructive/10 rounded-lg shadow-xl flex flex-col items-center justify-center p-4 text-center border border-border", className)}>
        <AlertTriangle className="h-10 w-10 text-destructive mb-2" />
        <p className="text-sm text-destructive-foreground">Cell data not available.</p>
      </div>
    );
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (canEdit) {
      e.dataTransfer.dropEffect = e.dataTransfer.getData("action") === "move" ? "move" : "copy";
    } else {
      e.dataTransfer.dropEffect = "none";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!canEdit || !canvasRef.current) return;

    const action = e.dataTransfer.getData("action");
    const canvasRect = canvasRef.current.getBoundingClientRect();
    let x = ((e.clientX - canvasRect.left) / canvasRect.width) * 100;
    let y = ((e.clientY - canvasRect.top) / canvasRect.height) * 100;

    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    if (action === "move") {
      const placedIconId = e.dataTransfer.getData("placedIconId");
      if (placedIconId) {
        updatePlacedIconPositionInCell(rowIndex, colIndex, placedIconId, x, y);
      }
    } else if (action === "add") {
      const iconTypeString = e.dataTransfer.getData("iconType");
      if (ICON_TYPES.includes(iconTypeString as IconType)) {
        const iconType = iconTypeString as IconType;
        addPlacedIconToCell(rowIndex, colIndex, iconType, x, y);
      }
    }
  };

  const handlePlacedIconDragStart = (e: React.DragEvent<HTMLDivElement>, placedIcon: PlacedIcon) => {
    if (!canEdit || editingIcon?.id === placedIcon.id) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("placedIconId", placedIcon.id);
    e.dataTransfer.setData("action", "move");
    e.dataTransfer.effectAllowed = "move";
  };

  // For icons WITHOUT notes, right-click opens popover
  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>, icon: PlacedIcon) => {
    e.preventDefault();
    if (!canEdit) return;
    setEditingIcon(icon);
    setEditedNote(icon.note || '');
  };

  // For icons WITH notes, click "Edit Note" in tooltip to open popover
  const handleEditIconFromTooltip = (icon: PlacedIcon) => {
    if (!canEdit) return;
    setEditingIcon(icon);
    setEditedNote(icon.note || '');
  };

  // For icons WITH notes, click "Delete Icon" in tooltip
  const handleDeleteIconFromTooltip = (icon: PlacedIcon) => {
    if (!canEdit) return;
    removePlacedIconFromCell(rowIndex, colIndex, icon.id);
    toast({ title: "Icon Removed", description: "The icon has been removed from this cell." });
    if (editingIcon?.id === icon.id) {
      setEditingIcon(null); // Close popover if it was open for this icon
    }
  };


  const handleSaveNote = () => {
    if (editingIcon) {
      updatePlacedIconNote(rowIndex, colIndex, editingIcon.id, editedNote);
      toast({ title: "Note Saved", description: "The icon's note has been updated." });
      setEditingIcon(null);
    }
  };

  const handleDeleteIconFromPopover = () => {
    if (editingIcon) {
      removePlacedIconFromCell(rowIndex, colIndex, editingIcon.id);
      toast({ title: "Icon Removed", description: "The icon has been removed from this cell." });
      setEditingIcon(null);
    }
  };

  return (
    <div
      ref={canvasRef}
      className={cn("relative overflow-hidden", className)} // Ensure parent has bg if image is transparent
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {cellData.backgroundImageUrl && (
        <Image
          src={cellData.backgroundImageUrl}
          alt="Cell background"
          layout="fill"
          objectFit="contain" // Or "cover" depending on desired behavior
          className="pointer-events-none" // No z-index needed, will be behind positive z-indexed icons
          priority // If this image is LCP
          data-ai-hint="map texture"
        />
      )}
      {cellData.placedIcons.map((icon: PlacedIcon) => {
        const Config = ICON_CONFIG_MAP[icon.type];
        if (!Config) return null;

        const commonVisualProps = { // Props for PlacedIconVisual
          draggable: canEdit && editingIcon?.id !== icon.id,
          onDragStart: (e: React.DragEvent<HTMLDivElement>) => handlePlacedIconDragStart(e, icon),
        };

        const hasNote = icon.note && icon.note.trim() !== '';

        return (
          <Popover key={icon.id} open={editingIcon?.id === icon.id} onOpenChange={(isOpen) => { if (!isOpen) setEditingIcon(null); }}>
            <PopoverAnchor asChild>
              {hasNote ? (
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {/* For icons WITH notes, no direct onContextMenuHandler to trigger popover */}
                      <PlacedIconVisual
                        iconData={icon}
                        isEditingThisIcon={editingIcon?.id === icon.id}
                        canEdit={canEdit}
                        {...commonVisualProps}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center" className="max-w-xs p-2">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{Config.label}</p>
                        <p className="text-sm whitespace-pre-wrap">{icon.note}</p>
                        {canEdit && (
                          <div className="flex justify-end space-x-1 pt-1 border-t border-border mt-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" title="Edit Note" onClick={() => handleEditIconFromTooltip(icon)}>
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" title="Delete Icon" onClick={() => handleDeleteIconFromTooltip(icon)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                // For icons WITHOUT notes, onContextMenuHandler opens the Popover
                <PlacedIconVisual
                  iconData={icon}
                  isEditingThisIcon={editingIcon?.id === icon.id}
                  canEdit={canEdit}
                  onContextMenuHandler={(e) => handleContextMenu(e, icon)}
                  {...commonVisualProps}
                />
              )}
            </PopoverAnchor>
            {/* PopoverContent for editing note (and delete) remains mostly the same */}
            {editingIcon?.id === icon.id && canEdit && (
              <PopoverContent
                className="w-64 p-3 z-20" // Ensure popover is above other elements
                side="bottom"
                align="center"
                onEscapeKeyDown={() => setEditingIcon(null)}
                onInteractOutside={() => setEditingIcon(null)}
              >
                <div className="space-y-2">
                  <Label htmlFor={`note-${icon.id}`} className="text-sm font-medium leading-none">Edit Note for {Config.label}</Label>
                  <Textarea
                    id={`note-${icon.id}`}
                    value={editedNote}
                    onChange={(e) => setEditedNote(e.target.value)}
                    placeholder="Add a note..."
                    className="min-h-[60px] text-sm"
                  />
                  <div className="flex justify-between items-center pt-1">
                    <Button variant="destructive" size="icon" onClick={handleDeleteIconFromPopover} title="Delete Icon">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="flex gap-2">
                       <Button variant="ghost" size="sm" onClick={() => setEditingIcon(null)}>Cancel</Button>
                       <Button size="sm" onClick={handleSaveNote}>Save</Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            )}
          </Popover>
        );
      })}
      {cellData.placedIcons.length === 0 && !cellData.backgroundImageUrl && (
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <p className="text-muted-foreground text-lg p-4 text-center bg-background/50 rounded-md">
            {canEdit ? "Drag markers or upload background" : <><ImageIcon className="inline-block h-5 w-5 mr-1" /> No markers or background</>}
          </p>
        </div>
      )}
    </div>
  );
}
    
