import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { db, User, Resume, ResumeHistory, JobDescription, ResumeData, ResumeCustomization } from './src/server/db';
import { analyzeResumeATS, preprocessText } from './src/server/nlp';
import { extractTextFromPDF, extractTextFromDOCX, heuristicParseResume } from './src/server/parser';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(express.json({ limit: '25mb' })); // support larger base64 file uploads

// Initialize Gemini Client safely
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY') {
      try {
        aiClient = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
        console.log('Gemini API client initialized successfully.');
      } catch (err) {
        console.error('Failed to initialize Gemini Client:', err);
      }
    } else {
      console.warn('GEMINI_API_KEY is not set or is using the placeholder. AI-powered features will fall back to local rule-based heuristics.');
    }
  }
  return aiClient;
}

// Generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// Simple JWT / Auth Middleware helper (using in-memory mapping or simple user context headers)
const activeSessions: Record<string, string> = {}; // token -> userId

function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized. Authorization token required.' });
    return;
  }
  const token = authHeader.substring(7);
  const userId = activeSessions[token];
  if (!userId) {
    res.status(401).json({ error: 'Invalid or expired session token.' });
    return;
  }
  req.body._userId = userId;
  next();
}

// --- AUTHENTICATION ROUTES ---

app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required.' });
    return;
  }

  const existing = await db.getUserByEmail(email);
  if (existing) {
    res.status(400).json({ error: 'User with this email already exists.' });
    return;
  }

  const userId = 'usr-' + generateId();
  const newUser: User = {
    id: userId,
    name,
    email,
    passwordHash: password, // plain password for simplicity in dev template
    createdAt: new Date().toISOString()
  };

  await db.saveUser(newUser);

  // Auto-login after registration
  const token = 'tok-' + generateId();
  activeSessions[token] = userId;

  res.status(201).json({
    token,
    user: { id: userId, name, email }
  });
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const user = await db.getUserByEmail(email);
  if (!user || user.passwordHash !== password) {
    res.status(400).json({ error: 'Invalid email or password.' });
    return;
  }

  const token = 'tok-' + generateId();
  activeSessions[token] = user.id;

  res.status(200).json({
    token,
    user: { id: user.id, name: user.name, email: user.email }
  });
});

app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email address is required.' });
    return;
  }

  const user = await db.getUserByEmail(email);
  if (!user) {
    res.status(404).json({ error: 'No account registered with this email address.' });
    return;
  }

  // Generate a mock security code for developer environment
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

  res.status(200).json({
    success: true,
    message: `Security code generated successfully!`,
    resetCode, // we send the code to UI directly since there is no SMTP configured
    email: user.email
  });
});

app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    res.status(400).json({ error: 'Email and new password are required.' });
    return;
  }

  const user = await db.getUserByEmail(email);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  user.passwordHash = newPassword;
  await db.saveUser(user);

  res.status(200).json({
    success: true,
    message: 'Your password has been successfully reset! You can now log in.'
  });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    delete activeSessions[token];
  }
  res.status(200).json({ message: 'Logged out successfully.' });
});

// --- RESUME OPERATIONS ---

app.get('/api/resumes', authenticate, async (req: Request, res: Response) => {
  const userId = req.body._userId;
  const resumes = await db.getResumes(userId);
  
  const resumesWithScores = await Promise.all(resumes.map(async (resume) => {
    const history = await db.getHistory(resume.id);
    const latestAnalysis = history.find(h => h.analysis && h.analysis.atsScore !== undefined);
    
    let score = 0;
    let scoreType = 'completeness';
    
    if (latestAnalysis && latestAnalysis.analysis) {
      score = latestAnalysis.analysis.atsScore;
      scoreType = 'ats';
    } else {
      const data = resume.data;
      let tempScore = 0;
      if (data.personalInfo) {
        if (data.personalInfo.fullName) tempScore += 10;
        if (data.personalInfo.title) tempScore += 5;
        if (data.personalInfo.summary) tempScore += 10;
      }
      if (data.skills) {
        if (data.skills.technical && data.skills.technical.length > 0) tempScore += 15;
        if (data.skills.soft && data.skills.soft.length > 0) tempScore += 10;
      }
      if (data.experience && data.experience.length > 0) {
        tempScore += Math.min(25, data.experience.length * 10);
      }
      if (data.projects && data.projects.length > 0) {
        tempScore += Math.min(15, data.projects.length * 5);
      }
      if (data.education && data.education.length > 0) {
        tempScore += 10;
      }
      score = tempScore === 0 ? 35 : Math.min(100, tempScore);
    }
    
    return {
      ...resume,
      atsScore: score,
      scoreType
    };
  }));

  res.json(resumesWithScores);
});

