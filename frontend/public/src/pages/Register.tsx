import { Link, useSearchParams } from 'react-router-dom';
import { Phone, ArrowRight } from 'lucide-react';

export default function Register() {
    const [searchParams] = useSearchParams();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <h2 className="text-3xl font-extrabold text-gray-900 font-serif">
                    Instant Registration
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                    No forms, no passwords. Just use your phone number.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-10 px-4 shadow sm:rounded-xl sm:px-10 border border-gray-100 text-center">
                    <div className="flex justify-center mb-6 text-primary-600 bg-primary-50 w-16 h-16 rounded-full items-center mx-auto">
                        <Phone className="h-8 w-8" />
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-2">Register with OTP</h3>
                    <p className="text-gray-600 text-sm mb-8">
                        Sign up instantly using your phone number. We'll send you a verification code to create your account.
                    </p>

                    <Link
                        to={`/login?mode=phone${searchParams.get('redirect') ? `&redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : ''}`}
                        className="w-full flex justify-center py-4 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all flex items-center gap-2"
                    >
                        Continue with Phone <ArrowRight className="h-4 w-4" />
                    </Link>

                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <p className="text-sm text-gray-600">
                            Already have an account?{' '}
                            <Link
                                to={`/login${searchParams.get('redirect') ? `?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : ''}`}
                                className="font-medium text-primary-600 hover:text-primary-500"
                            >
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
