
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
  id: string; // Unique ID for this placed icon instance (e.g., crypto.randomUUID())
  type: IconType;
  x: number; // Percentage from left (0-100)
  y: number; // Percentage from top (0-100)
  note?: string; // Optional note for the placed icon
}

export interface GridCellData {
  id: string; // e.g., "0-0", "row-col"
  placedIcons: PlacedIcon[];
  notes: string; // Notes for the overall cell
  backgroundImageUrl?: string; // URL for the cell's background image
}

export type LocalGridState = GridCellData[][]; // For client-side manipulation
export type FirestoreGridState = Record<string, GridCellData[]>; // For Firestore storage

export interface IconConfig {
  label: string;
  IconComponent: React.FC<React.SVGProps<SVGSVGElement>>;
}

export interface MapData {
  id: string; // Firestore document ID
  userId: string; // UID of the user who created this map
  name: string;
  gridState: FirestoreGridState;
  createdAt: Timestamp;
  updatedAt: Timestamp;
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
