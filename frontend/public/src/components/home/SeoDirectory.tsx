import { Link } from 'react-router-dom';

const SEO_SECTIONS = [
    {
        title: 'ABOUT OREEDU',
        links: [
            { label: 'About Us', href: '/about' },
            { label: 'Sustainability & Eco Stays', href: '/about' },
            { label: 'Oreedu Foundation', href: '/about' },
            { label: 'Legal Notices & Compliance', href: '/terms' },
            { label: 'CSR Policy', href: '/about' },
            { label: 'Partner Travel Agent Portal', href: 'https://cp.oreedu.com' },
            { label: 'List Your Property', href: 'https://property.oreedu.com' },
            { label: 'Advertise with Us', href: '/contact' },
            { label: 'Holiday Packages', href: '/properties' },
        ]
    },
    {
        title: 'ABOUT THE SITE',
        links: [
            { label: 'Customer Support', href: '/contact' },
            { label: 'Payment Security', href: '/privacy' },
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Cookie Policy', href: '/privacy' },
            { label: 'User Agreement & Terms', href: '/terms' },
            { label: 'Make A Payment', href: '/pay-online' },
            { label: 'Escalation Channel', href: '/contact' },
        ]
    },
    {
        title: 'PRODUCT OFFERING',
        links: [
            { label: 'Resorts in Kerala', href: '/search?location=Kerala' },
            { label: 'Luxury Villas in Wayanad', href: '/search?location=Wayanad' },
            { label: 'Homestays in Munnar', href: '/search?location=Munnar' },
            { label: 'Private Pool Villas', href: '/properties' },
            { label: 'Forest Eco-Stays', href: '/properties' },
            { label: 'Treehouse Retreats', href: '/properties' },
            { label: 'Houseboat Charters in Alleppey', href: '/search?location=Alappuzha' },
            { label: 'Cottages in Vagamon', href: '/search?location=Vagamon' },
            { label: 'Beach Resorts in Varkala & Kovalam', href: '/search?location=Varkala' },
            { label: 'Plantation Bungalows in Coorg', href: '/search?location=Coorg' },
            { label: 'Group Bookings & Retreats', href: '/properties' },
            { label: 'Pet-Friendly Stays in South India', href: '/search?petFriendly=true' },
        ]
    },
    {
        title: 'TOP CITIES & DESTINATIONS',
        links: [
            { label: 'Resorts in Wayanad', href: '/search?location=Wayanad' },
            { label: 'Villas in Munnar', href: '/search?location=Munnar' },
            { label: 'Hotels in Kozhikode', href: '/search?location=Kozhikode' },
            { label: 'Stays in Vagamon', href: '/search?location=Vagamon' },
            { label: 'Resorts in Ooty', href: '/search?location=Ooty' },
            { label: 'Homestays in Coorg', href: '/search?location=Coorg' },
            { label: 'Beach Stays in Varkala', href: '/search?location=Varkala' },
            { label: 'Houseboats in Kumarakom', href: '/search?location=Kumarakom' },
            { label: 'Hotels in Kochi', href: '/search?location=Kochi' },
            { label: 'Resorts in Kodaikanal', href: '/search?location=Kodaikanal' },
            { label: 'Eco-Lodges in Thekkady', href: '/search?location=Thekkady' },
            { label: 'Stays in Chikmagalur', href: '/search?location=Chikmagalur' },
        ]
    },
    {
        title: 'STATES OF INDIA',
        links: [
            { label: 'Resorts & Stays in Kerala', href: '/search?location=Kerala' },
            { label: 'Hotels & Villas in Karnataka', href: '/search?location=Karnataka' },
            { label: 'Hill Retreats in Tamil Nadu', href: '/search?location=Tamil+Nadu' },
            { label: 'Beach Villas in Goa', href: '/search?location=Goa' },
            { label: 'Heritage Haveli Stays in Rajasthan', href: '/search?location=Rajasthan' },
            { label: 'Mountain Lodges in Himachal Pradesh', href: '/search?location=Himachal' },
            { label: 'Eco Stays in Uttarakhand', href: '/search?location=Uttarakhand' },
        ]
    },
    {
        title: 'TOP PROPERTIES & RETREATS',
        links: [
            { label: 'Vythiri Resort Wayanad', href: '/properties' },
            { label: 'Evolve Back Kurumba', href: '/properties' },
            { label: 'Spice Tree Munnar', href: '/properties' },
            { label: 'Banasura Hill Resort', href: '/properties' },
            { label: 'Fragrant Nature Varkala', href: '/properties' },
            { label: 'Kumarakom Lake Resort', href: '/properties' },
            { label: 'Taj Green Cove Kovalam', href: '/properties' },
            { label: 'Windflower Spa & Resort Vythiri', href: '/properties' },
            { label: 'Tea Bungalow Stays Munnar', href: '/properties' },
        ]
    },
    {
        title: 'CORPORATE & GROUP TRAVEL',
        links: [
            { label: 'Corporate Offsites in Wayanad', href: '/properties' },
            { label: 'Team Building Stays in Munnar', href: '/properties' },
            { label: 'GST Invoices for Corporate Bookings', href: '/terms' },
            { label: 'Bulk Property Reservation Desk', href: '/contact' },
            { label: 'Exclusive Villa Buyouts for Weddings', href: '/contact' },
            { label: 'Group Discounts & Meal Packages', href: '/properties' },
        ]
    },
    {
        title: 'TOP HOMESTAY REGIONS',
        links: [
            { label: 'Homestays in Kalpetta', href: '/search?location=Kalpetta' },
            { label: 'Homestays in Meppadi', href: '/search?location=Meppadi' },
            { label: 'Homestays in Sulthan Bathery', href: '/search?location=Sulthan+Bathery' },
            { label: 'Homestays in Mananthavady', href: '/search?location=Mananthavady' },
            { label: 'Homestays in Devikulam', href: '/search?location=Devikulam' },
            { label: 'Homestays in Marayoor', href: '/search?location=Marayoor' },
            { label: 'Homestays in Kanthalloor', href: '/search?location=Kanthalloor' },
        ]
    }
];

export default function SeoDirectory() {
    return (
        <section className="bg-[#f5f5f4] rounded-3xl p-6 md:p-10 my-8 ring-1 ring-black/[0.03]">
            <div className="space-y-6">
                {SEO_SECTIONS.map((sec, idx) => (
                    <div key={idx} className="border-b border-gray-200/60 pb-5 last:border-b-0 last:pb-0">
                        <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-800 mb-2.5">
                            {sec.title}
                        </h4>
                        <div className="flex flex-wrap gap-x-2 gap-y-1.5 text-xs text-gray-600 leading-relaxed">
                            {sec.links.map((link, lIdx) => (
                                <span key={lIdx} className="inline-flex items-center">
                                    <Link
                                        to={link.href}
                                        className="hover:text-primary-700 hover:underline transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                    {lIdx < sec.links.length - 1 && (
                                        <span className="text-gray-300 ml-2">,</span>
                                    )}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
