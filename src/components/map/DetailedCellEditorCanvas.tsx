
"use client";

import type React from 'react';
import { useState, useEffect } from 'react';
import { useMap } from '@/contexts/MapContext';
import { ICON_CONFIG_MAP } from '@/components/icons';
import { ICON_TYPES, type PlacedIcon, type IconType } from '@/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Trash2, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';


interface DetailedCellEditorCanvasProps {
  rowIndex: number;
  colIndex: number;
  className?: string;
}

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
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);

  const cellData = currentLocalGrid?.[rowIndex]?.[colIndex];

  useEffect(() => {
    // If editingIcon changes, close the popover by default unless a new one is set
    if (!editingIcon) {
      setPopoverAnchor(null);
    }
  }, [editingIcon]);

  let canEdit = false;
  if (user && currentMapData && currentMapData.userId === user.uid) {
    canEdit = true;
  }

  if (isLoadingMapData || !currentMapData) {
    return (
      <div className={cn("relative w-full aspect-square bg-card rounded-lg shadow-xl flex items-center justify-center", className)}>
        <Skeleton className="w-full h-full" />
      </div>
    );
  }
  
  if (!cellData) {
    return (
      <div className={cn("relative w-full aspect-square bg-destructive/10 rounded-lg shadow-xl flex flex-col items-center justify-center p-4 text-center", className)}>
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
    if (!canEdit) return;

    const action = e.dataTransfer.getData("action");
    const canvasRect = e.currentTarget.getBoundingClientRect();
    let x = ((e.clientX - canvasRect.left) / canvasRect.width) * 100;
    let y = ((e.clientY - canvasRect.top) / canvasRect.height) * 100;

    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    if (action === "move") {
      const placedIconId = e.dataTransfer.getData("placedIconId");
      if (placedIconId) {
        updatePlacedIconPositionInCell(rowIndex, colIndex, placedIconId, x, y);
      }
    } else { 
      const iconTypeString = e.dataTransfer.getData("iconType");
      if (ICON_TYPES.includes(iconTypeString as IconType)) {
        const iconType = iconTypeString as IconType;
        addPlacedIconToCell(rowIndex, colIndex, iconType, x, y);
      }
    }
  };

  const handlePlacedIconDragStart = (e: React.DragEvent<HTMLDivElement>, placedIcon: PlacedIcon) => {
    if (!canEdit || editingIcon?.id === placedIcon.id) { // Prevent drag if popover is open for this icon
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("placedIconId", placedIcon.id);
    e.dataTransfer.setData("action", "move");
    e.dataTransfer.effectAllowed = "move";
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>, icon: PlacedIcon) => {
    e.preventDefault();
    if (!canEdit) return;
    setEditingIcon(icon);
    setEditedNote(icon.note || '');
    setPopoverAnchor(e.currentTarget);
  };

  const handleSaveNote = () => {
    if (editingIcon) {
      updatePlacedIconNote(rowIndex, colIndex, editingIcon.id, editedNote);
      toast({ title: "Note Saved", description: "The icon's note has been updated." });
      setEditingIcon(null); // This will close the popover via useEffect or direct open prop
    }
  };

  const handleDeleteIcon = () => {
    if (editingIcon) {
      removePlacedIconFromCell(rowIndex, colIndex, editingIcon.id);
      toast({ title: "Icon Removed", description: "The icon has been removed from this cell." });
      setEditingIcon(null);
    }
  };

  return (
    <div 
      className={cn("relative overflow-hidden", className)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {cellData.placedIcons.map((icon: PlacedIcon) => {
        const Config = ICON_CONFIG_MAP[icon.type];
        if (!Config) return null;
        const IconComponent = Config.IconComponent;
        const tooltipText = icon.note ? `${Config.label}: ${icon.note}` : Config.label;

        return (
          <Popover key={icon.id} open={editingIcon?.id === icon.id} onOpenChange={(isOpen) => { if(!isOpen) setEditingIcon(null);}}>
            <PopoverAnchor asChild>
              <div
                draggable={canEdit && editingIcon?.id !== icon.id} // Only draggable if not currently being edited
                onDragStart={(e) => handlePlacedIconDragStart(e, icon)}
                onContextMenu={(e) => handleContextMenu(e, icon)}
                className={cn(
                  "absolute w-8 h-8", 
                  canEdit ? "cursor-pointer" : "cursor-default",
                  editingIcon?.id === icon.id && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-md z-10"
                )}
                style={{
                  left: `${icon.x}%`,
                  top: `${icon.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                title={tooltipText}
              >
                <IconComponent className="w-full h-full text-primary" />
              </div>
            </PopoverAnchor>
            {editingIcon?.id === icon.id && (
              <PopoverContent 
                className="w-64 p-3" 
                side="bottom" 
                align="center"
                onEscapeKeyDown={() => setEditingIcon(null)}
                onInteractOutside={() => {
                  // Optional: Save on interact outside, or require explicit save.
                  // For now, we close without saving if they click outside without hitting save.
                  // handleSaveNote(); // Uncomment to save on click outside
                  setEditingIcon(null);
                }}
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
                    <Button variant="destructive" size="icon" onClick={handleDeleteIcon} title="Delete Icon">
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
      {cellData.placedIcons.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-muted-foreground text-lg">
            {canEdit ? "Drag resources here" : "No resources placed"}
          </p>
        </div>
      )}
    </div>
  );
}
