const express = require('express');
const mongoose = require('mongoose');
const Room = require('../models/Room');
const Bed = require('../models/Bed');
const BookingRequest = require('../models/BookingRequest');
const MessSubscriber = require('../models/MessSubscriber');

const router = express.Router();

let isSeeded = false;

/**
 * Ensure database is seeded if MongoDB collection is empty
 */
const ensureSeedMatrix = async () => {
  if (isSeeded) return;
  const bedExists = await Bed.exists({});
  if (bedExists) {
    isSeeded = true;
    return;
  }

  const floorLayouts = [
    { floorName: 'Ground Floor', rooms: [{id: 'S01', beds: 6}, {id: 'S02', beds: 6}] },
    { floorName: '1st Floor', rooms: [
        {id: 'S11', beds: 4}, {id: 'S12', beds: 4}, {id: 'S13', beds: 4}, {id: 'S14', beds: 4},
        {id: 'S15', beds: 5}, {id: 'S16', beds: 5}, {id: 'S17', beds: 5}, {id: 'S18', beds: 5}
      ] },
    { floorName: '2nd Floor', rooms: [
        {id: 'S21', beds: 4}, {id: 'S22', beds: 4}, {id: 'S23', beds: 4}, {id: 'S24', beds: 4},
        {id: 'S25', beds: 5}, {id: 'S26', beds: 5}, {id: 'S27', beds: 5}, {id: 'S28', beds: 5}
      ] },
    { floorName: '3rd Floor', rooms: [
        {id: 'S31', beds: 4}, {id: 'S32', beds: 4}, {id: 'S33', beds: 5}, {id: 'S34', beds: 5}
      ] }
  ];

  for (const floor of floorLayouts) {
    for (const roomObj of floor.rooms) {
      const roomNum = roomObj.id;
      const capacity = roomObj.beds;
      
      const exactRent = capacity === 4 ? 6000 : 5500;
      
      let floorInt = 1;
      if (floor.floorName === 'Ground Floor') floorInt = 0;
      else if (floor.floorName === '2nd Floor') floorInt = 2;
      else if (floor.floorName === '3rd Floor') floorInt = 3;

      await Room.findOneAndUpdate(
        { roomNumber: roomNum },
        {
          roomNumber: roomNum,
          floor: floorInt,
          floorName: floor.floorName,
          capacity: capacity,
          rentPerBed: exactRent,
          type: 'AC',
          status: 'Available'
        },
        { upsert: true }
      );

      for (let c = 1; c <= capacity; c++) {
        const isOccupied = false;
        await Bed.findOneAndUpdate(
          { roomNumber: roomNum, bedNumber: c },
          {
            bedNumber: c,
            roomNumber: roomNum,
            floorName: floor.floorName,
            occupied: isOccupied,
            reservationStatus: isOccupied ? 'Occupied' : 'Available',
            rentPerBed: exactRent
          },
          { upsert: true }
        );
      }
    }
  }
};

/**
 * Sanitizes a bed object for public viewing: strictly NEVER exposes student name, phone, email, documents, or UTRs.
 */
const sanitizeBed = (bed) => ({
  _id: bed._id,
  bedNumber: bed.bedNumber,
  roomNumber: bed.roomNumber,
  floorName: bed.floorName,
  occupied: bed.occupied || bed.reservationStatus === 'Occupied',
  reservationStatus: (bed.occupied || bed.reservationStatus === 'Occupied')
    ? 'Occupied'
    : (bed.reservationStatus || 'Available'),
  maintenanceStatus: bed.maintenanceStatus || 'Functional',
  rentPerBed: bed.rentPerBed || 6000
});

/**
 * GET /api/public/statistics
 * Secure public statistics calculated purely from live MongoDB data
 */
