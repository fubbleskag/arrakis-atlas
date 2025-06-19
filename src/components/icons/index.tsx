
import type { IconType, IconConfig } from '@/types';
import BaseIcon from './BaseIcon';
import PoiIcon from './PoiIcon';
import TestingStationIcon from './TestingStationIcon';
import CaveIcon from './CaveIcon';
import ShipwreckIcon from './ShipwreckIcon';
import StravidiumIcon from './StravidiumIcon';
import SpiceIcon from './SpiceIcon';
import TitaniumIcon from './TitaniumIcon';

export {
  BaseIcon,
  PoiIcon,
  TestingStationIcon,
  CaveIcon,
  ShipwreckIcon,
  StravidiumIcon,
  SpiceIcon,
  TitaniumIcon,
};

export const ICON_CONFIG_MAP: Record<IconType, IconConfig> = {
  base: { label: 'Base', IconComponent: BaseIcon },
  poi: { label: 'POI', IconComponent: PoiIcon },
  testing_station: { label: 'Testing Station', IconComponent: TestingStationIcon },
  cave: { label: 'Cave', IconComponent: CaveIcon },
  shipwreck: { label: 'Shipwreck', IconComponent: ShipwreckIcon },
  stravidium: { label: 'Stravidium', IconComponent: StravidiumIcon },
  spice: { label: 'Spice', IconComponent: SpiceIcon },
  titanium: { label: 'Titanium', IconComponent: TitaniumIcon },
};
