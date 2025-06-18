"use client";

import type React from 'react';
import { ICON_TYPES, type IconType } from '@/types';
import { ICON_CONFIG_MAP } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface IconPaletteProps {
  currentIcons: IconType[];
  onToggleIcon: (icon: IconType) => void;
}

export function IconPalette({ currentIcons, onToggleIcon }: IconPaletteProps) {
  return (
    <div className="p-1">
      <h4 className="mb-2 text-sm font-medium leading-none text-foreground">Edit Resources</h4>
      <ScrollArea className="h-[200px] w-full">
        <div className="space-y-3 p-2">
        {ICON_TYPES.map((iconType) => {
          const config = ICON_CONFIG_MAP[iconType];
          const Icon = config.IconComponent;
          const isChecked = currentIcons.includes(iconType);
          return (
            <div key={iconType} className="flex items-center space-x-2">
              <Checkbox
                id={`icon-${iconType}`}
                checked={isChecked}
                onCheckedChange={() => onToggleIcon(iconType)}
                aria-label={`Toggle ${config.label}`}
                className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
              />
              <Label
                htmlFor={`icon-${iconType}`}
                className={cn("text-sm font-normal flex items-center cursor-pointer", isChecked ? "text-primary" : "text-muted-foreground")}
              >
                <Icon className={cn("mr-2 h-5 w-5", isChecked ? "text-primary" : "text-muted-foreground")} />
                {config.label}
              </Label>
            </div>
          );
        })}
        </div>
      </ScrollArea>
    </div>
  );
}
