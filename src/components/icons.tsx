import type { ReactNode, SVGProps } from "react";

/**
 * Enkle strekikoner med lik strekvekt, som merkevareprofilen ber om (side 09).
 * Fargen følger teksten (currentColor). Ikonene er pynt: bruk tekst ved siden av, eller sr-only.
 */
type IconProps = SVGProps<SVGSVGElement> & { className?: string };

function Icon({ className = "size-6", children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}

export const CrosshairIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="7" />
    <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
  </Icon>
);

export const CompassIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15.5 8.5l-2 5-5 2 2-5z" />
  </Icon>
);

export const LayersIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3l9 4.5-9 4.5-9-4.5z" />
    <path d="M3 12l9 4.5 9-4.5" />
    <path d="M3 16.5L12 21l9-4.5" />
  </Icon>
);

export const SendIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M21 3L10.5 13.5" />
    <path d="M21 3l-6.5 18-4-7.5L3 9.5z" />
  </Icon>
);

export const CalendarIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Icon>
);

export const HouseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 11.5L12 4l9 7.5" />
    <path d="M5.5 9.5V20h13V9.5" />
  </Icon>
);

export const GridIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </Icon>
);

export const PanelIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
    <path d="M10 3.5v17M10 12h10.5" />
  </Icon>
);

export const CardIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
    <path d="M2.5 10h19M6.5 15h4" />
  </Icon>
);

export const FlagIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 21V4" />
    <path d="M5 4.5c4-2 6 2 10 0s4 0 4 0v9s-1-1-4 0-6-2-10 0" />
  </Icon>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12h16M14 6l6 6-6 6" />
  </Icon>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Icon>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 5l7 7-7 7" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 12.5l4.5 4.5L19.5 6.5" />
  </Icon>
);

export const CheckCircleIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l2.7 2.7L16 9.8" />
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const MenuIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const LogOutIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 4h4.5A1.5 1.5 0 0120 5.5v13a1.5 1.5 0 01-1.5 1.5H14" />
    <path d="M10 16l-4-4 4-4M6 12h10" />
  </Icon>
);

/** Plattformene, forenklet og i én farge. */
export const LinkedInIcon = ({ className = "size-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="3" fill="currentColor" />
    <path d="M7 10v7.5M7 6.6v.1M11 17.5V10m0 3.2c0-2 1.3-3.3 3-3.3s2.8 1.1 2.8 3.2v4.4" fill="none" stroke="var(--color-paper)" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const FacebookIcon = ({ className = "size-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
    <circle cx="12" cy="12" r="10" fill="currentColor" />
    <path d="M13.4 21.5v-7h2.4l.4-2.8h-2.8V9.9c0-.8.3-1.4 1.4-1.4h1.5V6a19 19 0 00-2.2-.1c-2.2 0-3.6 1.3-3.6 3.7v2.1H8.1v2.8h2.4v7" fill="var(--color-paper)" />
  </svg>
);

export const InstagramIcon = ({ className = "size-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="6" fill="currentColor" />
    <circle cx="12" cy="12" r="4.2" fill="none" stroke="var(--color-paper)" strokeWidth="1.9" />
    <circle cx="17.3" cy="6.8" r="1.2" fill="var(--color-paper)" />
  </svg>
);
