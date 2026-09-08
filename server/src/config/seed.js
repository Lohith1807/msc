import User from '../models/User.js';
import Card from '../models/Card.js';
import Response from '../models/Response.js';
import Log from '../models/Log.js';

export const seedDatabase = async () => {
  try {
    const userCount = await User.countDocuments();
    const cardCount = await Card.countDocuments();

    // If database already contains data, serve directly from DB without mutating
    if (userCount > 0 && cardCount > 0) {
      console.log(`📦 MongoDB Atlas database "${User.db.name}" is populated (${userCount} users, ${cardCount} cards). Serving live database data.`);
      return;
    }

    // 1. Seed Users if count is 0
    if (userCount === 0) {
      console.log('🌱 Seeding initial users...');
      const adminPass = await User.hashPassword('HELLO123');
      const psychPass = await User.hashPassword('Psych@123');
      const userPass = await User.hashPassword('User@123');

      adminUser = await User.create({
        name: 'MindLab Administrator',
        email: 'lohithreddy1819@gmail.com',
        passwordHash: adminPass,
        role: 'admin',
      });

      const psychUser = await User.create({
        name: 'Dr. Sarah Jenkins',
        email: 'lohithreddy18april@gmail.com',
        passwordHash: psychPass,
        role: 'psychiatrist',
      });

      const user1 = await User.create({
        name: 'Alex Chen',
        email: 'lohithreddy18k@gmail.com',
        passwordHash: userPass,
        role: 'user',
      });

      console.log('✅ Default users seeded (lohithreddy1819@gmail.com, lohithreddy18april@gmail.com, lohithreddy18k@gmail.com)');
    }

    // 2. Seed Cards if count is 0

    // Ensure all existing cards have appropriate imageUrl if missing
    await Card.updateMany({ name: 'Deep Focus & Flow', $or: [{ imageUrl: '' }, { imageUrl: null }, { imageUrl: { $exists: false } }] }, { $set: { imageUrl: '/cards/focus.svg' } });
    await Card.updateMany({ name: 'Emotional Resilience', $or: [{ imageUrl: '' }, { imageUrl: null }, { imageUrl: { $exists: false } }] }, { $set: { imageUrl: '/cards/resilience.svg' } });
    await Card.updateMany({ name: 'Somatic Grounding & Calming', $or: [{ imageUrl: '' }, { imageUrl: null }, { imageUrl: { $exists: false } }] }, { $set: { imageUrl: '/cards/mindfulness.svg' } });
    await Card.updateMany({ name: 'Circadian Sleep Architecture', $or: [{ imageUrl: '' }, { imageUrl: null }, { imageUrl: { $exists: false } }] }, { $set: { imageUrl: '/cards/sleep.svg' } });
    await Card.updateMany({ name: 'Cognitive Reframing', $or: [{ imageUrl: '' }, { imageUrl: null }, { imageUrl: { $exists: false } }] }, { $set: { imageUrl: '/cards/reframing.svg' } });
    await Card.updateMany({ name: 'Vulnerability & Social Bonds', $or: [{ imageUrl: '' }, { imageUrl: null }, { imageUrl: { $exists: false } }] }, { $set: { imageUrl: '/cards/connection.svg' } });

    if (cardCount === 0) {
      console.log('🌱 Seeding Mind Lab interactive cards with rotation questions...');

      const cardsData = [
        {
          name: 'Deep Focus & Flow',
          category: 'Cognitive',
          levelBadge: 'LVL 18 · 35/40',
          icon: '⚡',
          imageUrl: '/cards/focus.svg',
          gradient: 'linear-gradient(145deg, #132b3c 0%, #174256 50%, #1f687a 100%)',
          description: 'Eliminate cognitive noise and tap into sustained deep work states.',
          status: 'active',
          order: 0,
          questions: [
            {
              rotation: 0,
              rotationLabel: 'Front (0°)',
              prompt: 'What is the single most high-leverage task requiring your undivided clarity today?',
              questionType: 'text_journal',
              options: [],
              order: 0,
            },
            {
              rotation: 90,
              rotationLabel: 'Right (90°)',
              prompt: 'What digital distraction has been siphoning your cognitive bandwidth lately?',
              questionType: 'multiple_choice',
              options: [
                'Endless Social Media Scrolling',
                'Unchecked Email / Slack Notifications',
                'Task Switching & Multitasking',
                'Background Noise & Clutter',
              ],
              order: 1,
            },
            {
              rotation: 180,
              rotationLabel: 'Back / Inverted (180°)',
              prompt: 'How many deep work 90-minute blocks can you realistically protect tomorrow?',
              questionType: 'scale_1_10',
              options: [],
              order: 2,
            },
            {
              rotation: 270,
              rotationLabel: 'Left (270°)',
              prompt: 'Which mental state best describes your focus right now?',
              questionType: 'multiple_choice',
              options: [
                'Laser Sharp & Dialed In',
                'Easily Distracted / Restless',
                'Mental Fatigue / Foggy',
                'Creative Flow & Spontaneous',
              ],
              order: 3,
            },
          ],
        },
        {
          name: 'Emotional Resilience',
          category: 'Resilience',
          levelBadge: 'LVL 26 · 50/50',
          icon: '🛡️',
          imageUrl: '/cards/resilience.svg',
          gradient: 'linear-gradient(135deg, #1c3a52 0%, #2a9fb0 100%)',
          description: 'Strengthen emotional stamina, self-regulation, and grounded response habits.',
          status: 'active',
          order: 1,
          questions: [
            {
              rotation: 0,
              rotationLabel: 'Front (0°)',
              prompt: 'What emotional trigger tested your patience today, and how did you ground yourself?',
              questionType: 'text_journal',
              options: [],
              order: 0,
            },
            {
              rotation: 90,
              rotationLabel: 'Right (90°)',
              prompt: 'Rate your emotional stamina over the past 48 hours on a scale of 1 to 10.',
              questionType: 'scale_1_10',
              options: [],
              order: 1,
            },
            {
              rotation: 180,
              rotationLabel: 'Back / Inverted (180°)',
              prompt: 'If your inner critic had a voice right now, what story is it telling that is not objectively true?',
              questionType: 'text_journal',
              options: [],
              order: 2,
            },
            {
              rotation: 270,
              rotationLabel: 'Left (270°)',
              prompt: 'Which coping ritual brings you back to your emotional center fastest?',
              questionType: 'multiple_choice',
              options: [
                'Box Breathing (4-4-4-4)',
                'Physiological Sigh (Double Inhale)',
                'Grounding 5-4-3-2-1 Sensory Scan',
                'Cold Water Face Splash',
              ],
              order: 3,
            },
          ],
        },
        {
          name: 'Somatic Grounding & Calming',
          category: 'Mindfulness',
          levelBadge: 'LVL 32 · 60/60',
          icon: '🌿',
          imageUrl: '/cards/mindfulness.svg',
          gradient: 'linear-gradient(135deg, #2a9fb0 0%, #6fc3d1 100%)',
          description: 'Tune into physical bodily sensations to dissolve autonomic nervous tension.',
          status: 'active',
          order: 2,
          questions: [
            {
              rotation: 0,
              rotationLabel: 'Front (0°)',
              prompt: 'Scan your body from head to toe. Where are you holding subtle physical tension right now?',
              questionType: 'multiple_choice',
              options: [
                'Jaw, Teeth Clenching & Neck',
                'Tight Shoulders & Upper Back',
                'Shallow Chest / Gut Knotting',
                'Restless Legs / Lower Body',
              ],
              order: 0,
            },
            {
              rotation: 90,
              rotationLabel: 'Right (90°)',
              prompt: 'Take a deep breath: 4s inhale, 8s slow exhale. How calm do you feel now (1-10)?',
              questionType: 'scale_1_10',
              options: [],
              order: 1,
            },
            {
              rotation: 180,
              rotationLabel: 'Back / Inverted (180°)',
              prompt: 'Describe 3 specific sensory details in your immediate physical environment right now.',
              questionType: 'text_journal',
              options: [],
              order: 2,
            },
            {
              rotation: 270,
              rotationLabel: 'Left (270°)',
              prompt: 'Choose a somatic grounding exercise to practice before sleep tonight:',
              questionType: 'multiple_choice',
              options: [
                'Progressive Muscle Relaxation',
                '15-Minute Barefoot Nature Walk',
                'Gentle Neck & Spinal Decompression',
                'Silent Tea Sensory Meditation',
              ],
              order: 3,
            },
          ],
        },
        {
          name: 'Circadian Sleep Architecture',
          category: 'Sleep',
          levelBadge: 'LVL 14 · 28/30',
          icon: '🌙',
          imageUrl: '/cards/sleep.svg',
          gradient: 'linear-gradient(135deg, #1a2a3a 0%, #3a506b 100%)',
          description: 'Optimize natural sleep hygiene, restorative REM cycles, and morning alertness.',
          status: 'active',
          order: 3,
          questions: [
            {
              rotation: 0,
              rotationLabel: 'Front (0°)',
              prompt: 'How many hours of uninterrupted sleep did you get last night, and did you wake rested?',
              questionType: 'text_journal',
              options: [],
              order: 0,
            },
            {
              rotation: 90,
              rotationLabel: 'Right (90°)',
              prompt: 'Rate your overall morning vitality today on a scale of 1 to 10.',
              questionType: 'scale_1_10',
              options: [],
              order: 1,
            },
            {
              rotation: 180,
              rotationLabel: 'Back / Inverted (180°)',
              prompt: 'What bedtime habit would most improve your morning mental sharpness?',
              questionType: 'text_journal',
              options: [],
              order: 2,
            },
            {
              rotation: 270,
              rotationLabel: 'Left (270°)',
              prompt: 'Which sleep disruptor affects your evening routine most frequently?',
              questionType: 'multiple_choice',
              options: [
                'Late Blue Light & Screen Exposure',
                'Afternoon Caffeine & Stimulants',
                'Racing Bedtime Thoughts & To-Dos',
                'Inconsistent Bedtime Schedule',
              ],
              order: 3,
            },
          ],
        },
        {
          name: 'Cognitive Reframing',
          category: 'Cognitive',
          levelBadge: 'LVL 21 · 42/45',
          icon: '💡',
          imageUrl: '/cards/reframing.svg',
          gradient: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
          description: 'Identify automatic cognitive distortions and reconstruct healthier narratives.',
          status: 'active',
          order: 4,
          questions: [
            {
              rotation: 0,
              rotationLabel: 'Front (0°)',
              prompt: 'Identify an anxious thought from today. How can you reframe it from an objective, compassionate lens?',
              questionType: 'text_journal',
              options: [],
              order: 0,
            },
            {
              rotation: 90,
              rotationLabel: 'Right (90°)',
              prompt: 'Rate how likely your catastrophic worst-case scenario is in reality (1 = Impossible, 10 = Certain):',
              questionType: 'scale_1_10',
              options: [],
              order: 1,
            },
            {
              rotation: 180,
              rotationLabel: 'Back / Inverted (180°)',
              prompt: 'What concrete evidence directly disproves this limiting belief?',
              questionType: 'text_journal',
              options: [],
              order: 2,
            },
            {
              rotation: 270,
              rotationLabel: 'Left (270°)',
              prompt: 'What advice would you give your best friend if they were carrying this exact worry?',
              questionType: 'text_journal',
              options: [],
              order: 3,
            },
          ],
        },
        {
          name: 'Vulnerability & Social Bonds',
          category: 'Connection',
          levelBadge: 'LVL 15 · 30/30',
          icon: '🤝',
          imageUrl: '/cards/connection.svg',
          gradient: 'linear-gradient(135deg, #234e52 0%, #319795 100%)',
          description: 'Nurture authentic interpersonal connections and psychological safety.',
          status: 'active',
          order: 5,
          questions: [
            {
              rotation: 0,
              rotationLabel: 'Front (0°)',
              prompt: 'Who is one person in your life you feel completely safe being vulnerable with?',
              questionType: 'text_journal',
              options: [],
              order: 0,
            },
            {
              rotation: 90,
              rotationLabel: 'Right (90°)',
              prompt: 'Have you expressed genuine gratitude to someone this week? Who comes to mind?',
              questionType: 'text_journal',
              options: [],
              order: 1,
            },
            {
              rotation: 180,
              rotationLabel: 'Back / Inverted (180°)',
              prompt: 'What boundary do you need to gently reinforce to protect your mental well-being?',
              questionType: 'text_journal',
              options: [],
              order: 2,
            },
            {
              rotation: 270,
              rotationLabel: 'Left (270°)',
              prompt: 'Select your preferred way to recharge social energy when feeling depleted:',
              questionType: 'multiple_choice',
              options: [
                '1-on-1 Intimate Coffee Conversation',
                'Solitary Time Reading & Walking',
                'Shared Group Activity / Sports',
                'Creative Expression & Journaling',
              ],
              order: 3,
            },
          ],
        },
      ];

      const createdCards = await Card.insertMany(cardsData);
      console.log(`✅ Seeded ${createdCards.length} interactive cards with rotation questions.`);
    }

    // 3. Seed initial responses if empty
    const responseCount = await Response.countDocuments();
    if (responseCount === 0) {
      const allCards = await Card.find().sort({ order: 1 });
      const seededUsers = await User.find({ email: 'lohithreddy18k@gmail.com' });
      if (seededUsers.length > 0 && allCards.length >= 3) {
        console.log('🌱 Seeding sample user responses...');
        await Response.create([
          {
            cardId: allCards[0]._id,
            cardName: allCards[0].name,
            userId: seededUsers[0]._id,
            userName: seededUsers[0].name,
            userEmail: seededUsers[0].email,
            rotationAngle: 0,
            rotationLabel: 'Front (0°)',
            questionText: allCards[0].questions[0]?.prompt || 'Deep Focus reflection',
            answer: 'A delayed project deadline tested me, but I stepped away for 5 minutes and took slow belly breaths.',
          },
          {
            cardId: allCards[0]._id,
            cardName: allCards[0].name,
            userId: seededUsers[0]._id,
            userName: seededUsers[0].name,
            userEmail: seededUsers[0].email,
            rotationAngle: 270,
            rotationLabel: 'Left (270°)',
            questionText: allCards[0].questions[3]?.prompt || 'Focus mental state',
            answer: 'Laser Sharp & Dialed In',
          },
          {
            cardId: allCards[1]._id,
            cardName: allCards[1].name,
            userId: seededUsers.length > 1 ? seededUsers[1]._id : seededUsers[0]._id,
            userName: seededUsers.length > 1 ? seededUsers[1].name : seededUsers[0].name,
            userEmail: seededUsers.length > 1 ? seededUsers[1].email : seededUsers[0].email,
            rotationAngle: 0,
            rotationLabel: 'Front (0°)',
            questionText: allCards[1].questions[0]?.prompt || 'Emotional trigger reflection',
            answer: 'Completing the research brief before opening incoming chat messages.',
          },
          {
            cardId: allCards[2]._id,
            cardName: allCards[2].name,
            userId: seededUsers.length > 1 ? seededUsers[1]._id : seededUsers[0]._id,
            userName: seededUsers.length > 1 ? seededUsers[1].name : seededUsers[0].name,
            userEmail: seededUsers.length > 1 ? seededUsers[1].email : seededUsers[0].email,
            rotationAngle: 90,
            rotationLabel: 'Right (90°)',
            questionText: allCards[2].questions[1]?.prompt || 'Calm score',
            answer: 'Score: 8 / 10',
          },
        ]);
        console.log('✅ Seeded 4 sample user responses.');
      }
    }

    // Always ensure Deep Focus & Flow is the primary first card (order 0)
    await Card.updateOne({ name: 'Deep Focus & Flow' }, { order: 0 });
    await Card.updateOne({ name: 'Emotional Resilience' }, { order: 1 });

    // 4. Seed initial audit logs if empty
    const logCount = await Log.countDocuments();
    if (logCount === 0) {
      console.log('🌱 Seeding initial activity logs...');
      await Log.create([
        {
          action: 'SYSTEM_STARTUP',
          category: 'System',
          details: 'MindLab Fullstack Platform initialized successfully with rotation questions engine.',
          userName: 'System Daemon',
          userRole: 'admin',
          severity: 'info',
        },
        {
          action: 'CARDS_SEEDED',
          category: 'Cards',
          details: 'Initial set of 6 psycho-education and wellness cards loaded into active rotation.',
          userName: 'System Seeder',
          userRole: 'admin',
          severity: 'success',
        },
        {
          action: 'USER_LOGIN',
          category: 'Auth',
          details: 'Administrator session authenticated.',
          userName: 'MindLab Administrator',
          userRole: 'admin',
          severity: 'info',
        },
      ]);
      console.log('✅ Seeded initial activity logs.');
    }
  } catch (error) {
    console.error('⚠️ Seeding database encountered an error:', error.message);
  }
};
