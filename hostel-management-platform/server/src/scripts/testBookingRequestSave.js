require('dotenv').config();
const mongoose = require('mongoose');
const BookingRequest = require('../models/BookingRequest');
const Bed = require('../models/Bed');

const testBookingSave = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`Connected to database: ${mongoose.connection.name}`);

    // Check count of booking requests
    const countBefore = await BookingRequest.countDocuments();
    console.log(`BookingRequest count before: ${countBefore}`);

    // Fetch an available bed
    const bed = await Bed.findOne({ reservationStatus: 'Available' });
    if (!bed) {
      console.log('No available bed found to test booking');
      process.exit(0);
    }

    const testAppId = `TEST-S3PG-${Date.now()}`;
    const newReq = await BookingRequest.create({
      applicationId: testAppId,
      name: 'Test Resident',
      email: 'testresident@example.com',
      phone: '9876543210',
      whatsappNumber: '9876543210',
      stayDuration: '6 Months',
      preferredRoom: bed.roomNumber,
      preferredBed: bed.bedNumber,
      utrNumber: '123456789012',
      paymentScreenshot: 'https://example.com/screenshot.jpg',
      paymentStatus: 'Pending Verification',
      status: 'Pending'
    });

    console.log('Created test BookingRequest in DB with ID:', newReq._id);
    const countAfter = await BookingRequest.countDocuments();
    console.log(`BookingRequest count after: ${countAfter}`);

    // Cleanup test record
    await BookingRequest.findByIdAndDelete(newReq._id);
    console.log('Cleaned up test booking request record');

    process.exit(0);
  } catch (err) {
    console.error('Error testing booking save:', err);
    process.exit(1);
  }
};

testBookingSave();
