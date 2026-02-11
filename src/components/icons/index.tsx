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
import { TakeoutBagAndCupAndStrawMediumIcon } from "./takeoutbag.and.cup.and.straw-medium";
import { TrashIcon } from "./trash";

// Subcategory icons
import { AntennaIcon } from "./antenna";
import { BankIcon } from "./bank";
import { BanknoteIcon } from "./banknote";
import { BicycleIcon } from "./bicycle";
import { BookIcon } from "./book";
import { BrainIcon } from "./brain";
import { BriefcaseIcon } from "./briefcase";
import { CakeIcon } from "./cake";
import { CloudIcon } from "./cloud";
import { DropletIcon } from "./droplet";
import { GiftIcon } from "./gift";
import { GraduationCapIcon } from "./graduationcap";
import { HeartIcon } from "./heart";
import { HeartCircleIcon } from "./heartcircle";
import { KeyIcon } from "./key";
import { LipsIcon } from "./lips";
import { LockIcon } from "./lock";
import { MapIcon } from "./map";
import { MusicIcon } from "./music";
import { ParkingIcon } from "./parking";
import { PercentIcon } from "./percent";
import { PersonCircleIcon } from "./personcircle";
import { PlayIcon } from "./play";
import { ShieldIcon } from "./shield";
import { ShippingBoxIcon } from "./shippingbox";
import { SparklesIcon } from "./sparkles";
import { SuitcaseIcon } from "./suitcase";
import { TestTubesIcon } from "./testtubes";
import { ThumbsUpIcon } from "./thumbsup";
import { TriangleIcon } from "./triangle";
import { WalkingIcon } from "./walking";
import { WarningIcon } from "./warning";

// Export all icons
export {
  AntennaIcon,
  ArrowIcon,
  BankIcon,
  BanknoteIcon,
  BedIcon,
  BicycleIcon,
  BinocularsIcon,
  BoltIcon,
  BookIcon,
  BrainIcon,
  BriefcaseIcon,
  BusIcon,
  CakeIcon,
  CarIcon,
  CarrotIcon,
  CartIcon,
  ChartFillIcon,
  ChartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloudIcon,
  CreditCardIcon,
  CupIcon,
  DollarSignIcon,
  DropletIcon,
  FilmIcon,
  FitnessIcon,
  ForkIcon,
  FuelPumpIcon,
  GameControllerIcon,
  GearBigIcon,
  GearSmallIcon,
  GiftIcon,
  GlobeIcon,
  GraduationCapIcon,
  HeartIcon,
  HeartCircleIcon,
  HouseFillIcon,
  HouseIcon,
  LampIcon,
  LeafIcon,
  KeyIcon,
  LipsIcon,
  LockIcon,
  MapIcon,
  MoonIcon,
  MoreIcon,
  MusicIcon,
  PaintPaletteIcon,
  ParkingIcon,
  PencilIcon,
  PercentIcon,
  PersonCircleIcon,
  PersonFillIcon,
  PersonIcon,
  PillIcon,
  PlaneIcon,
  PlayIcon,
  ShieldIcon,
  ShippingBoxIcon,
  SparklesIcon,
  StethoscopeIcon,
  SuitcaseIcon,
  TakeoutBagAndCupAndStrawMediumIcon,
  TakeoutBagIcon,
  TestTubesIcon,
  ThumbsUpIcon,
  TicketIcon,
  TrashIcon,
  TriangleIcon,
  TshirtIcon,
  TvIcon,
  WalkingIcon,
  WarningIcon,
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
  ":takeoutbagandcupandstrawmedium:": TakeoutBagAndCupAndStrawMediumIcon,
  ":key:": KeyIcon,
  // Subcategory icons
  ":suitcase:": SuitcaseIcon,
  ":lock:": LockIcon,
  ":walking:": WalkingIcon,
  ":antenna:": AntennaIcon,
  ":parking:": ParkingIcon,
  ":bank:": BankIcon,
  ":bicycle:": BicycleIcon,
  ":cloud:": CloudIcon,
  ":warning:": WarningIcon,
  ":triangle:": TriangleIcon,
  ":graduationcap:": GraduationCapIcon,
  ":personcircle:": PersonCircleIcon,
  ":music:": MusicIcon,
  ":play:": PlayIcon,
  ":heart:": HeartIcon,
  ":map:": MapIcon,
  ":lips:": LipsIcon,
  ":brain:": BrainIcon,
  ":testtubes:": TestTubesIcon,
  ":shield:": ShieldIcon,
  ":cake:": CakeIcon,
  ":droplet:": DropletIcon,
  ":briefcase:": BriefcaseIcon,
  ":shippingbox:": ShippingBoxIcon,
  ":gift:": GiftIcon,
  ":book:": BookIcon,
  ":sparkles:": SparklesIcon,
  ":banknote:": BanknoteIcon,
  ":heartcircle:": HeartCircleIcon,
  ":thumbsup:": ThumbsUpIcon,
  ":percent:": PercentIcon,
};

/**
 * Get the icon component for a given icon string (category or subcategory icon)
 * @param icon - The icon string (e.g., ":fork:")
 * @returns The React node (JSX) if found in Icons map, null otherwise
 */
export const getIconComponent = (
  icon: string | null | undefined,
  style?: React.CSSProperties
): React.ReactNode => {
  if (!icon) return null;
  const Component = Icons[icon] as React.FC | undefined;
  if (!Component) return null;

  return (
    <div className={styles.iconContainer} style={style}>
      <Component />
    </div>
  );
};
