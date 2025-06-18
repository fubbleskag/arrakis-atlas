
import type { Timestamp } from 'firebase/firestore';

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
  notes: string;
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

    