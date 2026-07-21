const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://s3elite:siva123@ac-ydwytth-shard-00-00.ldgdibt.mongodb.net:27017,ac-ydwytth-shard-00-01.ldgdibt.mongodb.net:27017,ac-ydwytth-shard-00-02.ldgdibt.mongodb.net:27017/smart_hostel_db?ssl=true&replicaSet=atlas-nxxd63-shard-0&authSource=admin&appName=Cluster0';
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`MongoDB Atlas Connection Error: ${error.message}`);
    try {
      console.log('Attempting fallback to local MongoDB instance...');
      const fallbackConn = await mongoose.connect('mongodb://127.0.0.1:27017/s3elite_pg_db', {
        serverSelectionTimeoutMS: 3000
      });
      console.log(`MongoDB Connected (Fallback): ${fallbackConn.connection.host}`);
    } catch (fallbackErr) {
      console.log('Ensure MongoDB is running locally or check Network Access whitelist (0.0.0.0/0) in MongoDB Atlas.');
    }
  }
};

module.exports = connectDB;
