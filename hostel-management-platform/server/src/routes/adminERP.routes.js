const express = require('express');
const mongoose = require('mongoose');
const Room = require('../models/Room');
const Bed = require('../models/Bed');
const Student = require('../models/Student');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Complaint = require('../models/Complaint');
const BookingRequest = require('../models/BookingRequest');
const MessSubscriber = require('../models/MessSubscriber');
const RentRenewal = require('../models/RentRenewal');

const router = express.Router();

/**
 * Helper to broadcast Socket.IO events to all connected clients
 */
const emitSocketEvent = (req, eventType, payload) => {
  const io = req.app.get('io');
  if (io) {
    io.emit('ERP_EVENT', {
      type: eventType,
      payload,
      timestamp: Date.now()
    });
  }
};

/**
 * Ensure database is seeded with layout and sample MongoDB records if collection is empty.
 * Floors:
 * - Ground Floor / Ground Floor: S01, S02
 * - 1st Floor: S11 to S18
 * - 2nd Floor: S21 to S28
 * - 3rd Floor: S31 to S34
 */
const ensureSeedMatrix = async () => {
  const bedCount = await Bed.countDocuments();
  if (bedCount > 0) return;

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

  const sampleResidents = [
    {
      name: 'Rahul Sharma',
      phone: '+91 98765 43210',
      whatsappNumber: '+91 98765 43210',
      email: 'rahulsharma@gmail.com',
      companyName: 'Infosys Ltd',
      occupation: 'Software Engineer',
      collegeName: 'IIT Hyderabad',
      fatherName: 'Rajesh Sharma',
      motherName: 'Sunita Sharma',
      emergencyContact: '+91 91234 56789',
      currentAddress: 'Room S11, Cot #1, S3 Elite PG',
      permanentAddress: '402, Green Avenue, Kurnool, AP - 518002',
      aadhaarNumber: 'XXXX-XXXX-4829',
      admissionDate: '15 July 2026',
      joiningDate: '15 July 2026',
      duration: '11 Months',
      rentPerBed: 6000,
      securityDeposit: 5000,
      pendingAmount: 0,
      lastPaymentDate: '05 July 2026',
      nextDueDate: '15 August 2026',
      paymentStatus: 'Paid'
    },
    {
      name: 'Aditya Verma',
      phone: '+91 98111 22334',
      whatsappNumber: '+91 98111 22334',
      email: 'adityaverma@gmail.com',
      companyName: 'TCS Innovation Labs',
      occupation: 'System Analyst',
      collegeName: 'NIT Warangal',
      fatherName: 'Suresh Verma',
      motherName: 'Kavita Verma',
      emergencyContact: '+91 98111 99887',
      currentAddress: 'Room S11, Cot #2, S3 Elite PG',
      permanentAddress: '12, MG Road, Vijayawada, AP - 520001',
      aadhaarNumber: 'XXXX-XXXX-9182',
      admissionDate: '01 July 2026',
      joiningDate: '01 July 2026',
      duration: '11 Months',
      rentPerBed: 6000,
      securityDeposit: 5000,
      pendingAmount: 6000,
      lastPaymentDate: '01 June 2026',
      nextDueDate: '09 July 2026',
      paymentStatus: 'Overdue'
    },
    {
      name: 'Karthik Reddy',
      phone: '+91 94400 11223',
      whatsappNumber: '+91 94400 11223',
      email: 'karthikreddy@gmail.com',
      companyName: 'Wipro Technologies',
      occupation: 'Cloud Architect',
      collegeName: 'BITS Pilani',
      fatherName: 'Narasimha Reddy',
      motherName: 'Lakshmi Reddy',
      emergencyContact: '+91 94400 33445',
      currentAddress: 'Room S12, Cot #1, S3 Elite PG',
      permanentAddress: '88, Jubilee Hills, Hyderabad, TS - 500033',
      aadhaarNumber: 'XXXX-XXXX-3341',
      admissionDate: '10 July 2026',
      joiningDate: '10 July 2026',
      duration: '11 Months',
      rentPerBed: 6000,
      securityDeposit: 5000,
      pendingAmount: 0,
      lastPaymentDate: '10 July 2026',
      nextDueDate: '10 August 2026',
      paymentStatus: 'Paid'
    },
    {
      name: 'Siddharth Rao',
      phone: '+91 99887 76655',
      whatsappNumber: '+91 99887 76655',
      email: 'siddharthrao@gmail.com',
      companyName: 'Tech Mahindra',
      occupation: 'DevOps Engineer',
      collegeName: 'Osmania University',
      fatherName: 'Venkatesh Rao',
      motherName: 'Anitha Rao',
      emergencyContact: '+91 99887 11223',
      currentAddress: 'Room S21, Cot #1, S3 Elite PG',
      permanentAddress: '23, Banjara Hills, Hyderabad, TS - 500034',
      aadhaarNumber: 'XXXX-XXXX-7721',
      admissionDate: '09 July 2026',
      joiningDate: '09 July 2026',
      duration: '11 Months',
      rentPerBed: 5800,
      securityDeposit: 5000,
      pendingAmount: 0,
      lastPaymentDate: '09 July 2026',
      nextDueDate: '09 July 2026',
      paymentStatus: 'Due Today'
    }
  ];

  let resIndex = 0;

  for (const floor of floorLayouts) {
    for (const roomObj of floor.rooms) {
      const roomNum = roomObj.id;
      const capacity = roomObj.beds;
      const roomRent = capacity === 4 ? 6000 : 5500;
      await Room.findOneAndUpdate(
        { roomNumber: roomNum },
        {
          roomNumber: roomNum,
          floor: floor.floorName === 'Ground Floor' ? 0 : parseInt(floor.floorName),
          capacity: capacity,
          rentPerBed: roomRent,
          type: 'AC',
          status: 'Available'
        },
        { upsert: true }
      );

      for (let c = 1; c <= capacity; c++) {
        const isOccupied = (roomNum === 'S11' && c <= 2) || (roomNum === 'S12' && c === 1) || (roomNum === 'S21' && c === 1);
        const resident = isOccupied ? sampleResidents[resIndex++ % sampleResidents.length] : null;

        await Bed.create({
          bedNumber: c,
          roomNumber: roomNum,
          floorName: floor.floorName,
          occupied: isOccupied,
          studentName: resident ? resident.name : null,
          profilePhoto: resident?.profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          studentId: resident ? `S3-${roomNum}-B${c}` : null,
          admissionNumber: resident ? `ADM-${202600 + resIndex}` : null,
          phone: resident ? resident.phone : '+91 98765 43210',
          whatsappNumber: resident ? resident.whatsappNumber : '+91 98765 43210',
          email: resident ? resident.email : null,
          fatherName: resident ? resident.fatherName : 'Rajesh Sharma',
          motherName: resident ? resident.motherName : 'Sunita Sharma',
          emergencyContact: resident ? resident.emergencyContact : '+91 91234 56789',
          currentAddress: resident ? resident.currentAddress : '',
          permanentAddress: resident ? resident.permanentAddress : '402, Green Avenue, Kurnool, AP - 518002',
          collegeName: resident ? resident.collegeName : 'IIT Hyderabad',
          companyName: resident ? resident.companyName : 'TechSolutions India Pvt Ltd',
          occupation: resident ? resident.occupation : 'Software Engineer',
          aadhaarNumber: resident ? resident.aadhaarNumber : 'XXXX-XXXX-4829',
          admissionDate: resident ? resident.admissionDate : '15 July 2026',
          joiningDate: resident ? resident.joiningDate : '15 July 2026',
          duration: resident ? resident.duration : '11 Months',
          rentPerBed: resident ? resident.rentPerBed : roomRent,
          securityDeposit: resident ? resident.securityDeposit : 5000,
          pendingAmount: resident ? resident.pendingAmount : 0,
          lastPaymentDate: resident ? resident.lastPaymentDate : '05 July 2026',
          nextDueDate: resident ? resident.nextDueDate : '15 August 2026',
          paymentStatus: resident ? resident.paymentStatus : 'Paid',
          reservationStatus: isOccupied ? 'Occupied' : 'Available',
          documentsUploaded: resident ? [
            { name: 'Aadhaar Card (Masked).pdf', type: 'ID Proof', uploadedAt: new Date() },
            { name: '11-Month Rental Agreement.pdf', type: 'Agreement', uploadedAt: new Date() }
          ] : [],
          notes: isOccupied ? '11-month agreement signed. Biometric profile active.' : 'Vacant cot ready for registration.',
          activityTimeline: resident ? [
            { date: '15 July 2026', title: 'Resident Admitted', description: `Assigned Room ${roomNum} Cot #${c}`, timestamp: new Date() }
          ] : []
        });
      }
    }
  }

  // Also seed initial sample payment records in MongoDB if none exist
  const paymentCount = await Payment.countDocuments();
  if (paymentCount === 0) {
    await Payment.create([
      {
        student: new mongoose.Types.ObjectId(),
        user: new mongoose.Types.ObjectId(),
        studentName: 'Rahul Sharma',
        amount: 6000,
        roomNumber: 'S11',
        bedNumber: 1,
        paymentMethod: 'UPI',
        upiApp: 'Google Pay',
        utrNumber: '318294019283',
        verificationStatus: 'Verified',
        status: 'Successful',
        transactionId: 'TXN_992817293',
        monthYear: 'July 2026',
        receiptNumber: 'REC-202607-001'
      },
      {
        student: new mongoose.Types.ObjectId(),
        user: new mongoose.Types.ObjectId(),
        studentName: 'Aditya Verma',
        amount: 6000,
        roomNumber: 'S11',
        bedNumber: 2,
        paymentMethod: 'UPI',
        upiApp: 'PhonePe',
        utrNumber: '419283749102',
        verificationStatus: 'Pending Verification',
        status: 'Pending',
        transactionId: 'TXN_419283749',
        monthYear: 'July 2026',
        receiptNumber: 'REC-202607-002'
      },
      {
        student: new mongoose.Types.ObjectId(),
        user: new mongoose.Types.ObjectId(),
        studentName: 'Karthik Reddy',
        amount: 6000,
        roomNumber: 'S12',
        bedNumber: 1,
        paymentMethod: 'UPI',
        upiApp: 'Paytm',
        utrNumber: '510293847102',
        verificationStatus: 'Verified',
        status: 'Successful',
        transactionId: 'TXN_510293847',
        monthYear: 'July 2026',
        receiptNumber: 'REC-202607-003'
      }
    ]);
  }
};

