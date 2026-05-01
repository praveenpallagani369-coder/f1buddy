interface AppIconProps {
  size?: number;
  className?: string;
}

export function AppIcon({ size = 32, className }: AppIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="vb-bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4338ca" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      {/* Background */}
      <rect width="100" height="100" rx="20" fill="url(#vb-bg)" />
      {/* Passport body */}
      <rect x="24" y="16" width="52" height="68" rx="6" fill="white" fillOpacity="0.15" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" />
      {/* Passport top band */}
      <rect x="24" y="16" width="52" height="15" rx="6" fill="white" fillOpacity="0.25" />
      <rect x="24" y="24" width="52" height="7" fill="white" fillOpacity="0.25" />
      {/* Photo placeholder */}
      <rect x="30" y="37" width="16" height="19" rx="3" fill="white" fillOpacity="0.28" />
      {/* Name lines */}
      <rect x="52" y="40" width="18" height="3" rx="1.5" fill="white" fillOpacity="0.55" />
      <rect x="52" y="47" width="13" height="3" rx="1.5" fill="white" fillOpacity="0.38" />
      {/* MRZ lines */}
      <rect x="29" y="62" width="42" height="2.5" rx="1.25" fill="white" fillOpacity="0.38" />
      <rect x="29" y="68" width="42" height="2.5" rx="1.25" fill="white" fillOpacity="0.38" />
      {/* Approval badge */}
      <circle cx="68" cy="74" r="17" fill="#059669" />
      <path
        d="M60 74 L65 79 L76 67"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
