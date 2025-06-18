
export const ICON_TYPES = [
  'base',
  'poi',
  'testing_station',
  'cave',
  'shipwreck',
  'stavidium',
  'spice',
  'titanium',
] as const;

export type IconType = typeof ICON_TYPES[number];

export interface GridCellData {
  id: string; // e.g., "0-0", "row-col"
  icons: IconType[];
  notes: string; // Added notes field
}

export type GridState = GridCellData[][];

export interface IconConfig {
  label: string;
  IconComponent: React.FC<React.SVGProps<SVGSVGElement>>;
}