/**
 * AUTOMATIC RENT CYCLE & PAYMENT STATUS HELPER
 * Evaluates all occupied beds and calculates:
 * - nextDueDate (+30 days cycle)
 * - paymentStatus ('Paid' | 'Due Today' | 'Due Tomorrow' | 'Overdue' | 'Advance Paid' | 'Pending Payment')
 */
const evaluateRentCycles = async () => {
  const beds = await Bed.find({ occupied: true });
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  for (const bed of beds) {
    if (!bed.nextDueDate) continue;
    // Compare dates
    const dueTime = new Date(bed.nextDueDate).getTime();
    const nowTime = now.getTime();
    const diffDays = Math.floor((nowTime - dueTime) / (1000 * 60 * 60 * 24));

    if (diffDays > 0 && bed.paymentStatus !== 'Paid') {
      bed.paymentStatus = 'Overdue';
    } else if (diffDays === 0 && bed.paymentStatus !== 'Paid') {
      bed.paymentStatus = 'Due Today';
    } else if (diffDays === -1 && bed.paymentStatus !== 'Paid') {
      bed.paymentStatus = 'Due Tomorrow';
    }
    await bed.save();
  }
};

/**
 * GET /api/admin/erp/stats
 * Real-Time dynamic statistics computed from MongoDB
 */
