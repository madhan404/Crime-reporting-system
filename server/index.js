import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import caseRoutes from './routes/cases.js';
import complaintRoutes from './routes/complaints.js';
import userRoutes from './routes/users.js';
import staffRoutes from './routes/staff.js';
import investigationRoutes from './routes/investigations.js';
import evidenceRoutes from './routes/evidence.js';
import publicRoutes from './routes/public.js';
import notificationRoutes from './routes/notifications.js';
import analyticsRoutes from './routes/analytics.js';
import reportsRoutes from './routes/reports.js';
import { startSLAMonitoring } from './utils/slaMonitor.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// CORS configuration - must come before other middleware
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting - temporarily disabled for development
// const limiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
//   max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000 // limit each IP to 1000 requests per windowMs
// });
// app.use('/api/', limiter);

// Body parsing middleware
const maxFileSize = process.env.MAX_FILE_SIZE || '10mb';
app.use(express.json({ limit: maxFileSize }));
app.use(express.urlencoded({ extended: true }));

// Cookie parsing middleware
app.use(cookieParser());

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crime_reporting';
    
    if (!process.env.MONGODB_URI) {
      console.log('⚠️  No MONGODB_URI found in environment variables. Using default local MongoDB.');
      console.log('   To use MongoDB Atlas, set MONGODB_URI in your .env file');
    }
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('⚠️  Server will start without database connection. Some features may not work.');
    console.log('💡 To fix this:');
    console.log('   1. Set up MongoDB Atlas (free) at https://www.mongodb.com/atlas');
    console.log('   2. Add MONGODB_URI to your .env file');
    console.log('   3. Or install MongoDB locally');
    return false;
  }
};

// Routes
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/users', userRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/investigations', investigationRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const startServer = async () => {
  try {
    // Try to connect to database but don't fail if it doesn't work
    const dbConnected = await connectDB();
    
    app.listen(PORT, () => {
      console.log('\n🚀 Crime Reporting Server Started Successfully!');
      console.log('=' .repeat(50));
      console.log(`🌐 Server URL: http://localhost:${PORT}`);
      console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🔗 CORS Origins: ${corsOrigins.join(', ')}`);
      console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Database: ${dbConnected ? 'Connected ✅' : 'Not Connected ❌'}`);
      
      if (dbConnected) {
        console.log(`📅 SLA monitoring: Active`);
        startSLAMonitoring();
      } else {
        console.log(`⚠️  SLA monitoring: Disabled (no database)`);
      }
      
      console.log('=' .repeat(50));
      console.log('🎉 Ready to handle requests!\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;