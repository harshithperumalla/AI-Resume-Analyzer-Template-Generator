import fs from 'fs';
import path from 'path';
import { MongoClient, Db } from 'mongodb';

const DB_PATH = path.resolve('db.json');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://harshithdb_user:harshith123@cluster0.4itp6tk.mongodb.net/resume_analyzer?retryWrites=true&w=majority&appName=Cluster0';

let useLocalFallbackOnly = false;
let client: MongoClient | null = null;
let mongoDb: Db | null = null;
let isConnecting = false;

// Initialize connection immediately in background with graceful error handling
getConnectedDB().catch(err => {
  useLocalFallbackOnly = true;
  console.log('MongoDB connection was unsuccessful. Standard local file storage is active as a fallback. App remains fully functional!');
});

async function migrateLocalData(dbConn: Db) {
  try {
    const usersCount = await dbConn.collection('users').countDocuments();
    if (usersCount > 0) {
      return; // Already has data, skip migration
    }
    
    const localData = readDB();
    if (localData.users.length === 0 && localData.resumes.length === 0 && localData.history.length === 0 && localData.jobs.length === 0) {
      return; // Local DB is empty, nothing to migrate
    }
    
    console.log('Migrating local JSON database to MongoDB...');
    
    if (localData.users.length > 0) {
      await dbConn.collection('users').insertMany(localData.users);
    }
    if (localData.resumes.length > 0) {
      await dbConn.collection('resumes').insertMany(localData.resumes);
    }
    if (localData.history.length > 0) {
      await dbConn.collection('history').insertMany(localData.history);
    }
    if (localData.jobs.length > 0) {
      await dbConn.collection('jobs').insertMany(localData.jobs);
    }
    
    console.log('Migration of local data to MongoDB completed successfully!');
  } catch (err) {
    console.error('Migration to MongoDB failed:', err);
  }
}

export async function getConnectedDB(): Promise<Db | null> {
  if (useLocalFallbackOnly) return null;
  if (mongoDb) return mongoDb;
  if (isConnecting) return null;
  try {
    isConnecting = true;
    console.log('Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    await client.connect();
    mongoDb = client.db('ai_resume_analyzer');
    console.log('Successfully connected to MongoDB Cluster.');
    await migrateLocalData(mongoDb);
    isConnecting = false;
    return mongoDb;
  } catch (error) {
    isConnecting = false;
    useLocalFallbackOnly = true;
    const errMsg = String(error).toLowerCase();
    if (errMsg.includes('alert number 80') || errMsg.includes('tlsv1 alert internal error') || errMsg.includes('ssl routines') || errMsg.includes('ssl3_read_bytes')) {
      console.warn('\n====================================================================================');
      console.warn('⚠️  MONGODB CONNECTION ATTEMPTS BLOCKED BY ATLAS SECURITY (SSL ALERT 80)');
      console.warn('Reason: MongoDB Atlas rejected the connection during TLS handshake.');
      console.warn('Fix Required: The application runs in a dynamic cloud container, meaning its IP changes constantly.');
      console.warn('To resolve this, you must configure MongoDB Atlas to accept connections from any IP:');
      console.warn('  1. Go to your MongoDB Atlas Console.');
      console.warn('  2. Click on "Network Access" under the Security section in the left sidebar.');
      console.warn('  3. Click "Add IP Address".');
      console.warn('  4. Select "Allow Access from Anywhere" (adds 0.0.0.0/0) and click Confirm.');
      console.warn('  5. Standard local file storage is active as a fallback. App remains fully functional!');
      console.warn('====================================================================================\n');
    } else if (errMsg.includes('bad auth') || errMsg.includes('auth failed') || errMsg.includes('authentication failed')) {
      console.warn('\n====================================================================================');
      console.warn('⚠️  MONGODB AUTHENTICATION FAILED (BAD AUTH)');
      console.warn('Reason: The username or password specified in the MONGODB_URI is incorrect.');
      console.warn('Fix Required: Please verify your MongoDB connection string credentials:');
      console.warn('  1. Open your env settings or `.env` file.');
      console.warn('  2. Make sure the password in `mongodb+srv://<username>:<password>@...` has been entered correctly.');
      console.warn('  3. Special characters in passwords must be URL-encoded (e.g. "@" as "%40").');
      console.warn('  4. Standard local file storage is active as a fallback. App remains fully functional!');
      console.warn('====================================================================================\n');
    } else {
      console.warn('\n====================================================================================');
      console.warn('⚠️  MONGODB CONNECTION FAILED');
      console.warn('Error detail:', error);
      console.warn('Status: Standard local file storage is active as a fallback. App remains fully functional!');
      console.warn('====================================================================================\n');
    }
    return null;
  }
}

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  profilePicture?: string;
  createdAt: string;
}