router.get('/statistics', async (req, res) => {
  try {
    await ensureSeedMatrix();

    const rooms = await Room.find();
    const beds = await Bed.find();

    const totalRooms = new Set(beds.map(b => b.roomNumber)).size || rooms.length || 22;
    const totalBeds = beds.length;
    const occupiedBeds = beds.filter(b => b.occupied || b.reservationStatus === 'Occupied').length;
    const vacantBeds = beds.filter(b => (!b.occupied && b.reservationStatus === 'Available')).length;
    const reservedBeds = beds.filter(b => b.reservationStatus === 'Reserved').length;
    const maintenanceBeds = beds.filter(b => b.reservationStatus === 'Maintenance').length;

    const occupancyPercentage = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
    const floorsSet = new Set(beds.map(b => b.floorName));
    const totalFloors = floorsSet.size || 4;

    return res.status(200).json({
      success: true,
      data: {
        totalRooms,
        totalBeds,
        occupiedBeds,
        vacantBeds: Math.max(0, vacantBeds),
        reservedBeds,
        maintenanceBeds,
        occupancyPercentage,
        totalFloors,
        pricing: {
          monthlyRent: 6000,
          deposit: 5000,
          foodCharges: 0, // Included
          electricityCharges: 0, // Included
          maintenanceCharges: 0 // Included
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/public/beds
 * Secure public list of all beds (sanitized)
 */
router.get('/beds', async (req, res) => {
  try {
    await ensureSeedMatrix();
    const beds = await Bed.find().sort({ roomNumber: 1, bedNumber: 1 });
    const sanitizedBeds = beds.map(sanitizeBed);

    return res.status(200).json({ success: true, data: sanitizedBeds });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/public/rooms
 * Secure public list of all rooms grouped with their beds
 */
router.get('/rooms', async (req, res) => {
  try {
    await ensureSeedMatrix();
    const beds = await Bed.find().sort({ roomNumber: 1, bedNumber: 1 });

    const roomsMap = {};
    for (const bed of beds) {
      if (!roomsMap[bed.roomNumber]) {
        roomsMap[bed.roomNumber] = {
          roomNumber: bed.roomNumber,
          floorName: bed.floorName || '1st Floor',
          rentPerBed: bed.rentPerBed || 6000,
          status: 'Available',
          facilities: ['Enterprise High-Speed WiFi', 'Inverter AC', 'Ergonomic Work Desk', '24/7 Power Backup', 'Biometric Security'],
          beds: []
        };
      }
      // Ensure unique bedNumbers per room
      if (!roomsMap[bed.roomNumber].beds.some(b => b.bedNumber === bed.bedNumber)) {
        roomsMap[bed.roomNumber].beds.push(sanitizeBed(bed));
      }
    }

    // Determine room level status & accurate sharing type
    Object.values(roomsMap).forEach(r => {
      r.beds.sort((a, b) => a.bedNumber - b.bedNumber);
      r.sharingType = `${r.beds.length} Sharing`;
      const allOccupied = r.beds.every(b => b.occupied || b.reservationStatus === 'Occupied');
      const anyMaintenance = r.beds.some(b => b.reservationStatus === 'Maintenance');
      if (anyMaintenance) r.status = 'Maintenance';
      else if (allOccupied) r.status = 'Full';
      else r.status = 'Available';
    });

    return res.status(200).json({
      success: true,
      data: Object.values(roomsMap)
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/public/availability
 * Live availability API endpoint
 */
router.get('/availability', async (req, res) => {
  try {
    await ensureSeedMatrix();
    const beds = await Bed.find();
    const availableBeds = beds.filter(b => !b.occupied && b.reservationStatus === 'Available');

    return res.status(200).json({
      success: true,
      data: {
        totalAvailable: availableBeds.length,
        beds: availableBeds.map(sanitizeBed)
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/public/room/:id
 * Secure single room details
 */
router.get('/room/:id', async (req, res) => {
  try {
    const roomNumber = req.params.id;
    const beds = await Bed.find({ roomNumber }).sort({ bedNumber: 1 });
    if (!beds || beds.length === 0) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const sanitizedBeds = beds.map(sanitizeBed);
    const roomInfo = {
      roomNumber,
      floorName: beds[0].floorName || '1st Floor',
      sharingType: `${beds.length} Sharing`,
      rentPerBed: beds[0].rentPerBed || 6000,
      facilities: ['Enterprise High-Speed WiFi', 'Inverter AC', 'Ergonomic Work Desk', '24/7 Power Backup', 'Biometric Security'],
      availableBeds: sanitizedBeds.filter(b => b.reservationStatus === 'Available').length,
      occupiedBeds: sanitizedBeds.filter(b => b.reservationStatus === 'Occupied').length,
      beds: sanitizedBeds
    };

    return res.status(200).json({ success: true, data: roomInfo });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/public/verify-booking
 * Check if a booking request exists for a specific room, bed, and optional UTR/phone
 */
router.get('/verify-booking', async (req, res) => {
  try {
    const { room, bed, utr, phone } = req.query;
    if (!room || bed == null) {
      return res.status(400).json({ success: false, message: 'Missing room or bed' });
    }

    const filter = { preferredRoom: room, preferredBed: Number(bed) };
    if (utr) filter.utrNumber = utr;
    else if (phone) filter.phone = phone;

    const existingReq = await BookingRequest.findOne(filter).sort({ createdAt: -1 });
    if (existingReq) {
      return res.status(200).json({
        success: true,
        found: true,
        data: existingReq
      });
    }

    return res.status(200).json({ success: true, found: false });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/public/booking-request
 * Create a new booking request for a bed
 */
router.post('/booking-request', async (req, res) => {
  try {
    const { name, email, phone, whatsappNumber, fatherName, currentAddress, occupation, notes, collegeCompany, emergencyContact, aadhaar, expectedJoiningDate, stayDuration, preferredRoom, preferredBed, utrNumber, paymentScreenshot } = req.body;

    if (!name || !email || !phone || !preferredRoom || preferredBed == null || !stayDuration) {
      return res.status(400).json({ success: false, message: 'Missing required booking fields, including Stay Duration' });
    }

    if (!utrNumber || utrNumber.length !== 12 || !paymentScreenshot) {
      return res.status(400).json({ success: false, message: 'Valid 12-digit UTR Number and Payment Screenshot are required.' });
    }

    // Check if bed exists
    const bed = await Bed.findOne({ roomNumber: preferredRoom, bedNumber: preferredBed });
    if (!bed) {
      return res.status(404).json({ success: false, message: 'Bed not found' });
    }

    // Check if a booking request for this exact bed and user/UTR was already placed (e.g. fast duplicate submit or retry)
    const existingReq = await BookingRequest.findOne({
      preferredRoom,
      preferredBed: Number(preferredBed),
      $or: [{ utrNumber }, { phone }, { email }]
    }).sort({ createdAt: -1 });

    if (existingReq) {
      // Bed was reserved by this user's booking request - return success
      return res.status(200).json({
        success: true,
        message: 'Booking request submitted successfully',
        data: existingReq
      });
    }

    // Check if bed is occupied or under maintenance
    if (bed.occupied || bed.reservationStatus === 'Occupied') {
      return res.status(400).json({ success: false, message: 'This bed is currently occupied by a resident.' });
    }

    if (bed.reservationStatus === 'Maintenance') {
      return res.status(400).json({ success: false, message: 'This bed is currently under maintenance.' });
    }

    const applicationId = `S3PG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Parse date safely
    let parsedJoiningDate = Date.now();
    if (expectedJoiningDate) {
      const d = new Date(expectedJoiningDate);
      if (!isNaN(d.getTime())) parsedJoiningDate = d;
    }

    // Create the booking request
    const bookingReq = await BookingRequest.create({
      applicationId,
      name,
      email,
      phone,
      whatsappNumber,
      fatherName,
      currentAddress,
      occupation,
      notes,
      collegeCompany,
      emergencyContact,
      aadhaar,
      expectedJoiningDate: parsedJoiningDate,
      stayDuration,
      preferredRoom,
      preferredBed: Number(preferredBed),
      utrNumber,
      paymentScreenshot,
      paymentStatus: 'Pending Verification',
      status: 'Pending'
    });

    // Mark the bed as reserved
    bed.reservationStatus = 'Reserved';
    await bed.save();

    // Emit Socket event to update the public website & admin dashboard in real-time
    const io = req.app.get('io') || req.app.get('socketio');
    if (io) {
      io.emit('ERP_EVENT', { type: 'BOOKING_REQUEST', payload: { roomNumber: preferredRoom, bedNumber: preferredBed } });
      io.emit('BED_RESERVED', {
        roomNumber: preferredRoom,
        bedNumber: preferredBed,
        reservationStatus: 'Reserved'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Booking request submitted successfully',
      data: bookingReq
    });
  } catch (err) {
    console.error('Error submitting booking request:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to submit booking request' });
  }
});

/**
 * POST /api/public/mess-registration
 * Create a new monthly mess subscription request
 */
router.post('/mess-registration', async (req, res) => {
  try {
    const { name, email, phone, whatsappNumber, address, collegeCompany, occupation, mealPreference, startDate, plan, notes, utrNumber, paymentScreenshot } = req.body;

    if (!name || !email || !phone || !startDate) {
      return res.status(400).json({ success: false, message: 'Missing required mess registration fields' });
    }

    if (!utrNumber || utrNumber.length !== 12 || !paymentScreenshot) {
      return res.status(400).json({ success: false, message: 'Valid 12-digit UTR Number and Payment Screenshot are required.' });
    }

    const applicationId = `S3PG-MESS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const messSub = await MessSubscriber.create({
      applicationId,
      name,
      email,
      phone,
      whatsappNumber,
      address,
      collegeCompany,
      occupation,
      mealPreference,
      startDate,
      plan,
      notes,
      utrNumber,
      paymentScreenshot,
      paymentStatus: 'Pending Verification',
      status: 'Pending'
    });

    return res.status(201).json({
      success: true,
      message: 'Mess registration submitted successfully',
      data: messSub
    });
  } catch (err) {
    console.error('Error submitting mess registration:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit mess registration' });
  }
});

module.exports = router;

