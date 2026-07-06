type IconProps = { className?: string; size?: number };

function svgProps(size = 24) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

export function IconHome({ className, size }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

export function IconDisc({ className, size }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.4" />
    </svg>
  );
}

export function IconPlus({ className, size }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconUsers({ className, size }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-4A3.5 3.5 0 0 0 5 18.5V20" />
      <circle cx="10.5" cy="8" r="3.5" />
      <path d="M18.5 20v-1.5a3.5 3.5 0 0 0-2.5-3.35" />
      <path d="M15.5 4.6a3.5 3.5 0 0 1 0 6.8" />
    </svg>
  );
}

export function IconBell({ className, size }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-2.5 8.5-2.5 8.5h17S18 15 18 8Z" />
      <path d="M10.5 20a2 2 0 0 0 3 0" />
    </svg>
  );
}

export function IconStar({ className, size }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="m12 3.5 2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.3 2.7 1-5.8-4.2-4.1 5.9-.9L12 3.5Z" />
    </svg>
  );
}

export function IconComment({ className, size }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M21 12a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-2.9-.36-4.1-1L3 21l1.5-5.4A8.5 8.5 0 1 1 21 12Z" />
    </svg>
  );
}

export function IconHeart({ className, size }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M12 20.5s-7.5-4.7-9.3-9.2C1.5 8.2 3.3 5 6.6 5c2 0 3.6 1.1 4.4 2.7 1.7-2 3.4-2.7 5.4-2.7 2.3 0 4.1 3.2 2.9 6.3C17.5 15.8 12 20.5 12 20.5Z" />
    </svg>
  );
}

export function IconMoon({ className, size }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
    </svg>
  );
}

export function IconUserPlus({ className, size }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M15 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-4A3.5 3.5 0 0 0 4 18.5V20" />
      <circle cx="9.5" cy="8" r="3.5" />
      <path d="M19 8v6M16 11h6" />
    </svg>
  );
}

export function IconEllipsis({ className, size }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="19" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

export function IconShare({ className, size }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M12 3v12M8 6.5 12 3l4 3.5" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

export function IconImage({ className, size }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m5 18 5-5 3.5 3.5L16 14l4 4" />
    </svg>
  );
}

export function IconTrash({ className, size }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M4 7h16M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2" />
      <path d="M6.5 7 7 19a2 2 0 0 0 2 1.9h6A2 2 0 0 0 17 19l.5-12" />
    </svg>
  );
}

export function IconHeadphones({ className, size }: IconProps) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="3.5" y="14" width="4" height="6" rx="1.6" />
      <rect x="16.5" y="14" width="4" height="6" rx="1.6" />
    </svg>
  );
}
