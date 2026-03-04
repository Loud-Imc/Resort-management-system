const Razorpay = require('razorpay');
const razorpay = new Razorpay({
    key_id: 'rzp_test_dummy',
    key_secret: 'dummy_secret'
});

async function test() {
    try {
        console.log('Testing with amount...');
        // We look at the generated request in the error if possible
        await razorpay.qrCode.create({
            type: 'upi_qr',
            name: 'Test QR',
            usage: 'single_use',
            fixed_amount: true,
            amount: 1000
        });
    } catch (e) {
        // Log the full error to see if it complains about missing amount
        console.log('Error with amount:', JSON.stringify(e.error || e.message));
    }

    try {
        console.log('Testing with payment_amount...');
        await razorpay.qrCode.create({
            type: 'upi_qr',
            name: 'Test QR',
            usage: 'single_use',
            fixed_amount: true,
            payment_amount: 1000
        });
    } catch (e) {
        console.log('Error with payment_amount:', JSON.stringify(e.error || e.message));
    }
}

test();
