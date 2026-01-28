import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react';
import logo from '../../assets/routeguide.svg';

export default function Footer() {
    return (
        <footer className="bg-gray-900 text-white pt-16 pb-8" id="contact">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    <div>
                        <div className="flex items-center mb-1">
                            <img src={logo} alt="Route Guide" className="h-50 w-auto brightness-0 invert" />
                        </div>
                        <p className="text-gray-400">
                            Experience the ultimate tranquility at Banasura Sagar Dam. Your journey to peace begins here.
                        </p>
                        <div className="flex gap-4 mt-1">
                            <a href="#" className="text-gray-400 hover:text-white transition-colors"><Facebook className="h-5 w-5" /></a>
                            <a href="#" className="text-gray-400 hover:text-white transition-colors"><Instagram className="h-5 w-5" /></a>
                            <a href="#" className="text-gray-400 hover:text-white transition-colors"><Twitter className="h-5 w-5" /></a>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold mb-6 uppercase text-sm tracking-widest text-primary-400">Quick Links</h4>
                        <ul className="space-y-4">
                            <li><a href="/" className="text-gray-400 hover:text-white transition-colors">Home</a></li>
                            <li><a href="/about" className="text-gray-400 hover:text-white transition-colors">About Us</a></li>
                            <li><a href="/gallery" className="text-gray-400 hover:text-white transition-colors">Gallery</a></li>
                            <li><a href="/rooms" className="text-gray-400 hover:text-white transition-colors">Rooms & Suites</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-lg font-semibold mb-6">Contact Us</h4>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3 text-gray-400">
                                <MapPin className="h-5 w-5 text-primary-400 shrink-0 mt-0.5" />
                                <span>Banasura Sagar Dam, Wayanad, Kerala</span>
                            </li>
                            <li className="flex items-center gap-3 text-gray-400">
                                <Phone className="h-5 w-5 text-primary-400 shrink-0" />
                                <span>+91 98765 43210</span>
                            </li>
                            <li className="flex items-center gap-3 text-gray-400">
                                <Mail className="h-5 w-5 text-primary-400 shrink-0" />
                                <span>info@routeguide.com</span>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-lg font-semibold mb-6">Newsletter</h4>
                        <p className="text-gray-400 mb-4">Subscribe for wellness tips and exclusive offers.</p>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                placeholder="Your email"
                                className="bg-gray-800 text-white px-4 py-2 rounded-lg flex-1 border border-gray-700 focus:outline-none focus:border-primary-500"
                            />
                            <button className="bg-primary-600 px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
                                Subscribe
                            </button>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm">
                    <p>&copy; {new Date().getFullYear()} Route Guide. All rights reserved.</p>
                    <div className="flex gap-4 mt-4 md:mt-0">
                        <a href="/terms" className="hover:text-white">Terms & Conditions</a>
                        <a href="/privacy" className="hover:text-white">Privacy Policy</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
