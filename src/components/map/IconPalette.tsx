
"use client";

import type React from 'react';
import { useState, useEffect } from 'react';
import { ICON_TYPES, type IconType } from '@/types';
import { ICON_CONFIG_MAP } from '@/components/icons';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';

interface IconPaletteProps {
  currentIcons: IconType[];
  onIconChange: (icon: IconType) => void;
  onClearAll: () => void;
  currentNotes: string;
  onNotesChange: (notes: string) => void;
  canEdit: boolean; // Added prop to control editability
}

export function IconPalette({ 
  currentIcons, 
  onIconChange, 
  onClearAll, 
  currentNotes, 
  onNotesChange,
  canEdit 
}: IconPaletteProps) {
  const [localNotes, setLocalNotes] = useState(currentNotes);

  useEffect(() => {
    setLocalNotes(currentNotes);
  }, [currentNotes]);

  const handleNotesInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (canEdit) {
      setLocalNotes(event.target.value);
      onNotesChange(event.target.value);
    }
  };

  return (
    <div className="p-1">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-medium leading-none text-foreground">Edit Resources</h4>
        {canEdit && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearAll} 
            className="text-xs text-muted-foreground hover:text-destructive"
            disabled={!canEdit}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Clear All
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-2 border-t border-border">
        {ICON_TYPES.map((iconType) => {
          const config = ICON_CONFIG_MAP[iconType];
          const Icon = config.IconComponent;
          const isChecked = currentIcons.includes(iconType);
          return (
            <Label 
              key={iconType} 
              htmlFor={`icon-${iconType}`}
              className={cn(
                "text-sm font-normal flex items-center transition-colors", 
                canEdit ? "cursor-pointer hover:text-primary" : "cursor-not-allowed opacity-70",
                isChecked ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Checkbox
                id={`icon-${iconType}`}
                checked={isChecked}
                onCheckedChange={() => canEdit && onIconChange(iconType)}
                aria-label={`Toggle ${config.label}`}
                className="mr-2 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                disabled={!canEdit}
              />
              <Icon className={cn("mr-2 h-5 w-5", isChecked ? "text-primary" : "text-muted-foreground", !canEdit && "opacity-70")} />
              {config.label}
            </Label>
          );
        })}
      </div>
      <Separator className="my-3" />
      <div>
        <Label htmlFor="cell-notes" className="text-sm font-medium text-foreground mb-1 block">
          Notes
        </Label>
        <Textarea
          id="cell-notes"
          value={localNotes}
          onChange={handleNotesInputChange}
          placeholder={canEdit ? "Add notes for this cell..." : "No notes or view only."}
          className="min-h-[80px] w-full text-sm bg-input placeholder:text-muted-foreground"
          aria-label="Cell notes"
          disabled={!canEdit}
          readOnly={!canEdit}
        />
      </div>
    </div>
  );
}
