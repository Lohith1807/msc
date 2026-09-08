import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dns from 'dns';
import User from '../models/User.js';
import Card from '../models/Card.js';
import Response from '../models/Response.js';
import Log from '../models/Log.js';
import { seedDatabase } from '../config/seed.js';

dotenv.config();

// Configure Google Public DNS for MongoDB Atlas SRV query resolution on Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.warn('DNS server setting failed:', e.message);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://mindlabmailer_db_user:LOHITHREDDY18@mindspace.m2f8cwc.mongodb.net/original?appName=mindspace';

async function runMigration() {
  console.log('🚀 Starting MindLab database migration to MongoDB Atlas...');
  console.log(`Connecting to: ${MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);

  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log(`✅ Connected to MongoDB Atlas! Database: ${mongoose.connection.name}`);

    // If there were any old placeholder users (e.g. admin@mindlab.com, dr.sarah@mindlab.com, alex.chen@example.com), update or remove them
    const oldAdmin = await User.findOne({ email: 'admin@mindlab.com' });
    if (oldAdmin) {
      console.log('🔄 Migrating old admin to lohithreddy1819@gmail.com...');
      oldAdmin.email = 'lohithreddy1819@gmail.com';
      await oldAdmin.save();
    }

    const oldPsych = await User.findOne({ email: 'dr.sarah@mindlab.com' });
    if (oldPsych) {
      console.log('🔄 Migrating old psychiatrist to lohithreddy18april@gmail.com...');
      oldPsych.email = 'lohithreddy18april@gmail.com';
      await oldPsych.save();
    }

    const oldAlex = await User.findOne({ email: 'alex.chen@example.com' });
    if (oldAlex) {
      console.log('🔄 Migrating old user to lohithreddy18k@gmail.com...');
      oldAlex.email = 'lohithreddy18k@gmail.com';
      await oldAlex.save();
    }

    // Run the full database seeder
    await seedDatabase();

    // Verify all collections and document counts
    const usersCount = await User.countDocuments();
    const cardsCount = await Card.countDocuments();
    const responsesCount = await Response.countDocuments();
    const logsCount = await Log.countDocuments();

    console.log('\n📊 Migration & Verification Summary:');
    console.log(`- Database Name: ${mongoose.connection.name}`);
    console.log(`- Total Users: ${usersCount}`);
    const usersList = await User.find({}, 'name email role');
    usersList.forEach(u => console.log(`   • ${u.name} (${u.email}) [${u.role}]`));
    console.log(`- Total Cards: ${cardsCount}`);
    const cardsList = await Card.find({}, 'name status order questions');
    cardsList.forEach(c => console.log(`   • ${c.name} (${c.status}) [${c.questions.length} questions]`));
    console.log(`- Total Responses: ${responsesCount}`);
    console.log(`- Total Logs: ${logsCount}`);

    console.log('\n🎉 All MindLab data successfully migrated to MongoDB Atlas (db: original)!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
