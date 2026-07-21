require('dotenv').config();
const mongoose = require('mongoose');
const Room = require('../models/Room');
const Bed = require('../models/Bed');

const floorLayouts = [
  { floorName: 'Ground Floor', rooms: [{ id: 'S01', beds: 6 }, { id: 'S02', beds: 6 }] },
  {
    floorName: '1st Floor',
    rooms: [
      { id: 'S11', beds: 4 }, { id: 'S12', beds: 4 }, { id: 'S13', beds: 4 }, { id: 'S14', beds: 4 },
      { id: 'S15', beds: 5 }, { id: 'S16', beds: 5 }, { id: 'S17', beds: 5 }, { id: 'S18', beds: 5 }
    ]
  },
  {
    floorName: '2nd Floor',
    rooms: [
      { id: 'S21', beds: 4 }, { id: 'S22', beds: 4 }, { id: 'S23', beds: 4 }, { id: 'S24', beds: 4 },
      { id: 'S25', beds: 5 }, { id: 'S26', beds: 5 }, { id: 'S27', beds: 5 }, { id: 'S28', beds: 5 }
    ]
  },
  {
    floorName: '3rd Floor',
    rooms: [
      { id: 'S31', beds: 4 }, { id: 'S32', beds: 4 }, { id: 'S33', beds: 5 }, { id: 'S34', beds: 5 }
    ]
  }
];

const seedClean102Beds = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`Connected to database: ${mongoose.connection.name}`);

    // Fetch existing occupied / reserved beds to preserve student data
    const existingBeds = await Bed.find();
    console.log(`Current total beds in DB before clean up: ${existingBeds.length}`);

    // Map existing occupied or reserved beds by roomNumber_bedNumber
    const activeStudentBeds = {};
    existingBeds.forEach(b => {
      if (b.occupied || b.reservationStatus === 'Occupied' || b.reservationStatus === 'Reserved') {
        const key = `${b.roomNumber}_${b.bedNumber}`;
        activeStudentBeds[key] = b;
      }
    });

    // Wipe all beds completely to get a 100% clean baseline
    await Bed.deleteMany({});
    console.log('Cleared existing beds collection.');

    const newBedsToInsert = [];

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
          const key = `${roomNum}_${c}`;
          const existingActive = activeStudentBeds[key];

          if (existingActive) {
            newBedsToInsert.push({
              roomNumber: roomNum,
              bedNumber: c,
              floorName: floor.floorName,
              occupied: existingActive.occupied || false,
              reservationStatus: existingActive.reservationStatus || 'Occupied',
              maintenanceStatus: existingActive.maintenanceStatus || 'Functional',
              rentPerBed: existingActive.rentPerBed || exactRent,
              studentName: existingActive.studentName || '',
              phone: existingActive.phone || '',
              whatsappNumber: existingActive.whatsappNumber || '',
              email: existingActive.email || '',
              fatherName: existingActive.fatherName || '',
              currentAddress: existingActive.currentAddress || '',
              occupation: existingActive.occupation || '',
              companyName: existingActive.companyName || '',
              collegeName: existingActive.collegeName || '',
              emergencyContact: existingActive.emergencyContact || '',
              aadhaarNumber: existingActive.aadhaarNumber || '',
              admissionDate: existingActive.admissionDate || '',
              joiningDate: existingActive.joiningDate || '',
              duration: existingActive.duration || ''
            });
          } else {
            newBedsToInsert.push({
              roomNumber: roomNum,
              bedNumber: c,
              floorName: floor.floorName,
              occupied: false,
              reservationStatus: 'Available',
              maintenanceStatus: 'Functional',
              rentPerBed: exactRent
            });
          }
        }
      }
    }

    await Bed.insertMany(newBedsToInsert);
    const finalCount = await Bed.countDocuments();
    console.log(`Database cleanup complete! Total beds in database: ${finalCount}`);

    process.exit(0);
  } catch (err) {
    console.error('Error seeding clean 102 beds:', err);
    process.exit(1);
  }
};

seedClean102Beds();
