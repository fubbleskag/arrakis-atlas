
import type { LocalGridState, FirestoreGridState, GridCellData, PlacedIcon, IconType } from '@/types';
import { ICON_TYPES } from '@/types';

export const GRID_SIZE = 9;

export const initializeLocalGrid = (): LocalGridState => {
  return Array(GRID_SIZE)
    .fill(null)
    .map((_, rowIndex) =>
      Array(GRID_SIZE)
        .fill(null)
        .map((__, colIndex) => ({
          id: `${rowIndex}-${colIndex}`,
          placedIcons: [],
          notes: '',
          backgroundImageUrl: undefined,
        }))
    );
};

export const convertLocalToFirestoreGrid = (localGrid: LocalGridState): FirestoreGridState => {
  const firestoreGrid: FirestoreGridState = {};
  localGrid.forEach((rowArray, rIndex) => {
    firestoreGrid[rIndex.toString()] = rowArray.map((cell: GridCellData) => {
      const firestoreCellOutput: GridCellData = {
        id: cell.id,
        notes: cell.notes,
        placedIcons: cell.placedIcons.map((pi: PlacedIcon) => ({
          id: pi.id,
          type: pi.type,
          x: pi.x,
          y: pi.y,
          note: pi.note || '',
        })),
      };
      if (cell.backgroundImageUrl && cell.backgroundImageUrl.trim() !== '') {
        firestoreCellOutput.backgroundImageUrl = cell.backgroundImageUrl;
      }
      return firestoreCellOutput;
    });
  });
  return firestoreGrid;
};

export const convertFirestoreToLocalGrid = (firestoreGrid: FirestoreGridState | undefined): LocalGridState => {
  const newLocalGrid: LocalGridState = initializeLocalGrid();
  if (firestoreGrid && typeof firestoreGrid === 'object') {
    for (let r = 0; r < GRID_SIZE; r++) {
      const rowKey = r.toString();
      const rowData = firestoreGrid[rowKey];
      if (rowData && Array.isArray(rowData) && rowData.length === GRID_SIZE) {
        newLocalGrid[r] = rowData.map((cell: any, c: number) => ({
          id: cell.id || `${r}-${c}`,
          placedIcons: Array.isArray(cell.placedIcons) ? cell.placedIcons.map((pi: any) => ({
            id: pi.id || crypto.randomUUID(),
            type: pi.type,
            x: typeof pi.x === 'number' ? pi.x : 0,
            y: typeof pi.y === 'number' ? pi.y : 0,
            note: typeof pi.note === 'string' ? pi.note : '',
          })).filter(pi => pi.type && ICON_TYPES.includes(pi.type as IconType)) : [],
          notes: typeof cell.notes === 'string' ? cell.notes : '',
          backgroundImageUrl: typeof cell.backgroundImageUrl === 'string' ? cell.backgroundImageUrl : undefined,
        }));
      }
    }
  }
  return newLocalGrid;
};

/**
 * Constructs the URL for a resized image based on the original URL.
 * Assumes the Firebase "Resize Images" extension is configured to create files
 * with a suffix like `_1200x1200.webp`.
 * @param originalUrl The full original download URL from Firebase Storage.
 * @param size The desired size suffix.
 * @returns The new URL for the resized image, or the original URL as a fallback.
 */
export const getResizedImageUrl = (originalUrl: string | undefined, size: '150x150' | '600x600' | '1200x1200'): string => {
  if (!originalUrl) {
    return '';
  }

  try {
    const urlParts = originalUrl.split('?');
    const baseUrl = urlParts[0];
    const queryString = urlParts.length > 1 ? `?${urlParts[1]}` : '';

    const lastDotIndex = baseUrl.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return originalUrl; // No extension found, return original
    }

    const baseName = baseUrl.substring(0, lastDotIndex);
    
    const resizedUrl = `${baseName}_${size}.webp${queryString}`;
    
    return resizedUrl;
  } catch (e) {
    console.error("Error creating resized image URL", e);
    return originalUrl; // Fallback to original on any error
  }
};
