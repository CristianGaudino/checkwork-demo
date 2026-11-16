// 24px grid, 1.5px stroke, currentColor. Plans 01-06 to 01-08 import these.
type Props = { className?: string };

function Icon({ className, children }: Props & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {children}
    </svg>
  );
}

export const SlidersIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </Icon>
);
export const CloseIcon = (p: Props) => (
  <Icon {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Icon>
);
export const CheckIcon = (p: Props) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);
export const ChevronLeftIcon = (p: Props) => (
  <Icon {...p}>
    <path d="m14.5 5-7 7 7 7" />
  </Icon>
);
export const ChevronRightIcon = (p: Props) => (
  <Icon {...p}>
    <path d="m9.5 5 7 7-7 7" />
  </Icon>
);
export const ChevronDownIcon = (p: Props) => (
  <Icon {...p}>
    <path d="m5 9.5 7 7 7-7" />
  </Icon>
);
export const ShareIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M12 15V3M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
  </Icon>
);
export const PencilIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4" />
  </Icon>
);
const HEART = "M12 20.5s-7.6-4.6-9.3-9.5C1.5 7.6 3.8 4.5 7.2 4.5c2 0 3.7 1.1 4.8 2.8 1.1-1.7 2.8-2.8 4.8-2.8 3.4 0 5.7 3.1 4.5 6.5-1.7 4.9-9.3 9.5-9.3 9.5z";
// Saved is the filled shape, not only the colour; the outline stays on top for contrast over any photo.
export const HeartIcon = ({ filled, ...p }: Props & { filled?: boolean }) => (
  <Icon {...p}>
    <path d={HEART} stroke="none" className={`fill-accent transition-opacity duration-150 ease-out motion-reduce:transition-none ${filled ? "opacity-100" : "opacity-0"}`} />
    <path d={HEART} />
  </Icon>
);
export const PlusIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const StarIcon = ({ filled, ...p }: Props & { filled?: boolean }) => (
  <Icon {...p}>
    <path fill={filled ? "currentColor" : "none"} d="m12 3.5 2.6 5.3 5.9.9-4.25 4.1 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.7l5.9-.9z" />
  </Icon>
);
export const PhoneIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M21 16.9V20a2 2 0 0 1-2.2 2A19 19 0 0 1 2 5.2 2 2 0 0 1 4 3h3.1a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 11a15 15 0 0 0 5.9 5.9l1.4-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
  </Icon>
);
export const MenuIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);

export const ArrowRightIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5" />
  </Icon>
);
export const SearchIcon = (p: Props) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6" />
    <path d="m20 20-4.2-4.2" />
  </Icon>
);
export const WrenchIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
  </Icon>
);
export const TruckIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" />
    <circle cx="7" cy="18" r="1.8" />
    <circle cx="17.5" cy="18" r="1.8" />
  </Icon>
);
export const ShieldCheckIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M12 3 5 6v5.5c0 4.2 2.8 7.6 7 9.5 4.2-1.9 7-5.3 7-9.5V6l-7-3Z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </Icon>
);
export const LayersIcon = (p: Props) => (
  <Icon {...p}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 12.5 9 5 9-5M3 16.5l9 5 9-5" />
  </Icon>
);
export const CalculatorIcon = (p: Props) => (
  <Icon {...p}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M8.5 7h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01" />
  </Icon>
);
export const SwapIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4" />
  </Icon>
);
export const CarIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M5 16V11l2-5h10l2 5v5M3 16h18M5 16v3M19 16v3M5 11h14" />
    <circle cx="8" cy="14" r=".6" />
    <circle cx="16" cy="14" r=".6" />
  </Icon>
);

export const GridIcon = (p: Props) => (
  <Icon {...p}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
  </Icon>
);
export const ListIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M8.5 6.5H20M8.5 12H20M8.5 17.5H20M4 6.5h.01M4 12h.01M4 17.5h.01" />
  </Icon>
);

