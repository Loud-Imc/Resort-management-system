import { Tag, ShieldCheck, Lock, HeadphonesIcon } from 'lucide-react';

const BADGES = [
    {
        icon: Tag,
        title: 'Exclusive Member Rates',
        subtitle: 'Special unlocked pricing on luxury stays',
    },
    {
        icon: ShieldCheck,
        title: 'Free Cancellation Options',
        subtitle: 'Flexible policies on most stays',
    },
    {
        icon: Lock,
        title: '100% Secure Payments',
        subtitle: 'Encrypted UPI, Cards & Net Banking',
    },
    {
        icon: HeadphonesIcon,
        title: '24/7 Dedicated Support',
        subtitle: 'Round-the-clock trip assistance',
    },
];

export default function TrustBadges() {
    return (
        <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow ring-1 ring-black/[0.04]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {BADGES.map((badge, index) => {
                    const Icon = badge.icon;
                    return (
                        <div key={index} className="flex items-center gap-4">
                            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl bg-primary-50 text-primary-700 shadow-2xs">
                                <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-gray-900">{badge.title}</span>
                                <span className="text-xs text-gray-500 mt-0.5">{badge.subtitle}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
