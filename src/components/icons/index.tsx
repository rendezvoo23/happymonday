import type React from "react";
import { ArrowIcon } from "./arrow";
import { BedIcon } from "./bed";
import { BinocularsIcon } from "./binoculars";
import { BoltIcon } from "./bolt";
import { BusIcon } from "./bus";
import { CarIcon } from "./car";
import { CarrotIcon } from "./carrot";
import { CartIcon } from "./cart";
import { CreditCardIcon } from "./creditcard";
import { CupIcon } from "./cup";
import { FilmIcon } from "./film";
import { FitnessIcon } from "./fitness";
import { ForkIcon } from "./fork";
import { FuelPumpIcon } from "./fuelpump";
import { GameControllerIcon } from "./gamecontroller";
import { HouseIcon } from "./house";
import { LampIcon } from "./lamp";
import { LeafIcon } from "./leaf";
import { PaintPaletteIcon } from "./paintpalette";
import { PillIcon } from "./pill";
import { PlaneIcon } from "./plane";
import { StethoscopeIcon } from "./stethoscope";
import styles from "./styles.module.css";
import { TakeoutBagIcon } from "./takeoutbag";
import { TicketIcon } from "./ticket";
import { TshirtIcon } from "./tshirt";
import { TvIcon } from "./tv";
import { WifiIcon } from "./wifi";
import { WineGlassIcon } from "./wineglass";
import { WrenchIcon } from "./wrench";

// Import new icons
import { ChartIcon } from "./chart";
import { ChartFillIcon } from "./chartfill";
import { ChevronLeftIcon } from "./chevronleft";
import { ChevronRightIcon } from "./chevronright";
import { DollarSignIcon } from "./dollarsign";
import { GearBigIcon } from "./gearbig";
import { GearSmallIcon } from "./gearsmall";
import { GlobeIcon } from "./globe";
import { HouseFillIcon } from "./housefill";
import { MoonIcon } from "./moon";
import { MoreIcon } from "./more";
import { PencilIcon } from "./pencil";
import { PersonIcon } from "./person";
import { PersonFillIcon } from "./personfill";
import { TrashIcon } from "./trash";

// Export all icons
export {
  ArrowIcon,
  BedIcon,
  BinocularsIcon,
  BoltIcon,
  BusIcon,
  CarIcon,
  CarrotIcon,
  CartIcon,
  ChartIcon,
  ChartFillIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CreditCardIcon,
  CupIcon,
  DollarSignIcon,
  FilmIcon,
  FitnessIcon,
  ForkIcon,
  FuelPumpIcon,
  GameControllerIcon,
  GearBigIcon,
  GearSmallIcon,
  GlobeIcon,
  HouseFillIcon,
  HouseIcon,
  LampIcon,
  LeafIcon,
  MoonIcon,
  MoreIcon,
  PaintPaletteIcon,
  PencilIcon,
  PersonIcon,
  PersonFillIcon,
  PillIcon,
  PlaneIcon,
  StethoscopeIcon,
  TakeoutBagIcon,
  TicketIcon,
  TrashIcon,
  TshirtIcon,
  TvIcon,
  WifiIcon,
  WineGlassIcon,
  WrenchIcon,
};

export const Icons: Record<string, React.FC> = {
  ":carrot:": CarrotIcon,
  ":fork:": ForkIcon,
  ":plane:": PlaneIcon,
  ":cup:": CupIcon,
  ":takeoutbag:": TakeoutBagIcon,
  ":house:": HouseIcon,
  ":tshirt:": TshirtIcon,
  ":tv:": TvIcon,
  ":lamp:": LampIcon,
  ":cart:": CartIcon,
  ":bed:": BedIcon,
  ":ticket:": TicketIcon,
  ":binoculars:": BinocularsIcon,
  ":bus:": BusIcon,
  ":car:": CarIcon,
  ":fuelpump:": FuelPumpIcon,
  ":wrench:": WrenchIcon,
  ":arrow:": ArrowIcon,
  ":bolt:": BoltIcon,
  ":wifi:": WifiIcon,
  ":creditcard:": CreditCardIcon,
  ":gamecontroller:": GameControllerIcon,
  ":film:": FilmIcon,
  ":paintpalette:": PaintPaletteIcon,
  ":wineglass:": WineGlassIcon,
  ":pill:": PillIcon,
  ":stethoscope:": StethoscopeIcon,
  ":fitness:": FitnessIcon,
  ":leaf:": LeafIcon,
  // New icons
  ":gearsmall:": GearSmallIcon,
  ":gearbig:": GearBigIcon,
  ":person:": PersonIcon,
  ":dollarsign:": DollarSignIcon,
  ":moon:": MoonIcon,
  ":globe:": GlobeIcon,
  ":personfill:": PersonFillIcon,
  ":pencil:": PencilIcon,
  ":housefill:": HouseFillIcon,
  ":chart:": ChartIcon,
  ":chartfill:": ChartFillIcon,
  ":trash:": TrashIcon,
  ":chevronleft:": ChevronLeftIcon,
  ":chevronright:": ChevronRightIcon,
  ":more:": MoreIcon, 
};

/**
 * Get the icon component for a given icon string (category or subcategory icon)
 * @param icon - The icon string (e.g., ":fork:")
 * @returns The React node (JSX) if found in Icons map, null otherwise
 */
export const getIconComponent = (
  icon: string | null | undefined
): React.ReactNode => {
  if (!icon) return null;
  const Component = Icons[icon] as React.FC | undefined;
  if (!Component) return null;

  return (
    <div className={styles.iconContainer}>
      <Component />
    </div>
  );
};
