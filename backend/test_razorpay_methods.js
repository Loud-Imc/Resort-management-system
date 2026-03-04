const Razorpay = require('razorpay');
const razorpay = new Razorpay({
    key_id: 'rzp_test_dummy',
    key_secret: 'dummy_secret'
});

console.log('qrCode properties:', Object.keys(razorpay.qrCode));
