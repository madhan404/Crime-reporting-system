import mongoose from 'mongoose';
import Complaint from '../models/Complaint.js';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crime_reporting';
    console.log('🔗 Connecting to MongoDB...');
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

const deleteTestCases = async () => {
  try {
    await connectDB();
    
    // Case IDs to delete
    const caseIdsToDelete = [
      'CASE-20250906-0001',  // Test Complaint
      'CASE-1757167928340-3', // Vandalism Report
      'CASE-1757167928296-2', // Suspicious Online Activity
      'CASE-1757167928253-1'  // Stolen Bicycle
    ];
    
    console.log('🗑️  Deleting test cases...');
    
    // Delete complaints by case ID
    const result = await Complaint.deleteMany({
      caseId: { $in: caseIdsToDelete }
    });
    
    console.log(`✅ Successfully deleted ${result.deletedCount} test cases`);
    
    // List remaining complaints
    const remainingComplaints = await Complaint.find({}, 'caseId title status').sort({ createdAt: -1 });
    console.log('\n📋 Remaining complaints:');
    remainingComplaints.forEach(complaint => {
      console.log(`  - ${complaint.caseId}: ${complaint.title} (${complaint.status})`);
    });
    
  } catch (error) {
    console.error('❌ Error deleting test cases:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

deleteTestCases();