app.get('/api/resumes/:id', authenticate, async (req: Request, res: Response) => {
  const resume = await db.getResumeById(req.params.id);
  if (!resume || resume.userId !== req.body._userId) {
    res.status(404).json({ error: 'Resume not found.' });
    return;
  }
  
  const history = await db.getHistory(resume.id);
  const latestAnalysis = history.find(h => h.analysis && h.analysis.atsScore !== undefined);
  
  let score = 0;
  let scoreType = 'completeness';
  
  if (latestAnalysis && latestAnalysis.analysis) {
    score = latestAnalysis.analysis.atsScore;
    scoreType = 'ats';
  } else {
    const data = resume.data;
    let tempScore = 0;
    if (data.personalInfo) {
      if (data.personalInfo.fullName) tempScore += 10;
      if (data.personalInfo.title) tempScore += 5;
      if (data.personalInfo.summary) tempScore += 10;
    }
    if (data.skills) {
      if (data.skills.technical && data.skills.technical.length > 0) tempScore += 15;
      if (data.skills.soft && data.skills.soft.length > 0) tempScore += 10;
    }
    if (data.experience && data.experience.length > 0) {
      tempScore += Math.min(25, data.experience.length * 10);
    }
    if (data.projects && data.projects.length > 0) {
      tempScore += Math.min(15, data.projects.length * 5);
    }
    if (data.education && data.education.length > 0) {
      tempScore += 10;
    }
    score = tempScore === 0 ? 35 : Math.min(100, tempScore);
  }
  
  res.json({
    ...resume,
    atsScore: score,
    scoreType
  });
});

