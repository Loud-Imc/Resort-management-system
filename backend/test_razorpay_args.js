const Razorpay = require('razorpay');
const razorpay = new Razorpay({
    key_id: 'rzp_test_dummy',
    key_secret: 'dummy_secret'
});

async function test() {
    try {
        console.log('Testing single_use...');
        await razorpay.qrCode.create({
            type: 'upi_qr',
            name: 'Test QR',
            usage: 'single_use',
            fixed_amount: true,
            payment_amount: 1000
        });
    } catch (e) {
        console.log('Error with single_use:', e.error || e.message);
    }

    try {
        console.log('Testing single_payment...');
        await razorpay.qrCode.create({
            type: 'upi_qr',
            name: 'Test QR',
            usage: 'single_payment',
            fixed_amount: true,
            payment_amount: 1000
        });
    } catch (e) {
        console.log('Error with single_payment:', e.error || e.message);
    }
}

test();
