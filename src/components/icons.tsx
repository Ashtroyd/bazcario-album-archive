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
