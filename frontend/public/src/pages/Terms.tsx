export default function Terms() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-20">
            <h1 className="text-4xl font-serif font-bold mb-8">Terms and Conditions</h1>
            <div className="prose prose-lg max-w-none text-gray-600">
                <p>Last updated: {new Date().toLocaleDateString()}</p>

                <h3>1. Introduction</h3>
                <p>Welcome to Route Guide. By accessing our website and booking our services, you agree to these terms.</p>

                <h3>2. Booking & Cancellation</h3>
                <p>Reservations are confirmed upon receipt of payment. Cancellations made 48 hours prior to check-in are eligible for a full refund.</p>

                <h3>3. Resort Rules</h3>
                <p>We are an eco-friendly property. Please respect the environment and local wildlife. Loud music is prohibited after 10 PM.</p>

                <h3>4. Liability</h3>
                <p>Route Guide is not responsible for loss of personal belongings. Guests are advised to use the in-room safes.</p>
            </div>
        </div>
    );
}