export const CalendarIcon = (p: Props) => (
  <Icon {...p}>
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M4 10h16M8.5 3v4M15.5 3v4" />
  </Icon>
);
// A page with bars: the dashboard's reports.
export const ReportIcon = (p: Props) => (
  <Icon {...p}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M8 17v-4M12 17V8M16 17v-6" />
  </Icon>
);
// A clock with a turning arrow: the dashboard's activity history.
export const HistoryIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" />
    <path d="M12 8v4.5l3 2" />
  </Icon>
);
export const BellIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15L6 16.5ZM10 20.5a2 2 0 0 0 4 0" />
  </Icon>
);
export const GaugeIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M4.5 17a8.5 8.5 0 1 1 15 0" />
    <path d="m12 13 4-4" />
    <circle cx="12" cy="13.5" r="1" />
  </Icon>
);
export const FuelIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M6 20V5a1.5 1.5 0 0 1 1.5-1.5h6A1.5 1.5 0 0 1 15 5v15M4.5 20h12" />
    <path d="M7.5 8h6M15 10.5l2.5 1.5v5a1.5 1.5 0 0 0 3 0V9l-2.5-2.5" />
  </Icon>
);
// A gearbox: the shift pattern of a manual (an H with a knob at each end). The old circle with rays read as a sun.
export const GearIcon = (p: Props) => (
  <Icon {...p}>
    <circle cx="6" cy="5" r="2" />
    <circle cx="12" cy="5" r="2" />
    <circle cx="18" cy="5" r="2" />
    <circle cx="6" cy="19" r="2" />
    <circle cx="12" cy="19" r="2" />
    <path d="M6 7v10M12 7v10M18 7v5H6" />
  </Icon>
);
export const WhatsAppIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M20 11.6a8 8 0 0 1-11.7 7.1L4 20l1.3-4.2A8 8 0 1 1 20 11.6Z" />
    <path d="M9.2 8.8c.3-.6.8-.6 1-.1l.5 1.2c.1.3 0 .5-.3.8-.2.2-.2.4 0 .7.5.9 1.3 1.6 2.2 2 .3.1.5.1.7-.1l.5-.6c.2-.3.5-.3.8-.1l1.1.6c.4.2.4.6 0 1-.6.7-1.6.9-2.5.6-2.1-.7-3.7-2.3-4.4-4.3-.2-.7 0-1.3.4-1.7Z" />
  </Icon>
);

export const FacebookIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M14 8h2V5h-2.5C11 5 10 6.5 10 8.5V11H8v3h2v6h3v-6h2.2l.5-3H13V8.7c0-.5.3-.7 1-.7Z" />
  </Icon>
);
export const InstagramIcon = (p: Props) => (
  <Icon {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r=".6" />
  </Icon>
);
export const TikTokIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5M14 4c.3 2.3 1.8 3.8 4 4" />
  </Icon>
);

export const PinIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0c0 5.4 6.5 11 6.5 11Z" />
    <circle cx="12" cy="10" r="2.4" />
  </Icon>
);

export const InfoIcon = (p: Props) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Icon>
);
export const AlertIcon = (p: Props) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.5h.01" />
  </Icon>
);

export const CameraIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.2-1.8A1 1 0 0 1 9.5 5h5a1 1 0 0 1 .8.4L16.5 7h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z" />
    <circle cx="12" cy="13" r="3.2" />
  </Icon>
);

// Dashboard navigation and row actions.
export const HomeIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />
  </Icon>
);
export const InboxIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M4 13.5 6.5 5h11l2.5 8.5M4 13.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5.5M4 13.5h4.5l1 2h5l1-2H20" />
  </Icon>
);
export const UsersIcon = (p: Props) => (
  <Icon {...p}>
    <circle cx="9" cy="8.5" r="3.5" />
    <path d="M3 19.5c.7-3.2 3.1-5 6-5s5.3 1.8 6 5M15.5 5.2a3.5 3.5 0 0 1 0 6.6M17.5 14.8c1.8.6 3.1 2.2 3.5 4.7" />
  </Icon>
);
export const MegaphoneIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M4 10v4a1 1 0 0 0 1 1h3l7 4V5L8 9H5a1 1 0 0 0-1 1zM8 15l1.5 5M18 9.5a3 3 0 0 1 0 5" />
  </Icon>
);
export const ChartIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M4 20h16M7 16v-5M12 16V7M17 16v-8" />
  </Icon>
);
export const PercentIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M18 6 6 18" />
    <circle cx="7.5" cy="7.5" r="2.5" />
    <circle cx="16.5" cy="16.5" r="2.5" />
  </Icon>
);
// A gear with teeth (Lucide's settings outline, ISC licence): the old circle with rays read as a sun.
export const CogIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);
export const ExternalIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Icon>
);
export const TrashIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 12.5h9l1-12.5M10 11v5M14 11v5" />
  </Icon>
);
export const SyncIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M20 12a8 8 0 0 1-14 5.3M4 12a8 8 0 0 1 14-5.3M18 3v4h-4M6 21v-4h4" />
  </Icon>
);
// A bill: Billing in the dashboard.
export const ReceiptIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21z" />
    <path d="M9 8h6M9 12h6M9 16h3" />
  </Icon>
);
// A question in a circle: Help in the dashboard.
export const HelpIcon = (p: Props) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6" />
    <path d="M12 17h.01" />
  </Icon>
);
// Sparkles: whatever an AI wrote or can write, so it is never mistaken for the dealer's own words.
export const SparkleIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    <path d="M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z" />
  </Icon>
);
