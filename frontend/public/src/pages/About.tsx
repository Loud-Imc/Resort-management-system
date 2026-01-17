import { ShieldCheck, Leaf, Coffee } from 'lucide-react';

export default function About() {
    return (
        <div>
            {/* Hero */}
            <section className="relative h-[50vh] flex items-center justify-center bg-gray-900">
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-60"
                    style={{ backgroundImage: 'url("/public/images/hero-slide-1.png")' }}
                />
                <div className="relative z-10 text-center text-white px-4">
                    <h1 className="text-5xl font-serif font-bold mb-4">Our Story</h1>
                    <p className="text-xl max-w-2xl mx-auto text-gray-200">
                        A sanctuary of peace on the banks of India's largest earthen dam.
                    </p>
                </div>
            </section>

            {/* Content */}
            <section className="py-20 max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                <div>
                    <h2 className="text-3xl font-serif font-bold mb-6 text-gray-900">The Route Guide Experience</h2>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                        Route Guide was born from a vision to create a sustainable luxury destination that respects its environment.
                        Located at the breathtaking Banasura Sagar Dam in Wayanad, Kerala, we offer a unique blend of
                        modern comfort and raw natural beauty.
                    </p>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                        Waking up to the mist rolling over the reservoir, listening to the symphony of forest birds,
                        and breathing in the pure mountain air – this is the daily rhythm of life here.
                    </p>
                </div>
                <div>
                    <img
                        src="/public/images/hero-slide-2.png"
                        alt="Resort Exterior"
                        className="rounded-2xl shadow-xl w-full"
                    />
                </div>
            </section>

            <section className="bg-gray-50 py-20 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white p-8 rounded-xl shadow-sm">
                            <Leaf className="h-10 w-10 text-primary-600 mb-4" />
                            <h3 className="text-xl font-bold mb-2">Sustainability First</h3>
                            <p className="text-gray-600">We operate with a zero-plastic policy and use solar energy to minimize our carbon footprint.</p>
                        </div>
                        <div className="bg-white p-8 rounded-xl shadow-sm">
                            <ShieldCheck className="h-10 w-10 text-primary-600 mb-4" />
                            <h3 className="text-xl font-bold mb-2">Safe & Private</h3>
                            <p className="text-gray-600">Your privacy and safety are our top priorities, with 24/7 security and private villa access.</p>
                        </div>
                        <div className="bg-white p-8 rounded-xl shadow-sm">
                            <Coffee className="h-10 w-10 text-primary-600 mb-4" />
                            <h3 className="text-xl font-bold mb-2">Local Flavors</h3>
                            <p className="text-gray-600">Our chefs craft exquisite dishes using locally sourced ingredients and traditional Kerala recipes.</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
