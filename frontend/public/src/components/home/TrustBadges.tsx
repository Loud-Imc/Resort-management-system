import { Tag, ShieldCheck, Lock, HeadphonesIcon } from 'lucide-react';

const BADGES = [
    {
        icon: Tag,
        title: 'Exclusive Member Deals',
        subtitle: 'Extra discounts for members',
    },
    {
        icon: ShieldCheck,
        title: 'Free Cancellation',
        subtitle: 'On most of the stays',
    },
    {
        icon: Lock,
        title: 'Secure Payments',
        subtitle: '100% safe & secure',
    },
    {
        icon: HeadphonesIcon,
        title: '24/7 Support',
        subtitle: "We're here to help",
    },
];
export default function TrustBadges() {
    return (
        <div className="my-6">
            <div className="bg-white rounded-lg border border-primary-800 p-4 md:p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {BADGES.map((badge, index) => {
                        const Icon = badge.icon;
                        return (
                            <div key={index} className="flex items-center gap-4">
                                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-white shadow-sm border border-primary-800 text-primary-800">
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-gray-900">{badge.title}</span>
                                    <span className="text-xs text-gray-600 mt-0.5">{badge.subtitle}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
