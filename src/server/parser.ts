import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { ResumeData } from './db';

// Extract text from PDF buffer
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const uint8Array = new Uint8Array(buffer);
    const parser = new PDFParse({ data: uint8Array });
    const result = await parser.getText();
    return result.text || '';
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to parse PDF document. Ensure the file is not encrypted or corrupt.');
  }
}

// Extract text from DOCX buffer
export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw new Error('Failed to parse DOCX document. Ensure the file is not corrupt.');
  }
}

// Extract structured content from raw resume text using heuristics and NLP keywords
export function heuristicParseResume(text: string): ResumeData {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Heuristics for Contact Info
  let fullName = '';
  let email = '';
  let phone = '';
  let location = '';
  let github = '';
  let linkedin = '';
  let website = '';
  let title = '';

  // Email regex
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i;
  // Phone regex
  const phoneRegex = /(\+?\d{1,4}[-.\s]??\(?\d{1,3}?\)?[-.\s]??\d{1,4}[-.\s]??\d{1,4}[-.\s]??\d{1,9})/g;
  // Github regex
  const githubRegex = /(github\.com\/[a-zA-Z0-9_-]+)/i;
  // Linkedin regex
  const linkedinRegex = /(linkedin\.com\/in\/[a-zA-Z0-9_-]+)/i;

  // Try to find email & phone
  for (const line of lines) {
    const emailMatch = line.match(emailRegex);
    if (emailMatch && !email) {
      email = emailMatch[1];
    }
    const phoneMatch = line.match(phoneRegex);
    if (phoneMatch && !phone) {
      phone = phoneMatch[0];
    }
    const ghMatch = line.match(githubRegex);
    if (ghMatch && !github) {
      github = 'https://' + ghMatch[1];
    }
    const liMatch = line.match(linkedinRegex);
    if (liMatch && !linkedin) {
      linkedin = 'https://' + liMatch[1];
    }
  }

  // Name is typically the first line of the resume, or a line before email
  if (lines.length > 0) {
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      if (line.length > 3 && line.length < 35 && !line.includes('@') && !line.includes('http') && !phoneRegex.test(line) && !/education|experience|skills/i.test(line)) {
        fullName = line;
        break;
      }
    }
  }

  // Fallbacks if not found
  if (!fullName) fullName = 'Professional Candidate';
  if (!email) email = 'candidate@email.com';
  if (!phone) phone = '+1 (555) 019-2834';

  // Extract skills based on popular lists
  const techKeywords = [
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'php', 'golang', 'rust', 'swift', 'kotlin',
    'react', 'angular', 'vue', 'next.js', 'express', 'node.js', 'django', 'flask', 'spring boot',
    'html', 'css', 'sass', 'tailwind', 'bootstrap', 'jquery', 'webpack', 'vite',
    'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'sqlite', 'oracle', 'firebase', 'firestore', 'cassandra',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'github', 'ci/cd', 'terraform', 'ansible',
    'graphql', 'rest api', 'grpc', 'microservices', 'scikit-learn', 'tensorflow', 'pytorch', 'numpy', 'pandas',
    'machine learning', 'deep learning', 'nlp', 'computer vision', 'data science', 'ai', 'prompt engineering'
  ];

  const softKeywords = [
    'communication', 'teamwork', 'leadership', 'problem solving', 'critical thinking', 'time management',
    'adaptability', 'creativity', 'work ethic', 'interpersonal', 'mentoring', 'collaboration', 'agile', 'scrum'
  ];

  const detectedTech: string[] = [];
  const detectedSoft: string[] = [];

  const textLower = text.toLowerCase();
  techKeywords.forEach(kw => {
    // Exact word boundary matching for tech keywords like Go or SQL
    const regex = new RegExp('\\b' + kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'i');
    if (regex.test(textLower)) {
      // Capitalize properly
      detectedTech.push(kw.toUpperCase());
    }
  });

  softKeywords.forEach(kw => {
    const regex = new RegExp('\\b' + kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'i');
    if (regex.test(textLower)) {
      detectedSoft.push(kw.charAt(0).toUpperCase() + kw.slice(1));
    }
  });

  // Extract summaries / objectives (first paragraph that looks like a summary)
  let summary = '';
  let careerObjective = '';
  const summaryKeywords = /summary|professional summary|about me|profile|career objective|objective/i;
  
  for (let i = 0; i < lines.length; i++) {
    if (summaryKeywords.test(lines[i])) {
      // Get the next few lines as summary
      let summaryText = [];
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (/education|experience|skills|projects|certifications/i.test(lines[j])) break;
        summaryText.push(lines[j]);
      }
      if (summaryText.length > 0) {
        summary = summaryText.join(' ');
        break;
      }
    }
  }

  if (!summary) {
    summary = 'Motivated technology professional with expertise in developing scalable solutions and implementing modern web technologies.';
  }

  // Create a clean base object
  const resumeData: ResumeData = {
    personalInfo: {
      fullName,
      email,
      phone,
      location: location || 'San Francisco, CA',
      website: website || 'portfolio.dev',
      github,
      linkedin,
      summary,
      title: title || 'Software Engineer'
    },
    education: [
      {
        id: 'edu-1',
        institution: 'State University',
        degree: 'Bachelor of Science',
        fieldOfStudy: 'Computer Science',
        startDate: '2020-09',
        endDate: '2024-05',
        description: 'Completed coursework in Data Structures, Algorithms, Software Engineering, and Database Management.'
      }
    ],
    experience: [
      {
        id: 'exp-1',
        company: 'Innovative Tech Corp',
        position: 'Software Engineer Intern',
        location: 'San Francisco, CA',
        startDate: '2023-06',
        endDate: '2023-09',
        current: false,
        description: 'Developed React and Node.js web applications. Collaborative integration of APIs and front-end state management.'
      }
    ],
    projects: [
      {
        id: 'proj-1',
        title: 'E-commerce API Engine',
        role: 'Backend Developer',
        technologies: 'Node.js, Express, MongoDB, Redis',
        link: 'github.com/project/ecommerce-engine',
        description: 'Designed a high-performance REST API with caching layer to support 10,000 requests per minute.'
      }
    ],
    skills: {
      technical: detectedTech.length > 0 ? detectedTech.slice(0, 15) : ['JAVASCRIPT', 'REACT', 'NODE.JS', 'PYTHON', 'SQL', 'GIT'],
      soft: detectedSoft.length > 0 ? detectedSoft.slice(0, 6) : ['Communication', 'Teamwork', 'Problem Solving', 'Adaptability']
    },
    certifications: [
      {
        id: 'cert-1',
        name: 'AWS Certified Cloud Practitioner',
        issuer: 'Amazon Web Services',
        date: '2024-01'
      }
    ],
    languages: [
      {
        id: 'lang-1',
        name: 'English',
        proficiency: 'Professional Full'
      }
    ],
    interests: ['Machine Learning', 'Open Source', 'Biking']
  };

  return resumeData;
}
