import React from 'react';

interface OtaChannelBadgeProps {
  source?: string | null;
  channelName?: string | null;
  channelPartnerId?: string | null;
  isManualBooking?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showIconOnly?: boolean;
}

export const OtaChannelBadge: React.FC<OtaChannelBadgeProps> = ({
  source,
  channelName,
  channelPartnerId,
  isManualBooking,
  size = 'sm',
  className = '',
  showIconOnly = false,
}) => {
  // Normalize source text
  const raw = String(source || channelName || '').trim();
  const lower = raw.toLowerCase();

  let brand = 'pms';
  let label = 'Oreedu PMS';

  if (channelPartnerId || lower.includes('partner') || lower.includes('cp') || lower.startsWith('offline cp')) {
    brand = 'cp';
    label = 'Channel Partner';
  } else if (lower.includes('booking') || lower === 'bdc') {
    brand = 'booking';
    label = 'Booking.com';
  } else if (lower.includes('makemytrip') || lower.includes('mmt')) {
    brand = 'mmt';
    label = 'MakeMyTrip';
  } else if (lower.includes('agoda')) {
    brand = 'agoda';
    label = 'Agoda';
  } else if (lower.includes('airbnb')) {
    brand = 'airbnb';
    label = 'Airbnb';
  } else if (lower.includes('expedia') || lower.includes('hotels.com') || lower.includes('vrbo')) {
    brand = 'expedia';
    label = 'Expedia';
  } else if (lower.includes('goibibo')) {
    brand = 'goibibo';
    label = 'Goibibo';
  } else if (lower.includes('channex')) {
    brand = 'channex';
    label = 'Channex OTA';
  } else if (lower.includes('oreedu') || lower.includes('routeguide') || lower.includes('website') || lower.includes('direct online')) {
    brand = 'oreedu';
    label = 'Oreedu Website';
  } else if (isManualBooking || lower.includes('front desk') || lower.includes('walk-in') || lower.includes('manual') || lower.includes('pms')) {
    brand = 'pms';
    label = 'Oreedu PMS';
  } else if (raw) {
    brand = 'generic_ota';
    label = raw;
  }

  // Size configurations
  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5 gap-1',
    sm: 'text-[10px] px-2 py-0.5 gap-1.5 font-bold',
    md: 'text-xs px-2.5 py-1 gap-2 font-bold',
    lg: 'text-sm px-3.5 py-1.5 gap-2.5 font-extrabold',
  }[size];

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }[size];

  // Brand Styles & Icons
  switch (brand) {
    case 'booking':
      return (
        <span
          title="Booking.com OTA Reservation"
          className={`inline-flex items-center rounded-md font-sans tracking-wide bg-[#003580]/10 dark:bg-[#003580]/20 text-[#003580] dark:text-[#66a3ff] border border-[#003580]/30 ${sizeClasses} ${className}`}
        >
          <svg className={iconSizes} viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 3h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2.5 4v10h4.5c2.2 0 3.8-1.3 3.8-3.2 0-1.3-.8-2.3-2-2.7 1-.4 1.6-1.3 1.6-2.4 0-1.7-1.4-2.7-3.4-2.7H6.5zm2.8 2.2h1.6c.9 0 1.5.5 1.5 1.2 0 .8-.6 1.3-1.5 1.3H9.3V9.2zm0 4.3h1.8c1 0 1.7.5 1.7 1.4 0 .9-.7 1.4-1.7 1.4H9.3v-2.8z" />
          </svg>
          {!showIconOnly && <span>{label}</span>}
        </span>
      );

    case 'mmt':
      return (
        <span
          title="MakeMyTrip OTA Reservation"
          className={`inline-flex items-center rounded-md font-sans tracking-wide bg-[#eb2026]/10 dark:bg-[#eb2026]/20 text-[#eb2026] dark:text-[#ff6b6e] border border-[#eb2026]/30 ${sizeClasses} ${className}`}
        >
          <svg className={iconSizes} viewBox="0 0 24 24" fill="currentColor">
            <rect width="24" height="24" rx="4" fill="#eb2026" />
            <path
              d="M5 15.5V8.5h2.2l2.3 4.2 2.3-4.2H14v7h-1.8v-4.1l-1.9 3.4h-1l-1.9-3.4v4.1H5zm10.5 0V8.5h2.2l1.6 3.5 1.6-3.5h2.2v7h-1.8v-4.1l-1.4 3h-1.2l-1.4-3v4.1h-1.8z"
              fill="#ffffff"
            />
          </svg>
          {!showIconOnly && <span>{label}</span>}
        </span>
      );

    case 'agoda':
      return (
        <span
          title="Agoda OTA Reservation"
          className={`inline-flex items-center rounded-md font-sans tracking-wide bg-[#5392f9]/10 dark:bg-[#5392f9]/20 text-[#2b72e8] dark:text-[#8cb8ff] border border-[#5392f9]/30 ${sizeClasses} ${className}`}
        >
          <svg className={iconSizes} viewBox="0 0 24 24" fill="currentColor">
            <circle cx="6" cy="12" r="3.5" fill="#5392f9" />
            <circle cx="12" cy="7" r="3" fill="#f05a28" />
            <circle cx="12" cy="17" r="3" fill="#8dc63f" />
            <circle cx="18" cy="12" r="3.5" fill="#fbb040" />
          </svg>
          {!showIconOnly && <span>{label}</span>}
        </span>
      );

    case 'airbnb':
      return (
        <span
          title="Airbnb Reservation"
          className={`inline-flex items-center rounded-md font-sans tracking-wide bg-[#FF5A5F]/10 dark:bg-[#FF5A5F]/20 text-[#FF5A5F] dark:text-[#ff8a8e] border border-[#FF5A5F]/30 ${sizeClasses} ${className}`}
        >
          <svg className={iconSizes} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.5 2 6 5.5 6 9.5c0 3.2 2.3 6.9 6 12.5 3.7-5.6 6-9.3 6-12.5C18 5.5 15.5 2 12 2zm0 10.2c-1.5 0-2.7-1.2-2.7-2.7s1.2-2.7 2.7-2.7 2.7 1.2 2.7 2.7-1.2 2.7-2.7 2.7z" />
          </svg>
          {!showIconOnly && <span>{label}</span>}
        </span>
      );

    case 'expedia':
      return (
        <span
          title="Expedia Group Reservation"
          className={`inline-flex items-center rounded-md font-sans tracking-wide bg-[#00355F]/10 dark:bg-[#00355F]/20 text-[#00355F] dark:text-[#7bb7e8] border border-[#00355F]/30 ${sizeClasses} ${className}`}
        >
          <svg className={iconSizes} viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
          {!showIconOnly && <span>{label}</span>}
        </span>
      );

    case 'goibibo':
      return (
        <span
          title="Goibibo OTA Reservation"
          className={`inline-flex items-center rounded-md font-sans tracking-wide bg-[#ec5b24]/10 dark:bg-[#ec5b24]/20 text-[#ec5b24] dark:text-[#ff9266] border border-[#ec5b24]/30 ${sizeClasses} ${className}`}
        >
          <svg className={iconSizes} viewBox="0 0 24 24" fill="currentColor">
            <circle cx="8" cy="12" r="5" fill="#ec5b24" />
            <circle cx="16" cy="12" r="5" fill="#1b365d" />
          </svg>
          {!showIconOnly && <span>{label}</span>}
        </span>
      );

    case 'oreedu':
      return (
        <span
          title="Oreedu Direct Website Booking"
          className={`inline-flex items-center rounded-md font-sans tracking-wide bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 ${sizeClasses} ${className}`}
        >
          <svg className={iconSizes} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zm0 9l-8-4v8l8 5 8-5V7l-8 4z" />
          </svg>
          {!showIconOnly && <span>{label}</span>}
        </span>
      );

    case 'cp':
      return (
        <span
          title="Channel Partner Referral"
          className={`inline-flex items-center rounded-md font-sans tracking-wide bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 ${sizeClasses} ${className}`}
        >
          <svg className={iconSizes} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          {!showIconOnly && <span>{label}</span>}
        </span>
      );

    case 'channex':
      return (
        <span
          title="Channex Channel Manager OTA"
          className={`inline-flex items-center rounded-md font-sans tracking-wide bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 ${sizeClasses} ${className}`}
        >
          <svg className={iconSizes} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
          {!showIconOnly && <span>{label}</span>}
        </span>
      );

    case 'pms':
    default:
      return (
        <span
          title="Front Desk / Oreedu PMS Walk-in Booking"
          className={`inline-flex items-center rounded-md font-sans tracking-wide bg-slate-500/10 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-500/30 ${sizeClasses} ${className}`}
        >
          <svg className={iconSizes} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          {!showIconOnly && <span>{label}</span>}
        </span>
      );
  }
};