router.get('/stats', async (req, res) => {
  try {
    await ensureSeedMatrix();
    await evaluateRentCycles();

    const totalBeds = await Bed.countDocuments();
    const occupiedBeds = await Bed.countDocuments({ occupied: true });
    const vacantBeds = await Bed.countDocuments({ occupied: false, reservationStatus: 'Available' });
    const reservedBeds = await Bed.countDocuments({ reservationStatus: 'Reserved' });

    // Revenue calculations
    const allPayments = await Payment.find();
    const verifiedPaymentsList = allPayments.filter(p => p.verificationStatus === 'Verified');
    const pendingPaymentsList = allPayments.filter(p => p.verificationStatus === 'Pending Verification');

    const collectedRevenue = verifiedPaymentsList.reduce((acc, p) => acc + (p.amount || 0), 0);

    const occupiedBedsList = await Bed.find({ occupied: true });
    const expectedRevenue = occupiedBedsList.reduce((acc, b) => acc + (b.rentPerBed || 6000), 0);
    const pendingRevenue = Math.max(0, expectedRevenue - collectedRevenue);

    // Today's revenue
    const todayStr = new Date().toISOString().slice(0, 10);
    const todaysRevenue = verifiedPaymentsList
      .filter(p => (p.createdAt && p.createdAt.toISOString().slice(0, 10) === todayStr))
      .reduce((acc, p) => acc + (p.amount || 0), 0);

    const overdueStudentsCount = await Bed.countDocuments({ occupied: true, paymentStatus: 'Overdue' });

    // Complaints stats
    const pendingComplaintsCount = await Complaint.countDocuments({ status: { $in: ['Open', 'In Progress'] } });
    const resolvedComplaintsCount = await Complaint.countDocuments({ status: 'Resolved' });

    return res.status(200).json({
      success: true,
      data: {
        totalStudents: occupiedBeds,
        occupiedBeds,
        vacantBeds,
        reservedBeds,
        totalBeds,
        todaysRevenue,
        monthlyRevenue: collectedRevenue,
        expectedRevenue,
        collectedRevenue,
        pendingRevenue,
        overdueStudents: overdueStudentsCount,
        pendingPaymentsCount: pendingPaymentsList.length,
        verifiedPaymentsCount: verifiedPaymentsList.length,
        pendingComplaintsCount,
        resolvedComplaintsCount
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/erp/matrix
 * Get all floors, rooms, and live DB beds
 */
router.get('/matrix', async (req, res) => {
  try {
    await ensureSeedMatrix();
    const beds = await Bed.find().sort({ roomNumber: 1, bedNumber: 1 });
    
    // Deduplicate by roomNumber and bedNumber to strictly guarantee no duplicate cot cards render on Admin side
    const uniqueBedsMap = new Map();
    beds.forEach(bed => {
      const key = `${bed.roomNumber}_${bed.bedNumber}`;
      if (!uniqueBedsMap.has(key)) {
        uniqueBedsMap.set(key, bed);
      }
    });

    const uniqueBeds = Array.from(uniqueBedsMap.values());
    return res.status(200).json({ success: true, data: uniqueBeds });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/erp/bed/:bedId
 * Fetch complete student profile from MongoDB
 */
router.get('/bed/:bedId', async (req, res) => {
  try {
    const bed = await Bed.findById(req.params.bedId);
    if (!bed) {
      return res.status(404).json({ success: false, message: 'Bed record not found in MongoDB.' });
    }

    const payments = await Payment.find({ roomNumber: bed.roomNumber }).sort({ createdAt: -1 });
    const complaints = await Complaint.find({ roomNumber: bed.roomNumber }).sort({ createdAt: -1 });
    const room = await Room.findOne({ roomNumber: bed.roomNumber });

    return res.status(200).json({
      success: true,
      data: {
        ...bed.toObject(),
        room: room ? room.toObject() : null,
        payments,
        complaints
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/admin/erp/bed/:bedId
 * Admin Edit Permissions: Modify student details, room, bed, rent, status
 */
router.put('/bed/:bedId', async (req, res) => {
  try {
    const bed = await Bed.findById(req.params.bedId);
    if (!bed) {
      return res.status(404).json({ success: false, message: 'Bed not found in database' });
    }

    const fieldsToUpdate = [
      'studentName', 'phone', 'whatsappNumber', 'email', 'fatherName', 'motherName',
      'emergencyContact', 'currentAddress', 'permanentAddress', 'collegeName',
      'companyName', 'occupation', 'aadhaarNumber', 'admissionDate', 'joiningDate',
      'duration', 'rentPerBed', 'securityDeposit', 'pendingAmount',
      'lastPaymentDate', 'nextDueDate', 'paymentStatus', 'reservationStatus',
      'notes', 'profilePhoto', 'occupied'
    ];

    fieldsToUpdate.forEach(field => {
      if (req.body[field] !== undefined) {
        bed[field] = req.body[field];
      }
    });

    // Also support 'name' mapping to studentName
    if (req.body.name !== undefined) bed.studentName = req.body.name;
    if (req.body.monthlyRent !== undefined) bed.rentPerBed = req.body.monthlyRent;

    if (bed.occupied && !bed.reservationStatus) {
      bed.reservationStatus = 'Occupied';
    }

    // Add timeline entry
    bed.activityTimeline.push({
      date: new Date().toLocaleDateString('en-GB'),
      title: 'Profile Updated by Admin',
      description: 'Modified resident details & fee cycle in MongoDB',
      timestamp: new Date()
    });

    await bed.save();

    // Emit Socket.IO Event
    emitSocketEvent(req, 'STUDENT_UPDATED', bed);

    return res.status(200).json({
      success: true,
      message: 'Student profile updated in MongoDB.',
      data: bed
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/erp/payments
 * Live MongoDB payment management
 */
router.get('/payments', async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: payments });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/admin/erp/payments/:id/verify
 * Verify payment UTR record & automatically mark student Paid
 */
router.put('/payments/:id/verify', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    await Payment.updateOne({ _id: req.params.id }, {
      $set: { verificationStatus: 'Verified', status: 'Successful' }
    });
    payment.verificationStatus = 'Verified'; // For socket event payload
    payment.status = 'Successful';

    // Update bed payment status automatically
    const bed = await Bed.findOne({ roomNumber: payment.roomNumber, bedNumber: payment.bedNumber });
    if (bed) {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      
      await Bed.updateOne({ _id: bed._id }, {
        $set: {
          paymentStatus: 'Paid',
          pendingAmount: 0,
          lastPaymentDate: new Date().toLocaleDateString('en-GB'),
          nextDueDate: d.toLocaleDateString('en-GB')
        }
      });
    }

    emitSocketEvent(req, 'PAYMENT_VERIFIED', payment);

    return res.status(200).json({ success: true, data: payment });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/admin/erp/payments/:id/reject
 * Reject payment UTR record
 */
router.put('/payments/:id/reject', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    await Payment.updateOne({ _id: req.params.id }, {
      $set: { verificationStatus: 'Rejected', status: 'Failed' }
    });
    payment.verificationStatus = 'Rejected'; // For socket event payload
    payment.status = 'Failed';

    emitSocketEvent(req, 'PAYMENT_REJECTED', payment);

    return res.status(200).json({ success: true, data: payment });
  } catch (err) {
    console.error('PAYMENT REJECT ERROR:', err);
    return res.status(500).json({ success: false, message: err.message, stack: err.stack });
  }
});

/**
 * PUT /api/admin/erp/transfer or /api/admin/transfer
 * Transfer student from current bed to a new available bed
 */
router.put('/transfer', async (req, res) => {
  try {
    const { currentBedId, targetRoomNumber, targetBedNumber } = req.body;
    const oldBed = await Bed.findById(currentBedId);
    if (!oldBed || !oldBed.occupied) {
      return res.status(404).json({ success: false, message: 'Current occupied bed not found' });
    }

    const newBed = await Bed.findOne({
      roomNumber: targetRoomNumber,
      bedNumber: Number(targetBedNumber)
    });

    if (!newBed) {
      return res.status(404).json({ success: false, message: 'Target bed not found in MongoDB' });
    }
    if (newBed.occupied || newBed.reservationStatus === 'Occupied') {
      return res.status(400).json({ success: false, message: 'Target bed is already occupied!' });
    }

    // Transfer resident details to new bed
    newBed.occupied = true;
    newBed.reservationStatus = 'Occupied';
    newBed.studentName = oldBed.studentName;
    newBed.profilePhoto = oldBed.profilePhoto;
    newBed.studentId = oldBed.studentId;
    newBed.admissionNumber = oldBed.admissionNumber;
    newBed.phone = oldBed.phone;
    newBed.whatsappNumber = oldBed.whatsappNumber;
    newBed.email = oldBed.email;
    newBed.fatherName = oldBed.fatherName;
    newBed.motherName = oldBed.motherName;
    newBed.emergencyContact = oldBed.emergencyContact;
    newBed.currentAddress = oldBed.currentAddress;
    newBed.permanentAddress = oldBed.permanentAddress;
    newBed.collegeName = oldBed.collegeName;
    newBed.companyName = oldBed.companyName;
    newBed.occupation = oldBed.occupation;
    newBed.aadhaarNumber = oldBed.aadhaarNumber;
    newBed.admissionDate = oldBed.admissionDate;
    newBed.joiningDate = oldBed.joiningDate;
    newBed.duration = oldBed.duration;
    newBed.securityDeposit = oldBed.securityDeposit;
    newBed.pendingAmount = oldBed.pendingAmount;
    newBed.lastPaymentDate = oldBed.lastPaymentDate;
    newBed.nextDueDate = oldBed.nextDueDate;
    newBed.paymentStatus = oldBed.paymentStatus;
    newBed.documentsUploaded = oldBed.documentsUploaded || [];
    newBed.activityTimeline = [
      ...(oldBed.activityTimeline || []),
      {
        date: new Date().toLocaleDateString('en-GB'),
        title: 'Bed Transferred by Admin',
        description: `Transferred from Room ${oldBed.roomNumber} Cot #${oldBed.bedNumber} to Room ${newBed.roomNumber} Cot #${newBed.bedNumber}`,
        timestamp: new Date()
      }
    ];

    await newBed.save();

    // Vacate old bed
    oldBed.occupied = false;
    oldBed.reservationStatus = 'Available';
    oldBed.studentName = null;
    oldBed.email = null;
    oldBed.activityTimeline = [];
    await oldBed.save();

    // Transfer Payments and Complaints to the new bed
    await Payment.updateMany(
      { roomNumber: oldBed.roomNumber, bedNumber: oldBed.bedNumber, studentName: oldBed.studentName },
      { $set: { roomNumber: newBed.roomNumber, bedNumber: newBed.bedNumber } }
    );
    await Complaint.updateMany(
      { roomNumber: oldBed.roomNumber },
      { $set: { roomNumber: newBed.roomNumber } }
    );

    emitSocketEvent(req, 'STUDENT_TRANSFERRED', { oldBed, newBed });

    return res.status(200).json({ success: true, data: { oldBed, newBed } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/admin/erp/vacate or /api/admin/vacate
 * Vacate an occupied bed
 */
router.put('/vacate', async (req, res) => {
  try {
    const { bedId } = req.body;
    const bed = await Bed.findById(bedId);
    if (!bed) {
      return res.status(404).json({ success: false, message: 'Bed not found' });
    }

    const vacatedStudentName = bed.studentName || 'Resident';
    bed.occupied = false;
    bed.reservationStatus = 'Available';
    bed.studentName = null;
    bed.email = null;
    bed.activityTimeline = [];
    await bed.save();

    emitSocketEvent(req, 'STUDENT_VACATED', { bedId, vacatedStudentName });

    return res.status(200).json({ success: true, data: bed });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/erp/booking-requests
 * Fetch all booking requests
 */
router.get('/booking-requests', async (req, res) => {
  try {
    const requests = await BookingRequest.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: requests });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/admin/erp/booking-requests/:id/approve
 * Approve a booking request
 */
router.put('/booking-requests/:id/approve', async (req, res) => {
  try {
    const request = await BookingRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    if (request.status !== 'Pending') {
      return res.status(400).json({ success: false, message: `Request already ${request.status}` });
    }

    const bed = await Bed.findOne({ roomNumber: request.preferredRoom, bedNumber: request.preferredBed });
    if (!bed) return res.status(404).json({ success: false, message: 'Bed not found' });

    request.status = 'Approved';
    await request.save();

    bed.occupied = true;
    bed.reservationStatus = 'Occupied';
    bed.studentName = request.name;
    bed.phone = request.phone;
    bed.whatsappNumber = request.whatsappNumber || request.phone;
    bed.email = request.email;
    bed.fatherName = request.fatherName;
    bed.currentAddress = request.currentAddress;
    bed.occupation = request.occupation;
    bed.companyName = request.collegeCompany;
    bed.collegeName = request.collegeCompany;
    bed.emergencyContact = request.emergencyContact;
    if (request.notes) {
      bed.notes = request.notes;
    }
    bed.aadhaarNumber = request.aadhaar;
    bed.admissionDate = new Date().toISOString().slice(0, 10);
    bed.joiningDate = new Date().toISOString().slice(0, 10);
    bed.duration = request.stayDuration || '11 Months';
    await bed.save();

    // Automatically record approved payment in Payment collection
    try {
      await Payment.create({
        studentName: request.name,
        roomNumber: request.preferredRoom,
        bedNumber: request.preferredBed,
        amount: request.roomRent || bed.rentPerBed || 5500,
        paymentType: 'Advance / Security Deposit',
        transactionId: request.utrNumber,
        utrNumber: request.utrNumber,
        paymentScreenshot: request.paymentScreenshot,
        status: 'Approved',
        verifiedAt: new Date()
      });
    } catch (payErr) {
      console.error('Error creating payment record during booking approval:', payErr);
    }

    emitSocketEvent(req, 'STUDENT_ADMITTED', { bedId: bed._id, studentName: request.name });

    return res.status(200).json({ success: true, message: 'Booking approved' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/admin/erp/booking-requests/:id/reject
 * Reject a booking request
 */
router.put('/booking-requests/:id/reject', async (req, res) => {
  try {
    const request = await BookingRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    if (request.status !== 'Pending') {
      return res.status(400).json({ success: false, message: `Request already ${request.status}` });
    }

    request.status = 'Rejected';
    await request.save();

    const bed = await Bed.findOne({ roomNumber: request.preferredRoom, bedNumber: request.preferredBed });
    if (bed && bed.reservationStatus === 'Reserved' && !bed.occupied) {
      bed.reservationStatus = 'Available';
      await bed.save();
      emitSocketEvent(req, 'BED_AVAILABLE', { bedId: bed._id });
    }

    return res.status(200).json({ success: true, message: 'Booking rejected' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/erp/mess-subscribers
 * Get all external mess subscribers
 */
router.get('/mess-subscribers', async (req, res) => {
  try {
    const subs = await MessSubscriber.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: subs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/admin/erp/mess-subscribers/:id/status
 * Update status (Approve, Reject, Activate, Inactive)
 */
router.put('/mess-subscribers/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const sub = await MessSubscriber.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!sub) return res.status(404).json({ success: false, message: 'Subscriber not found' });
    emitSocketEvent(req, 'MESS_STATUS_UPDATED', { subId: sub._id, status });
    return res.status(200).json({ success: true, data: sub });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/erp/payment-verifications
 * Fetch all pending payment verifications (both Bookings and Mess)
 */
router.get('/payment-verifications', async (req, res) => {
  try {
    const bookings = await BookingRequest.find({ paymentStatus: 'Pending Verification' }).lean();
    const messSubs = await MessSubscriber.find({ paymentStatus: 'Pending Verification' }).lean();
    const rentRenewals = await RentRenewal.find({ verificationStatus: 'Pending Verification' }).lean();

    const unified = [
      ...bookings.map(b => ({ ...b, applicationType: 'PG Booking' })),
      ...messSubs.map(m => ({ ...m, applicationType: 'Monthly Mess' })),
      ...rentRenewals.map(r => ({ 
        ...r, 
        applicationType: 'Rent Renewal',
        name: r.residentName,
        preferredRoom: r.roomNumber,
        preferredBed: r.bedNumber,
        plan: r.renewalDuration + ' Month(s)',
        applicationId: r.bookingId
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({ success: true, data: unified });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/admin/erp/payment-verifications/:type/:id/verify
 */
router.put('/payment-verifications/:type/:id/verify', async (req, res) => {
  try {
    const { type, id } = req.params;
    
    if (type === 'Booking') {
      const request = await BookingRequest.findById(id);
      if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
      
      request.paymentStatus = 'Verified';
      request.status = 'Approved';
      await request.save();

      const bed = await Bed.findOne({ roomNumber: request.preferredRoom, bedNumber: request.preferredBed });
      if (bed) {
        bed.occupied = true;
        bed.reservationStatus = 'Occupied';
        bed.studentName = request.name;
        bed.phone = request.phone;
        bed.email = request.email;
        bed.collegeName = request.collegeCompany;
        bed.emergencyContact = request.emergencyContact;
        bed.aadhaarNumber = request.aadhaar;
        bed.admissionDate = new Date().toISOString().slice(0, 10);
        bed.joiningDate = new Date().toISOString().slice(0, 10);
        await bed.save();

        // Create Payment Ledger entry for Initial PG Booking
        await Payment.create({
          studentName: request.name,
          roomNumber: bed.roomNumber,
          bedNumber: bed.bedNumber,
          totalAmount: bed.rentPerBed,
          paymentMethod: 'UPI',
          upiApp: 'Google Pay', // Defaulting as we don't capture the specific app yet
          utrNumber: request.utrNumber || 'N/A',
          verificationStatus: 'Verified',
          status: 'Successful',
          transactionId: 'TXN-B-' + Date.now(),
          monthYear: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
          paymentType: 'Initial PG Booking',
          receiptNumber: 'REC-B-' + Date.now()
        });

        emitSocketEvent(req, 'STUDENT_ADMITTED', { bedId: bed._id, studentName: request.name });
      }
    } else if (type === 'Mess') {
      const request = await MessSubscriber.findById(id);
      if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
      
      request.paymentStatus = 'Verified';
      request.status = 'Active';
      await request.save();
      emitSocketEvent(req, 'MESS_ACTIVATED', { id: request._id });
    }

    return res.status(200).json({ success: true, message: 'Payment verified successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/admin/erp/payment-verifications/:type/:id/reject
 */
router.put('/payment-verifications/:type/:id/reject', async (req, res) => {
  try {
    const { type, id } = req.params;
    const { reason } = req.body;
    
    if (type === 'Booking') {
      const request = await BookingRequest.findById(id);
      if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
      
      await BookingRequest.updateOne({ _id: id }, {
        $set: {
          paymentStatus: 'Rejected',
          verificationRemark: reason || 'Payment not found or invalid screenshot',
          status: 'Rejected'
        }
      });

      const bed = await Bed.findOne({ roomNumber: request.preferredRoom, bedNumber: request.preferredBed });
      if (bed && bed.reservationStatus === 'Reserved' && !bed.occupied) {
        await Bed.updateOne({ _id: bed._id }, { $set: { reservationStatus: 'Available' } });
      }
    } else if (type === 'Mess') {
      const request = await MessSubscriber.findById(id);
      if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
      
      await MessSubscriber.updateOne({ _id: id }, {
        $set: {
          paymentStatus: 'Rejected',
          verificationRemark: reason || 'Payment not found or invalid screenshot',
          status: 'Rejected'
        }
      });
    }

    return res.status(200).json({ success: true, message: 'Payment rejected' });
  } catch (err) {
    console.error('REJECT ERROR:', err);
    return res.status(500).json({ success: false, message: err.message, stack: err.stack });
  }
});
/**
 * GET /api/admin/erp/rent-renewals
 * Fetch all rent renewals
 */
router.get('/rent-renewals', async (req, res) => {
  try {
    const RentRenewal = require('../models/RentRenewal');
    const renewals = await RentRenewal.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: renewals });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/admin/erp/rent-renewals/:id/verify
 * Verify a rent renewal, extend bed nextDueDate, and record payment
 */
router.put('/rent-renewals/:id/verify', async (req, res) => {
  try {
    const RentRenewal = require('../models/RentRenewal');
    const Bed = require('../models/Bed');
    const Payment = require('../models/Payment');
    
    const renewal = await RentRenewal.findById(req.params.id);
    if (!renewal) {
      return res.status(404).json({ success: false, message: 'Renewal not found.' });
    }
    if (renewal.verificationStatus === 'Verified') {
      return res.status(400).json({ success: false, message: 'Renewal is already verified.' });
    }

    // 1. Update the bed
    const bed = await Bed.findById(renewal.residentBed);
    if (bed) {
      // Calculate new due date (extend by renewalDuration months)
      let currentDueDate = new Date(bed.nextDueDate || new Date());
      currentDueDate.setMonth(currentDueDate.getMonth() + renewal.renewalDuration);
      
      bed.nextDueDate = currentDueDate.toISOString();
      bed.paymentStatus = 'Paid';
      bed.lastPaymentDate = new Date().toISOString();
      await bed.save();
    }

    // 2. Create the payment ledger entry
    const newPayment = await Payment.create({
      bedId: renewal.residentBed,
      studentName: renewal.residentName,
      roomNumber: renewal.roomNumber,
      bedNumber: renewal.bedNumber,
      totalAmount: renewal.amount,
      paymentType: 'PG Rent Renewal', // The new specific type
      verificationStatus: 'Verified',
      status: 'Successful',
      utrNumber: renewal.utrNumber,
      transactionId: 'REN-' + Date.now(),
      monthYear: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      billingPeriod: `${new Date(renewal.previousPaidUntil).toLocaleString('en-US', { month: 'short', year: 'numeric' })} - ${new Date(renewal.proposedNewPaidUntil).toLocaleString('en-US', { month: 'short', year: 'numeric' })}`
    });

    // 3. Mark renewal as verified
    renewal.verificationStatus = 'Verified';
    renewal.status = 'Successful';
    await renewal.save();

    // Broadcast refresh
    emitSocketEvent(req, 'RENT_RENEWAL_VERIFIED', renewal);

    return res.status(200).json({ success: true, data: renewal });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/admin/erp/rent-renewals/:id/reject
 * Reject a rent renewal
 */
router.put('/rent-renewals/:id/reject', async (req, res) => {
  try {
    const RentRenewal = require('../models/RentRenewal');
    const { reason } = req.body;
    
    const renewal = await RentRenewal.findById(req.params.id);
    if (!renewal) {
      return res.status(404).json({ success: false, message: 'Renewal not found.' });
    }

    renewal.verificationStatus = 'Rejected';
    renewal.status = 'Failed';
    renewal.rejectionReason = reason;
    await renewal.save();

    emitSocketEvent(req, 'RENT_RENEWAL_REJECTED', renewal);

    return res.status(200).json({ success: true, data: renewal });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
