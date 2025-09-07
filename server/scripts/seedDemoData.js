import mongoose from 'mongoose';
import User from '../models/User.js';
import Complaint from '../models/Complaint.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crime-reporting';

const demoUsers = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    mobile: '+1234567890',
    status: 'active'
  },
  {
    name: 'Staff Member',
    email: 'staff@example.com',
    password: 'staff123',
    role: 'staff',
    department: 'Investigation',
    mobile: '+1234567891',
    status: 'active'
  },
  {
    name: 'John Citizen',
    email: 'user@example.com',
    password: 'user123',
    role: 'user',
    mobile: '+1234567892',
    status: 'active'
  }
];

const demoComplaints = [
  {
    title: 'Stolen Bicycle',
    description: 'My bicycle was stolen from the parking lot near the mall.',
    crimeType: 'Theft/Robbery',
    priority: 'Medium',
    status: 'Filed',
    location: {
      address: '123 Main Street, City Center',
      latitude: 40.7128,
      longitude: -74.0060
    },
    userId: null, // Will be set after user creation
    evidenceFiles: []
  },
  {
    title: 'Suspicious Online Activity',
    description: 'Received suspicious emails asking for personal information.',
    crimeType: 'Cybercrime',
    priority: 'High',
    status: 'Assigned',
    location: {
      address: '456 Oak Avenue, Downtown',
      latitude: 40.7589,
      longitude: -73.9851
    },
    userId: null, // Will be set after user creation
    evidenceFiles: []
  },
  {
    title: 'Vandalism Report',
    description: 'Graffiti found on the community center wall.',
    crimeType: 'Property Crime',
    priority: 'Low',
    status: 'Under Investigation',
    location: {
      address: '789 Pine Street, Suburb',
      latitude: 40.7505,
      longitude: -73.9934
    },
    userId: null, // Will be set after user creation
    evidenceFiles: []
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Complaint.deleteMany({});
    console.log('🧹 Cleared existing data');

    // Create demo users
    const createdUsers = [];
    for (const userData of demoUsers) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      console.log(`👤 Created user: ${user.name} (${user.email})`);
    }

    // Create demo complaints
    const citizenUser = createdUsers.find(u => u.role === 'user');
    for (const complaintData of demoComplaints) {
      const complaint = new Complaint({
        ...complaintData,
        userId: citizenUser._id
      });
      await complaint.save();
      console.log(`📋 Created complaint: ${complaint.title}`);
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📝 Demo Credentials:');
    console.log('Admin: admin@example.com / admin123');
    console.log('Staff: staff@example.com / staff123');
    console.log('User: user@example.com / user123');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

seedDatabase();