export interface ResumeData {
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    website: string;
    github: string;
    linkedin: string;
    summary: string;
    title: string;
  };
  education: Array<{
    id: string;
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startDate: string;
    endDate: string;
    grade?: string;
    description?: string;
  }>;
  experience: Array<{
    id: string;
    company: string;
    position: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
  }>;
  projects: Array<{
    id: string;
    title: string;
    role: string;
    technologies: string; // comma-separated
    link?: string;
    description: string;
  }>;
  skills: {
    technical: string[]; // array of strings
    soft: string[];
  };
  certifications: Array<{
    id: string;
    name: string;
    issuer: string;
    date: string;
    link?: string;
  }>;
  languages: Array<{
    id: string;
    name: string;
    proficiency: string; // Native, Fluent, Professional, etc.
  }>;
  interests: string[];
}

export interface ResumeCustomization {
  fontFamily: string;
  fontSize: 'sm' | 'base' | 'lg';
  colorTheme: string; // hex code or tailwind color name
  margins: 'compact' | 'normal' | 'wide';
  lineSpacing: 'compact' | 'normal' | 'loose';
  showIcons: boolean;
  sectionOrder: string[];
}

export interface Resume {
  id: string;
  userId: string;
  title: string;
  templateId: string;
  customization: ResumeCustomization;
  data: ResumeData;
  createdAt: string;
  updatedAt: string;
}

export interface MLAnalysis {
  matchScore: number;
  atsScore: number;
  category: string;
  experienceLevel: string;
  matchingSkills: string[];
  missingSkills: string[];
  recommendedSkills: string[];
  keywordMatchPercentage: number;
  suggestions: string[];
  pros?: string[];
  cons?: string[];
  scoringBreakdown: {
    skills: number;
    experience: number;
    projects: number;
    education: number;
    certifications: number;
    ats: number;
    format: number;
  };
}

export interface ResumeHistory {
  id: string;
  resumeId: string;
  userId: string;
  timestamp: string;
  title: string;
  templateId: string;
  data: ResumeData;
  analysis?: MLAnalysis;
}

export interface JobDescription {
  id: string;
  userId: string;
  title: string;
  company: string;
  descriptionText: string;
  createdAt: string;
}

interface DatabaseSchema {
  users: User[];
  resumes: Resume[];
  history: ResumeHistory[];
  jobs: JobDescription[];
}

const DEFAULT_DB: DatabaseSchema = {
  users: [],
  resumes: [],
  history: [],
  jobs: []
};

function readDB(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
      return DEFAULT_DB;
    }
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error reading DB, using default schema:', error);
    return DEFAULT_DB;
  }
}

function writeDB(data: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing DB:', error);
  }
}

