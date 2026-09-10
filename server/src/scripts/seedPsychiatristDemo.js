import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Card from '../models/Card.js';
import Response from '../models/Response.js';

dotenv.config();

async function seedPsychiatristDemo() {
  await connectDB();
  console.log('Connected to DB...');

  const psych = await User.findOne({ role: 'psychiatrist' });
  if (!psych) {
    console.log('No psychiatrist found!');
    process.exit(1);
  }

  console.log(`Found psychiatrist: ${psych.name} (${psych._id})`);

  // 1. Ensure Patient "Rahul Kumar" exists
  let rahul = await User.findOne({ email: 'rahul.kumar@example.com' });
  if (!rahul) {
    const pass = await User.hashPassword('User@123');
    rahul = await User.create({
      name: 'Rahul Kumar',
      email: 'rahul.kumar@example.com',
      passwordHash: pass,
      phone: '+91 9876543210',
      age: 28,
      bio: 'Software engineer experiencing mild work stress and sleep irregularity.',
      role: 'user',
      doctors: [psych._id],
    });
    console.log(`Created patient Rahul Kumar (${rahul._id})`);
  } else {
    if (!rahul.doctors) rahul.doctors = [];
    if (!rahul.doctors.some((d) => d.toString() === psych._id.toString())) {
      rahul.doctors.push(psych._id);
      await rahul.save();
    }
  }

  // 2. Also link Alex Chen to this psychiatrist
  const alex = await User.findOne({ email: 'lohithreddy18k@gmail.com' });
  if (alex) {
    if (!alex.doctors) alex.doctors = [];
    if (!alex.doctors.some((d) => d.toString() === psych._id.toString())) {
      alex.doctors.push(psych._id);
      if (!alex.phone) alex.phone = '+91 9123456780';
      if (!alex.age) alex.age = 25;
      await alex.save();
    }
  }

  // 3. Find or pick cards
  const cards = await Card.find({ status: 'active' }).limit(3);
  const card1 = cards[0] || { _id: new mongoose.Types.ObjectId(), name: 'Anxiety Assessment' };
  const card2 = cards[1] || card1;

  // 4. Create consultations for Rahul Kumar with Dr. Sarah Jenkins
  const existingRahulConsult = await Response.findOne({
    patientId: rahul._id,
    doctorId: psych._id,
  });

  if (!existingRahulConsult) {
    await Response.create({
      cardId: card1._id,
      cardName: card1.name || 'Anxiety Assessment',
      userId: rahul._id,
      userName: rahul.name,
      userEmail: rahul.email,
      patientId: rahul._id,
      patientName: rahul.name,
      doctorId: psych._id,
      doctorName: psych.name,
      rotationAngle: 0,
      rotationLabel: 'Front (0°)',
      questionId: 'q-anx-1',
      questionText: 'How have you been feeling recently?',
      answer: 'I have been feeling anxious and tired for the last few weeks.',
      evaluationType: 'manual',
      evaluation: 'Patient appears to be experiencing moderate anxiety symptoms. Further assessment and sleep hygiene intervention is recommended.',
      evaluatorId: psych._id,
      evaluatorName: psych.name,
      evaluatedAt: new Date(),
    });

    await Response.create({
      cardId: card2._id,
      cardName: card2.name || 'Stress Assessment',
      userId: rahul._id,
      userName: rahul.name,
      userEmail: rahul.email,
      patientId: rahul._id,
      patientName: rahul.name,
      doctorId: psych._id,
      doctorName: psych.name,
      rotationAngle: 90,
      rotationLabel: 'Right (90°)',
      questionId: 'q-stress-1',
      questionText: 'What situations have caused the highest stress peaks over the past 7 days?',
      answer: 'High workload deadlines and frequent interruptions during focused hours.',
      evaluationType: 'manual',
      evaluation: 'Recommends time-blocking strategies and boundary management for cognitive restoration.',
      evaluatorId: psych._id,
      evaluatorName: psych.name,
      evaluatedAt: new Date(),
    });
    console.log('Created 2 consultations for Rahul Kumar');
  }

  // 5. Create a consultation for Alex Chen with Dr. Sarah Jenkins
  if (alex) {
    const existingAlexConsult = await Response.findOne({
      patientId: alex._id,
      doctorId: psych._id,
    });
    if (!existingAlexConsult) {
      await Response.create({
        cardId: card1._id,
        cardName: card1.name || 'Deep Focus & Flow',
        userId: alex._id,
        userName: alex.name,
        userEmail: alex.email,
        patientId: alex._id,
        patientName: alex.name,
        doctorId: psych._id,
        doctorName: psych.name,
        rotationAngle: 0,
        rotationLabel: 'Front (0°)',
        questionId: 'q-focus-1',
        questionText: 'What is the single most high-leverage task requiring your undivided clarity today?',
        answer: 'Structuring deep work blocks without notification distractions.',
        evaluationType: 'manual',
        evaluation: 'Positive habit formation observed. Encourage maintaining 45-minute focus intervals.',
        evaluatorId: psych._id,
        evaluatorName: psych.name,
        evaluatedAt: new Date(),
      });
      console.log('Created 1 consultation for Alex Chen');
    }
  }

  console.log('Psychiatrist demo seed completed successfully!');
  await mongoose.disconnect();
  process.exit(0);
}

seedPsychiatristDemo().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
