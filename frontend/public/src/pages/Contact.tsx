import { Mail, Phone, MapPin, Clock } from 'lucide-react';

export default function Contact() {
    return (
        <div className="pt-28 pb-12 min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-serif font-bold text-gray-900 mb-4">Contact Us</h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        We're here to help you plan your perfect getaway. Reach out to us with any questions or special requests.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* Contact Info */}
                    <div className="bg-white rounded-2xl p-8 shadow-sm">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Get in Touch</h2>
                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="bg-primary-50 p-3 rounded-lg">
                                    <Phone className="h-6 w-6 text-primary-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Phone</h3>
                                    <p className="text-gray-600">+91 98765 43210</p>
                                    <p className="text-sm text-gray-500">Mon-Sun 9am - 8pm</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="bg-primary-50 p-3 rounded-lg">
                                    <Mail className="h-6 w-6 text-primary-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Email</h3>
                                    <p className="text-gray-600">reservations@naturehaven.com</p>
                                    <p className="text-sm text-gray-500">Online support 24/7</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="bg-primary-50 p-3 rounded-lg">
                                    <MapPin className="h-6 w-6 text-primary-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Location</h3>
                                    <p className="text-gray-600">Nature Haven Resort</p>
                                    <p className="text-gray-600">Munnar, Kerala, India - 685612</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Map Placeholder */}
                    <div className="bg-gray-200 rounded-2xl h-80 md:h-full min-h-[300px] flex items-center justify-center">
                        <p className="text-gray-500 font-medium">Map Integration Coming Soon</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