export const db = {
  getUsers: async (): Promise<User[]> => {
    try {
      const conn = await getConnectedDB();
      if (conn) {
        return await conn.collection<User>('users').find({}).toArray();
      }
    } catch (e) {
      console.error('Mongo error in getUsers, falling back to JSON:', e);
    }
    return readDB().users;
  },
  saveUser: async (user: User): Promise<void> => {
    try {
      const conn = await getConnectedDB();
      if (conn) {
        await conn.collection<User>('users').updateOne(
          { id: user.id },
          { $set: user },
          { upsert: true }
        );
        return;
      }
    } catch (e) {
      console.error('Mongo error in saveUser, falling back to JSON:', e);
    }
    
    const database = readDB();
    database.users.push(user);
    writeDB(database);
  },
  getUserByEmail: async (email: string): Promise<User | undefined> => {
    try {
      const conn = await getConnectedDB();
      if (conn) {
        const user = await conn.collection<User>('users').findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
        return user || undefined;
      }
    } catch (e) {
      console.error('Mongo error in getUserByEmail, falling back to JSON:', e);
    }
    return readDB().users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },
  getUserById: async (id: string): Promise<User | undefined> => {
    try {
      const conn = await getConnectedDB();
      if (conn) {
        const user = await conn.collection<User>('users').findOne({ id });
        return user || undefined;
      }
    } catch (e) {
      console.error('Mongo error in getUserById, falling back to JSON:', e);
    }
    return readDB().users.find(u => u.id === id);
  },
  getResumes: async (userId: string): Promise<Resume[]> => {
    try {
      const conn = await getConnectedDB();
      if (conn) {
        return await conn.collection<Resume>('resumes').find({ userId }).toArray();
      }
    } catch (e) {
      console.error('Mongo error in getResumes, falling back to JSON:', e);
    }
    return readDB().resumes.filter(r => r.userId === userId);
  },
  getResumeById: async (id: string): Promise<Resume | undefined> => {
    try {
      const conn = await getConnectedDB();
      if (conn) {
        const resume = await conn.collection<Resume>('resumes').findOne({ id });
        return resume || undefined;
      }
    } catch (e) {
      console.error('Mongo error in getResumeById, falling back to JSON:', e);
    }
    return readDB().resumes.find(r => r.id === id);
  },
  saveResume: async (resume: Resume): Promise<void> => {
    try {
      const conn = await getConnectedDB();
      if (conn) {
        await conn.collection<Resume>('resumes').updateOne(
          { id: resume.id },
          { $set: resume },
          { upsert: true }
        );
        return;
      }
    } catch (e) {
      console.error('Mongo error in saveResume, falling back to JSON:', e);
    }
    
    const database = readDB();
    const index = database.resumes.findIndex(r => r.id === resume.id);
    if (index >= 0) {
      database.resumes[index] = resume;
    } else {
      database.resumes.push(resume);
    }
    writeDB(database);
  },
  deleteResume: async (id: string): Promise<void> => {
    try {
      const conn = await getConnectedDB();
      if (conn) {
        await conn.collection('resumes').deleteOne({ id });
        await conn.collection('history').deleteMany({ resumeId: id });
        return;
      }
    } catch (e) {
      console.error('Mongo error in deleteResume, falling back to JSON:', e);
    }
    
    const database = readDB();
    database.resumes = database.resumes.filter(r => r.id !== id);
    database.history = database.history.filter(h => h.resumeId !== id);
    writeDB(database);
  },
  getHistory: async (resumeId: string): Promise<ResumeHistory[]> => {
    try {
      const conn = await getConnectedDB();
      if (conn) {
        return await conn.collection<ResumeHistory>('history')
          .find({ resumeId })
          .sort({ timestamp: -1 })
          .toArray();
      }
    } catch (e) {
      console.error('Mongo error in getHistory, falling back to JSON:', e);
    }
    return readDB().history.filter(h => h.resumeId === resumeId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },
  saveHistory: async (historyEntry: ResumeHistory): Promise<void> => {
    try {
      const conn = await getConnectedDB();
      if (conn) {
        await conn.collection<ResumeHistory>('history').updateOne(
          { id: historyEntry.id },
          { $set: historyEntry },
          { upsert: true }
        );
        return;
      }
    } catch (e) {
      console.error('Mongo error in saveHistory, falling back to JSON:', e);
    }
    
    const database = readDB();
    database.history.push(historyEntry);
    writeDB(database);
  },
  getJobs: async (userId: string): Promise<JobDescription[]> => {
    try {
      const conn = await getConnectedDB();
      if (conn) {
        return await conn.collection<JobDescription>('jobs').find({ userId }).toArray();
      }
    } catch (e) {
      console.error('Mongo error in getJobs, falling back to JSON:', e);
    }
    return readDB().jobs.filter(j => j.userId === userId);
  },
  saveJob: async (job: JobDescription): Promise<void> => {
    try {
      const conn = await getConnectedDB();
      if (conn) {
        await conn.collection<JobDescription>('jobs').updateOne(
          { id: job.id },
          { $set: job },
          { upsert: true }
        );
        return;
      }
    } catch (e) {
      console.error('Mongo error in saveJob, falling back to JSON:', e);
    }
    
    const database = readDB();
    database.jobs.push(job);
    writeDB(database);
  },
  getSystemStats: async () => {
    try {
      const conn = await getConnectedDB();
      if (conn) {
        const totalUsers = await conn.collection('users').countDocuments();
        const totalResumes = await conn.collection('resumes').countDocuments();
        const totalHistory = await conn.collection('history').countDocuments();
        const totalJobs = await conn.collection('jobs').countDocuments();
        
        const historyList = await conn.collection<ResumeHistory>('history').find({}).toArray();
        const categories: Record<string, number> = {};
        let sumAtsScore = 0;
        let atsCount = 0;

        historyList.forEach(h => {
          if (h.analysis) {
            categories[h.analysis.category] = (categories[h.analysis.category] || 0) + 1;
            sumAtsScore += h.analysis.atsScore;
            atsCount++;
          }
        });

        return {
          totalUsers,
          totalResumes,
          totalHistory,
          totalJobs,
          categories,
          averageAtsScore: atsCount > 0 ? Math.round(sumAtsScore / atsCount) : 75
        };
      }
    } catch (e) {
      console.error('Mongo error in getSystemStats, falling back to JSON:', e);
    }
    
    const database = readDB();
    const totalUsers = database.users.length;
    const totalResumes = database.resumes.length;
    const totalHistory = database.history.length;
    const totalJobs = database.jobs.length;

    const categories: Record<string, number> = {};
    let sumAtsScore = 0;
    let atsCount = 0;

    database.history.forEach(h => {
      if (h.analysis) {
        categories[h.analysis.category] = (categories[h.analysis.category] || 0) + 1;
        sumAtsScore += h.analysis.atsScore;
        atsCount++;
      }
    });

    return {
      totalUsers,
      totalResumes,
      totalHistory,
      totalJobs,
      categories,
      averageAtsScore: atsCount > 0 ? Math.round(sumAtsScore / atsCount) : 75
    };
  }
};
