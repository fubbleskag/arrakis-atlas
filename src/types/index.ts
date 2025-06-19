
import type { Timestamp } from 'firebase/firestore';

export const ICON_TYPES = [
  'base',
  'poi',
  'testing_station',
  'cave',
  'shipwreck',
  'stravidium',
  'spice',
  'titanium',
] as const;

export type IconType = typeof ICON_TYPES[number];

export interface PlacedIcon {
  id: string;
  type: IconType;
  x: number;
  y: number;
  note?: string;
}

export interface GridCellData {
  id: string;
  placedIcons: PlacedIcon[];
  notes: string;
  backgroundImageUrl?: string;
}

export type LocalGridState = GridCellData[][];
export type FirestoreGridState = Record<string, GridCellData[]>;

export interface IconConfig {
  label: string;
  IconComponent: React.FC<React.SVGProps<SVGSVGElement>>;
}

export interface MapData {
  id: string;
  ownerId: string; // UID of the user who created this map
  name: string;
  gridState: FirestoreGridState;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isPublicViewable: boolean;
  publicViewId: string | null;
  collaboratorShareId: string | null;
  editors: string[];
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  lastLogin?: Timestamp;
}

export interface FocusedCellCoordinates {
  rowIndex: number;
  colIndex: number;
}
