
import type { Timestamp } from 'firebase/firestore';

export const ICON_TYPES = [
  'base',
  'poi',
  'testing_station',
  'cave',
  'shipwreck',
  'stravidium', // Corrected spelling
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
  id:string;
  placedIcons: PlacedIcon[];
  notes: string;
  backgroundImageUrl?: string;
}

export type LocalGridState = GridCellData[][];
export type FirestoreGridState = Record<string, GridCellData[]>; // Keys are row indices as strings

export interface IconConfig {
  label: string;
  IconComponent: React.FC<React.SVGProps<SVGSVGElement>>;
}

export interface MapData {
  id: string;
  ownerId: string;
  name: string;
  gridState: FirestoreGridState;
  createdAt: Timestamp | string; // Can be Timestamp or serialized string
  updatedAt: Timestamp | string; // Can be Timestamp or serialized string
  updatedBy?: string; // UID of user who last updated
  isPublicViewable: boolean;
  publicViewId: string | null;
  collaboratorShareId: string | null; // For editor invite links
  editors: string[];
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  lastLogin?: Timestamp; // Keep as Timestamp as it's directly from Firestore
}

export interface FocusedCellCoordinates {
  rowIndex: number;
  colIndex: number;
}