app.post('/api/resumes', authenticate, async (req: Request, res: Response) => {
  const userId = req.body._userId;
  const { title, templateId, customization, data } = req.body;

  const defaultCustomization: ResumeCustomization = {
    fontFamily: 'sans',
    fontSize: 'base',
    colorTheme: '#1e293b', // slate-800
    margins: 'normal',
    lineSpacing: 'normal',
    showIcons: true,
    sectionOrder: ['personalInfo', 'experience', 'projects', 'education', 'skills', 'certifications', 'languages']
  };

  const resumeId = 'res-' + generateId();
  const newResume: Resume = {
    id: resumeId,
    userId,
    title: title || 'Untitled Resume',
    templateId: templateId || 'template-classic',
    customization: customization || defaultCustomization,
    data: data || {
      personalInfo: { fullName: 'Your Name', email: 'your.email@example.com', phone: '', location: '', website: '', github: '', linkedin: '', summary: '', title: '' },
      education: [],
      experience: [],
      projects: [],
      skills: { technical: [], soft: [] },
      certifications: [],
      languages: [],
      interests: []
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await db.saveResume(newResume);
  res.status(201).json(newResume);
});

app.put('/api/resumes/:id', authenticate, async (req: Request, res: Response) => {
  const { title, templateId, customization, data } = req.body;
  const resume = await db.getResumeById(req.params.id);

  if (!resume || resume.userId !== req.body._userId) {
    res.status(404).json({ error: 'Resume not found.' });
    return;
  }

  // Save the old version in history before updating
  const historyEntry: ResumeHistory = {
    id: 'his-' + generateId(),
    resumeId: resume.id,
    userId: resume.userId,
    timestamp: new Date().toISOString(),
    title: resume.title,
    templateId: resume.templateId,
    data: resume.data
  };
  await db.saveHistory(historyEntry);

  // Update resume
  if (title !== undefined) resume.title = title;
  if (templateId !== undefined) resume.templateId = templateId;
  if (customization !== undefined) resume.customization = customization;
  if (data !== undefined) resume.data = data;
  resume.updatedAt = new Date().toISOString();

  await db.saveResume(resume);
  res.json(resume);
});

app.delete('/api/resumes/:id', authenticate, async (req: Request, res: Response) => {
  const resume = await db.getResumeById(req.params.id);
  if (!resume || resume.userId !== req.body._userId) {
    res.status(404).json({ error: 'Resume not found.' });
    return;
  }
  await db.deleteResume(req.params.id);
  res.json({ success: true, message: 'Resume and history deleted.' });
});

// --- RESUME VERSION HISTORY ---

app.get('/api/resumes/:id/history', authenticate, async (req: Request, res: Response) => {
  const resume = await db.getResumeById(req.params.id);
  if (!resume || resume.userId !== req.body._userId) {
    res.status(404).json({ error: 'Resume not found.' });
    return;
  }
  const history = await db.getHistory(req.params.id);
  res.json(history);
});

app.post('/api/resumes/:id/restore', authenticate, async (req: Request, res: Response) => {
  const { historyId } = req.body;
  const resume = await db.getResumeById(req.params.id);

  if (!resume || resume.userId !== req.body._userId) {
    res.status(404).json({ error: 'Resume not found.' });
    return;
  }

  const history = await db.getHistory(resume.id);
  const selectedVersion = history.find(h => h.id === historyId);

  if (!selectedVersion) {
    res.status(404).json({ error: 'History version not found.' });
    return;
  }

  // Swap current data with history
  resume.data = selectedVersion.data;
  resume.title = selectedVersion.title;
  resume.templateId = selectedVersion.templateId;
  resume.updatedAt = new Date().toISOString();

  await db.saveResume(resume);
  res.json(resume);
});

// --- FILE PARSING & ATS ANALYSIS ---

app.post('/api/resumes/parse', (req: Request, res: Response) => {
  const { fileData, fileName, fileType } = req.body;

  if (!fileData || !fileName) {
    res.status(400).json({ error: 'File data (Base64) and file name are required.' });
    return;
  }

  try {
    const buffer = Buffer.from(fileData, 'base64');
    let extractedText = '';

    if (fileName.toLowerCase().endsWith('.pdf')) {
      extractTextFromPDF(buffer).then(text => {
        handleExtractedText(text);
      }).catch(err => {
        res.status(500).json({ error: err.message });
      });
    } else if (fileName.toLowerCase().endsWith('.docx')) {
      extractTextFromDOCX(buffer).then(text => {
        handleExtractedText(text);
      }).catch(err => {
        res.status(500).json({ error: err.message });
      });
    } else {
      res.status(400).json({ error: 'Unsupported file format. Please upload a PDF or DOCX file.' });
    }

    async function handleExtractedText(text: string) {
      if (!text || text.trim().length === 0) {
        res.status(400).json({ error: 'No readable text could be extracted from this document.' });
        return;
      }

      // 1. Get a standard heuristic parse
      const parsedData = heuristicParseResume(text);

      // 2. If Gemini is available, we can enhance the parsing!
      const ai = getGeminiClient();
      if (ai) {
        try {
          console.log('Sending extracted text to Gemini for structured parsing...');
          const systemPrompt = `You are an expert ATS resume extractor. Analyze the following raw text extracted from a candidate resume and convert it into a valid JSON object matching this schema:
{
  "personalInfo": {
    "fullName": "Name",
    "email": "Email",
    "phone": "Phone number",
    "location": "City, State or Country",
    "website": "Personal portfolio url if present",
    "github": "Github link if present",
    "linkedin": "Linkedin link if present",
    "summary": "Short 2-3 sentence professional summary",
    "title": "Professional title (e.g., Senior Software Engineer)"
  },
  "education": [
    {
      "id": "edu-unique-1",
      "institution": "University/College name",
      "degree": "Degree earned (e.g. BS)",
      "fieldOfStudy": "Field (e.g. Computer Science)",
      "startDate": "YYYY-MM format",
      "endDate": "YYYY-MM format or Present",
      "grade": "GPA or Grade if listed",
      "description": "Any honors or relevant coursework"
    }
  ],
  "experience": [
    {
      "id": "exp-unique-1",
      "company": "Company Name",
      "position": "Job Title/Position",
      "location": "City, State",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM or Present",
      "current": true/false (if current job),
      "description": "2-3 professional accomplishment bullet points"
    }
  ],
  "projects": [
    {
      "id": "proj-unique-1",
      "title": "Project Name",
      "role": "Role in project",
      "technologies": "Comma-separated list of technologies used",
      "link": "Project url",
      "description": "Short details of the project"
    }
  ],
  "skills": {
    "technical": ["SKILL1", "SKILL2"],
    "soft": ["Skill1", "Skill2"]
  },
  "certifications": [
    {
      "id": "cert-unique-1",
      "name": "Certification Name",
      "issuer": "Issuer Organization",
      "date": "YYYY-MM"
    }
  ],
  "languages": [
    {
      "id": "lang-unique-1",
      "name": "Language",
      "proficiency": "Proficiency Level"
    }
  ],
  "interests": ["Interest 1", "Interest 2"]
}

Raw Text to parse:
${text.substring(0, 8000)}

Ensure your entire output is valid JSON and nothing else. No markdown wrappers.`;

          const aiResponse = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: systemPrompt,
          });

          const cleanedJSONText = (aiResponse.text || '')
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();

          const aiParsed = JSON.parse(cleanedJSONText);
          res.json({
            rawText: text,
            parsedData: aiParsed
          });
          return;
        } catch (err) {
          console.error('Gemini parsing failed, falling back to heuristic parser:', err);
        }
      }

      // Heuristic fallback
      res.json({
        rawText: text,
        parsedData
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Server parsing error: ' + error.message });
  }
});

// --- ML-BASED ATS MATCH & ANALYSIS ---

app.post('/api/resumes/:id/analyze', authenticate, async (req: Request, res: Response) => {
  const { jobDescription } = req.body;
  if (!jobDescription) {
    res.status(400).json({ error: 'Job description text is required for comparison.' });
    return;
  }

  const resume = await db.getResumeById(req.params.id);
  if (!resume || resume.userId !== req.body._userId) {
    res.status(404).json({ error: 'Resume not found.' });
    return;
  }

  // Flatten resume content to raw text for TF-IDF Vectorizer
  const resumeTextParts = [
    resume.data.personalInfo.fullName,
    resume.data.personalInfo.title,
    resume.data.personalInfo.summary,
    resume.data.skills.technical.join(' '),
    resume.data.skills.soft.join(' '),
    resume.data.experience.map(e => `${e.position} ${e.company} ${e.description}`).join(' '),
    resume.data.projects.map(p => `${p.title} ${p.role} ${p.technologies} ${p.description}`).join(' '),
    resume.data.education.map(e => `${e.degree} in ${e.fieldOfStudy} at ${e.institution}`).join(' '),
    resume.data.certifications.map(c => c.name).join(' ')
  ];
  const flattenedResumeText = resumeTextParts.join('\n');

  // Perform local NLP-ML analysis (TF-IDF vectorizer, cosine similarity, Naive Bayes class prediction)
  const mlAnalysis = analyzeResumeATS(flattenedResumeText, jobDescription);

  // Save the job comparison record
  const jobEntry: JobDescription = {
    id: 'job-' + generateId(),
    userId: resume.userId,
    title: 'Analyzed Target Role',
    company: 'Target Company',
    descriptionText: jobDescription,
    createdAt: new Date().toISOString()
  };
  await db.saveJob(jobEntry);

  // Save history with ML statistics
  const historyEntry: ResumeHistory = {
    id: 'his-' + generateId(),
    resumeId: resume.id,
    userId: resume.userId,
    timestamp: new Date().toISOString(),
    title: resume.title,
    templateId: resume.templateId,
    data: resume.data,
    analysis: mlAnalysis
  };
  await db.saveHistory(historyEntry);

  res.json({
    analysis: mlAnalysis,
    historyId: historyEntry.id
  });
});

// --- AI SUGGESTIONS (GEMINI ROUTE) ---

app.post('/api/resumes/:id/suggest', authenticate, async (req: Request, res: Response) => {
  const { jobDescription } = req.body; // optional
  const resume = await db.getResumeById(req.params.id);

  if (!resume || resume.userId !== req.body._userId) {
    res.status(404).json({ error: 'Resume not found.' });
    return;
  }

  // Calculate current score to pass to the advisor engine
  let currentScore = 65;
  if (jobDescription) {
    const resumeTextParts = [
      resume.data.personalInfo.fullName,
      resume.data.personalInfo.title,
      resume.data.personalInfo.summary,
      resume.data.skills.technical.join(' '),
      resume.data.skills.soft.join(' '),
      resume.data.experience.map(e => `${e.position} ${e.company} ${e.description}`).join(' '),
      resume.data.projects.map(p => `${p.title} ${p.role} ${p.technologies} ${p.description}`).join(' '),
      resume.data.education.map(e => `${e.degree} in ${e.fieldOfStudy} at ${e.institution}`).join(' '),
      resume.data.certifications.map(c => c.name).join(' ')
    ];
    const flattenedResumeText = resumeTextParts.join('\n');
    const localAnalysis = analyzeResumeATS(flattenedResumeText, jobDescription);
    currentScore = localAnalysis.atsScore;
  } else {
    const data = resume.data;
    let tempScore = 0;
    if (data.personalInfo) {
      if (data.personalInfo.fullName) tempScore += 10;
      if (data.personalInfo.title) tempScore += 5;
      if (data.personalInfo.summary) tempScore += 10;
    }
    if (data.skills) {
      if (data.skills.technical && data.skills.technical.length > 0) tempScore += 15;
      if (data.skills.soft && data.skills.soft.length > 0) tempScore += 10;
    }
    if (data.experience && data.experience.length > 0) {
      tempScore += Math.min(25, data.experience.length * 10);
    }
    if (data.projects && data.projects.length > 0) {
      tempScore += Math.min(15, data.projects.length * 5);
    }
    if (data.education && data.education.length > 0) {
      tempScore += 10;
    }
    currentScore = tempScore === 0 ? 35 : Math.min(100, tempScore);
  }

  const ai = getGeminiClient();

  // If Gemini client is not initialized, generate robust smart static rules recommendations
  if (!ai) {
    const data = resume.data;
    const fallbackSuggestions: any[] = [];
    const top5: string[] = [];

    // Check 1: Missing phone or email
    if (!data.personalInfo?.phone || !data.personalInfo?.email) {
      fallbackSuggestions.push({
        priority: 'High',
        issueFound: 'Incomplete contact details',
        whyAffects: 'ATS parsers use contact information to verify applicant identity and matching details.',
        howToFix: 'Add your professional phone number and personal email to the header.',
        exampleImproved: `${data.personalInfo?.fullName || 'Your Name'} | ${data.personalInfo?.email || 'email@example.com'} | ${data.personalInfo?.phone || '(123) 456-7890'}`
      });
      top5.push('Fill in your complete contact details (phone, email).');
    }

    // Check 2: Missing social links
    if (!data.personalInfo?.linkedin && !data.personalInfo?.github) {
      fallbackSuggestions.push({
        priority: 'Medium',
        issueFound: 'Missing professional networking links',
        whyAffects: 'Recruiters and modern ATS platforms look for GitHub or LinkedIn links to verify portfolio claims.',
        howToFix: 'Include clean URLs to your LinkedIn and GitHub profiles in the header.',
        exampleImproved: `LinkedIn: linkedin.com/in/username | GitHub: github.com/username`
      });
      top5.push('Add your LinkedIn profile link to the header.');
    }

    // Check 3: Summary length
    if (!data.personalInfo?.summary || data.personalInfo.summary.length < 50) {
      fallbackSuggestions.push({
        priority: 'High',
        issueFound: 'Brief or missing professional summary',
        whyAffects: 'ATS scans the summary section to find primary keywords and match your core technical level.',
        howToFix: 'Write a strong 3-sentence professional summary highlighting your core skills, years of experience, and value.',
        exampleImproved: `Results-driven developer with proven experience in full-stack architecture, optimizing databases, and deploying robust user interfaces.`
      });
      top5.push('Write a highly focused 3-sentence professional summary.');
    }

    // Check 4: Missing skills
    const techSkillsCount = data.skills?.technical?.length || 0;
    if (techSkillsCount < 5) {
      fallbackSuggestions.push({
        priority: 'High',
        issueFound: 'Low technical keyword density',
        whyAffects: 'ATS matching scores are heavily weighted on matching exact technical terms listed in the skills section.',
        howToFix: 'Expand your Technical Skills list with all languages, frameworks, databases, and tools you have used.',
        exampleImproved: `Technical Skills: HTML5, CSS3, JavaScript, TypeScript, React, Node.js, Git, SQL`
      });
      top5.push('Add at least 5 key technical skills to your Skills list.');
    }

    // Check 5: Soft skills
    const softSkillsCount = data.skills?.soft?.length || 0;
    if (softSkillsCount === 0) {
      fallbackSuggestions.push({
        priority: 'Medium',
        issueFound: 'Missing interpersonal/soft skills list',
        whyAffects: 'Modern ATS filters scan for core behavioral values such as Collaboration, Communication, and Agile methodologies.',
        howToFix: 'Include a brief list of soft skills to demonstrate cross-functional leadership and adaptive communication.',
        exampleImproved: `Soft Skills: Collaborative Problem Solving, Agile Scrum, Written & Verbal Communication`
      });
      top5.push('Include 3 key soft skills (e.g. Collaboration, Problem Solving).');
    }

    // Check 6: Experience metrics
    let hasMetricsInExperience = false;
    if (data.experience && data.experience.length > 0) {
      data.experience.forEach(exp => {
        if (/\d+%|\d+\s+percent|[\$M]/i.test(exp.description || '')) {
          hasMetricsInExperience = true;
        }
      });
    }
    if (!hasMetricsInExperience && data.experience && data.experience.length > 0) {
      fallbackSuggestions.push({
        priority: 'Medium',
        issueFound: 'Non-quantified impact in work accomplishments',
        whyAffects: 'Recruiters and ATS platforms look for quantified metrics (e.g., percentages, dollar values, times saved) to gauge candidate capability.',
        howToFix: 'Add numeric results to your bullet points showing the direct outcome of your efforts.',
        exampleImproved: `Optimized application runtime speed, increasing database performance by 25% and saving 10+ developer hours weekly.`
      });
      top5.push('Quantify at least two bullet points with metrics (%, $, numbers).');
    }

    // Check 7: Projects section empty
    if (!data.projects || data.projects.length === 0) {
      fallbackSuggestions.push({
        priority: 'Medium',
        issueFound: 'Missing hands-on project items',
        whyAffects: 'Including projects with active technology keywords provides additional keyword validation for the ATS.',
        howToFix: 'Create a dedicated projects section with 2-3 prominent portfolio apps, detailing technologies and links.',
        exampleImproved: `Project: Cloud Portfolio Analyzer | Technologies: React, Express, MongoDB | Built fully synced dashboard with real-time analytics.`
      });
      top5.push('Add a high-quality portfolio project with listed technologies.');
    }

    // Check 8: Certifications empty
    if (!data.certifications || data.certifications.length === 0) {
      fallbackSuggestions.push({
        priority: 'Low',
        issueFound: 'No industry certifications highlighted',
        whyAffects: 'Certifications provide extra verification of your expertise in specific standard enterprise tools (like AWS, GCP, Salesforce, Agile).',
        howToFix: 'List standard certifications or relevant courses you have completed to bolster technical credibility.',
        exampleImproved: `AWS Certified Cloud Practitioner (Amazon Web Services, 2026)`
      });
      top5.push('Add any relevant technical courses or certifications.');
    }

    // Fill top 5 up to 5 items if not already filled
    const defaultTop5 = [
      'Use strong action verbs like "Architected", "Optimized", "Spearheaded".',
      'Align your skills list with the target job posting keywords.',
      'Quantify your impact on work history with numeric achievements.',
      'Ensure clear, simple formatting without complex tables or images.',
      'Write a compelling, professional executive summary.'
    ];
    while (top5.length < 5) {
      const nextDefault = defaultTop5.find(d => !top5.includes(d));
      if (nextDefault) top5.push(nextDefault);
      else break;
    }

    if (fallbackSuggestions.length === 0) {
      fallbackSuggestions.push({
        priority: 'Low',
        issueFound: 'None detected! Solid baseline resume structural health.',
        whyAffects: 'Your current format satisfies all standard parsing guidelines perfectly.',
        howToFix: 'Continue focusing on incorporating advanced cloud certificates or publishing open-source projects.',
        exampleImproved: `Advanced Goal: Contribute to React or Docker open-source modules to highlight deep engineering competency.`
      });
    }

    const estimatedScore = Math.min(100, currentScore + 15);
    const potentialIncrease = estimatedScore - currentScore;

    res.json({
      suggestions: fallbackSuggestions,
      top5Improvements: top5.slice(0, 5),
      scoreImpact: {
        currentScore,
        estimatedScore,
        potentialIncrease
      },
      positiveFeedback: 'Your resume follows standard professional guidelines. To make it even stronger, focus on adding advanced enterprise cloud architecture projects, or write high-performance performance tuning articles.'
    });
    return;
  }

  try {
    console.log('Requesting professional resume enhancements from Gemini...');
    const resumeString = JSON.stringify(resume.data, null, 2);
    
    const systemPrompt = `You are a professional executive resume writer and career coach. Review the candidate's resume and optionally the target Job Description to provide personalized, concise, practical, and recruiter-friendly ATS improvement suggestions.

Rules:
1. NEVER invent or hallucinate new skills, experience, projects, or certifications that are not present in the candidate's resume. Only provide suggestions based strictly on the uploaded resume data.
2. If no issues are found (the resume is already extremely strong and perfectly matches), praise what the user did well and suggest advanced, real-world, expert optimizations.
3. Keep all suggestions practical, concise, and focused on recruiter and ATS preferences.
4. Calculate a realistic "estimatedScore" (between ${currentScore} and 100) that the candidate can achieve after applying the suggestions. Set "potentialIncrease" to (estimatedScore - ${currentScore}).

Ensure your entire output is a single valid JSON object matching this schema:
{
  "suggestions": [
    {
      "priority": "High" | "Medium" | "Low",
      "issueFound": "Specific issue in the resume",
      "whyAffects": "Explain how and why this specific issue negatively affects the ATS parse or score",
      "howToFix": "Step-by-step practical advice to fix it",
      "exampleImproved": "Provide a concrete improved version of the text, bullet point, or section using ONLY existing info from the resume"
    }
  ],
  "top5Improvements": [
    "Top quick fix 1",
    "Top quick fix 2",
    "Top quick fix 3",
    "Top quick fix 4",
    "Top quick fix 5"
  ],
  "scoreImpact": {
    "currentScore": ${currentScore},
    "estimatedScore": estimatedScore,
    "potentialIncrease": potentialIncrease
  },
  "positiveFeedback": "Detailed feedback on what the candidate did exceptionally well and what advanced improvements can be made"
}

Resume Data:
${resumeString}

${jobDescription ? `Target Job Description:\n${jobDescription}` : ''}

Ensure your entire output is valid JSON and nothing else. No markdown wrappers, no backticks.`;

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: systemPrompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const cleanText = (aiResponse.text || '{}')
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const parsedResponse = JSON.parse(cleanText);
    res.json(parsedResponse);
  } catch (err: any) {
    console.error('Gemini optimization failed:', err);
    res.status(500).json({ error: 'Failed to query AI advisor: ' + err.message });
  }
});

// --- SYS ADMIN & SYSTEM STATISTICS ---

app.get('/api/stats', authenticate, async (req: Request, res: Response) => {
  const stats = await db.getSystemStats();
  res.json(stats);
});

// --- CLIENT-SIDE FALLBACK / PRODUCTION STATIC SERVER ---

// Serve React client static assets in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve('dist');
  app.use(express.static(distPath));
  
  // SPA deep link support
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // If we are in dev, Vite handles the static pages directly.
  app.get('/', (req: Request, res: Response) => {
    res.send('AI Resume Analyzer Express API running on port 3001.');
  });
}

// Start Server
const PORT = process.env.NODE_ENV === 'production' ? 3000 : 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Express application running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
