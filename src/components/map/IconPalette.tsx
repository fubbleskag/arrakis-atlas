
"use client";

import type React from 'react';
import { ICON_TYPES, type IconType } from '@/types';
import { ICON_CONFIG_MAP } from '@/components/icons';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';

interface IconPaletteProps {
  currentIcons: IconType[];
  onIconChange: (icon: IconType) => void;
  onClearAll: () => void;
}

export function IconPalette({ currentIcons, onIconChange, onClearAll }: IconPaletteProps) {
  return (
    <div className="p-1">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-medium leading-none text-foreground">Edit Resources</h4>
        <Button variant="ghost" size="sm" onClick={onClearAll} className="text-xs text-muted-foreground hover:text-destructive">
          <Trash2 className="mr-1 h-3 w-3" />
          Clear All
        </Button>
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
                "text-sm font-normal flex items-center cursor-pointer hover:text-primary transition-colors", 
                isChecked ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Checkbox
                id={`icon-${iconType}`}
                checked={isChecked}
                onCheckedChange={() => onIconChange(iconType)}
                aria-label={`Toggle ${config.label}`}
                className="mr-2 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
              />
              <Icon className={cn("mr-2 h-5 w-5", isChecked ? "text-primary" : "text-muted-foreground")} />
              {config.label}
            </Label>
          );
        })}
      </div>
    </div>
  );
}
