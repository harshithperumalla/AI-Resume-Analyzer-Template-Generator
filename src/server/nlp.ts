import fs from 'fs';
import path from 'path';
import { MLAnalysis } from './db';

// Standard English Stop Words list
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'cant', 'cannot', 'could',
  'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'hadnt', 'has', 'hasnt', 'have', 'havent', 'having', 'he', 'hed', 'hell', 'hes', 'her', 'here',
  'heres', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'hows', 'i', 'id', 'ill', 'im', 'ive', 'if', 'in',
  'into', 'is', 'isnt', 'it', 'its', 'itself', 'lets', 'me', 'more', 'most', 'mustnt', 'my', 'myself', 'no', 'nor',
  'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'shant', 'she', 'shed', 'shell', 'shes', 'should', 'shouldnt', 'so', 'some', 'such', 'than', 'that', 'thats',
  'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'theres', 'these', 'they', 'theyd', 'theyll',
  'theyre', 'theyve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasnt', 'we',
  'wed', 'well', 'were', 'weve', 'werent', 'what', 'whats', 'when', 'whens', 'where', 'wheres', 'which', 'while',
  'who', 'whos', 'whom', 'why', 'whys', 'with', 'wont', 'would', 'wouldnt', 'you', 'youd', 'youll', 'youre', 'youve',
  'your', 'yours', 'yourself', 'yourselves'
]);

// Simple Porter-inspired Stemmer rule-set for standard developer keywords
export function stem(word: string): string {
  let w = word.toLowerCase().trim();
  if (w.length < 3) return w;

  // Simple suffixes
  if (w.endsWith('ing')) {
    w = w.slice(0, -3);
    if (w.endsWith('at') || w.endsWith('bl') || w.endsWith('iz')) {
      w += 'e';
    }
  } else if (w.endsWith('eed')) {
    w = w.slice(0, -1); // agreed -> agree
  } else if (w.endsWith('ed')) {
    w = w.slice(0, -2);
  } else if (w.endsWith('ies')) {
    w = w.slice(0, -3) + 'i';
  } else if (w.endsWith('es') && !w.endsWith('aes') && !w.endsWith('ees') && !w.endsWith('oes')) {
    w = w.slice(0, -2);
  } else if (w.endsWith('s') && !w.endsWith('us') && !w.endsWith('is') && !w.endsWith('ss')) {
    w = w.slice(0, -1);
  }

  // Lemmatizing specific common tech terms to consolidate categories
  if (w === 'develop' || w === 'developer' || w === 'development') return 'develop';
  if (w === 'analysis' || w === 'analyst' || w === 'analyze' || w === 'analytical') return 'analyz';
  if (w === 'manage' || w === 'manager' || w === 'management') return 'manag';
  if (w === 'engineer' || w === 'engineering') return 'engin';
  if (w === 'creat' || w === 'creator' || w === 'creation' || w === 'creative') return 'creat';
  if (w === 'science' || w === 'scientist' || w === 'scientific') return 'scienc';
  if (w === 'program' || w === 'programmer' || w === 'programming') return 'program';
  if (w === 'design' || w === 'designer' || w === 'designing') return 'design';
  if (w === 'comput' || w === 'computer' || w === 'computing') return 'comput';

  return w;
}

// Clean and preprocess text
export function preprocessText(text: string): string[] {
  if (!text) return [];
  const cleaned = text
    .toLowerCase()
    .replace(/[^\w\s\-\.\#\+]/g, ' ') // Preserve things like C++, C#, .NET
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = cleaned.split(/\s+/);
  return tokens
    .filter(token => token.length > 1 && !STOP_WORDS.has(token))
    .map(stem);
}

// Custom TF-IDF Vectorizer with Cosine Similarity
export class TfIdfVectorizer {
  private idf: Record<string, number> = {};
  private vocab: string[] = [];
  private numDocs = 0;

  constructor() {}

  // Train on a corpus (array of cleaned document token lists)
  fit(corpus: string[][]) {
    this.numDocs = corpus.length;
    const documentFrequencies: Record<string, number> = {};
    const uniqueTerms = new Set<string>();

    corpus.forEach(docTokens => {
      const uniqueInDoc = new Set(docTokens);
      uniqueInDoc.forEach(term => {
        documentFrequencies[term] = (documentFrequencies[term] || 0) + 1;
        uniqueTerms.add(term);
      });
    });

    this.vocab = Array.from(uniqueTerms);
    this.vocab.forEach(term => {
      const df = documentFrequencies[term] || 0;
      // TF-IDF standard smoothing
      this.idf[term] = Math.log((this.numDocs + 1) / (df + 1)) + 1;
    });
  }

  // Transform a document of tokens to a vector (term weight map)
  transform(tokens: string[]): Record<string, number> {
    const tf: Record<string, number> = {};
    const docLength = tokens.length || 1;

    tokens.forEach(term => {
      tf[term] = (tf[term] || 0) + 1;
    });

    const vector: Record<string, number> = {};
    this.vocab.forEach(term => {
      const termFreq = tf[term] || 0;
      const normalizedTf = termFreq / docLength;
      const termIdf = this.idf[term] || 0;
      if (termFreq > 0) {
        vector[term] = normalizedTf * termIdf;
      }
    });

    return vector;
  }

  // Calculate cosine similarity between two vectors
  static cosineSimilarity(vecA: Record<string, number>, vecB: Record<string, number>): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    const allKeys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);

    allKeys.forEach(key => {
      const valA = vecA[key] || 0;
      const valB = vecB[key] || 0;
      dotProduct += valA * valB;
      normA += valA * valA;
      normB += valB * valB;
    });

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// Multinomial Naive Bayes Text Classifier implemented in TypeScript
export class MultinomialNaiveBayes {
  private classPriors: Record<string, number> = {};
  private wordConditionalProbs: Record<string, Record<string, number>> = {};
  private classes: string[] = [];
  private vocab: Set<string> = new Set();
  private alpha = 1.0; // Laplace Smoothing factor

  constructor() {}

  // Train model using label-tokenized pairs
  fit(X: string[][], y: string[]) {
    const classDocs: Record<string, string[][]> = {};
    const classWordCounts: Record<string, Record<string, number>> = {};
    const classTotalWords: Record<string, number> = {};
    const docCount = X.length;

    // Initialize structures
    const uniqueClasses = Array.from(new Set(y));
    this.classes = uniqueClasses;

    uniqueClasses.forEach(c => {
      classDocs[c] = [];
      classWordCounts[c] = {};
      classTotalWords[c] = 0;
      this.classPriors[c] = 0;
    });

    // Populate data
    for (let i = 0; i < docCount; i++) {
      const tokens = X[i];
      const cls = y[i];
      classDocs[cls].push(tokens);
      this.classPriors[cls]++;

      tokens.forEach(token => {
        this.vocab.add(token);
        classWordCounts[cls][token] = (classWordCounts[cls][token] || 0) + 1;
        classTotalWords[cls]++;
      });
    }

    // Calculate Prior probabilities & Word conditional probabilities with Laplace smoothing
    const vocabSize = this.vocab.size;

    uniqueClasses.forEach(c => {
      this.classPriors[c] = this.classPriors[c] / docCount;
      this.wordConditionalProbs[c] = {};

      this.vocab.forEach(word => {
        const wordCount = classWordCounts[c][word] || 0;
        // Laplace smoothing: (count + alpha) / (total words in class + alpha * vocab size)
        this.wordConditionalProbs[c][word] = (wordCount + this.alpha) / (classTotalWords[c] + this.alpha * vocabSize);
      });
    });
  }

  // Predict class for preprocessed tokens
  predict(tokens: string[]): string {
    let bestClass = this.classes[0] || 'Software Engineer';
    let maxLogPosterior = -Infinity;

    const vocabSize = this.vocab.size;

    this.classes.forEach(c => {
      // Prior probability log
      let logPosterior = Math.log(this.classPriors[c] || 0.001);

      tokens.forEach(token => {
        if (this.vocab.has(token)) {
          const condProb = this.wordConditionalProbs[c][token] || (this.alpha / (vocabSize + this.alpha));
          logPosterior += Math.log(condProb);
        }
      });

      if (logPosterior > maxLogPosterior) {
        maxLogPosterior = logPosterior;
        bestClass = c;
      }
    });

    return bestClass;
  }

  // Serialize to JSON file (Joblib equivalent)
  saveModel(filePath: string) {
    const modelState = {
      classPriors: this.classPriors,
      wordConditionalProbs: this.wordConditionalProbs,
      classes: this.classes,
      vocab: Array.from(this.vocab),
      alpha: this.alpha
    };
    fs.writeFileSync(filePath, JSON.stringify(modelState, null, 2), 'utf-8');
  }

  // Deserialize from JSON file
  loadModel(filePath: string): boolean {
    try {
      if (!fs.existsSync(filePath)) return false;
      const raw = fs.readFileSync(filePath, 'utf-8');
      const state = JSON.parse(raw);
      this.classPriors = state.classPriors;
      this.wordConditionalProbs = state.wordConditionalProbs;
      this.classes = state.classes;
      this.vocab = new Set(state.vocab);
      this.alpha = state.alpha;
      return true;
    } catch (e) {
      console.error('Error loading model state:', e);
      return false;
    }
  }
}

// Built-in Training Corpus for 9 Categories of Resumes
const SEED_TRAINING_CORPUS: { text: string; category: string }[] = [
  // Software Engineer
  { text: 'software engineer develop application system scalable clean code java python c++ architecture design pattern databases git multi-threading algorithms complexity testing backend frontend agile computer science', category: 'Software Engineer' },
  { text: 'systems engineering microservices docker kubernetes design principles solid software development lifecycle engineering team mentoring agile scrum code review continuous integration', category: 'Software Engineer' },
  { text: 'backend software development api rest grpc spring boot django go postgresql sql redis system architect performance tuning memory profiling caching logic engineering', category: 'Software Engineer' },

  // Web Developer
  { text: 'web developer full stack frontend react vue angular html5 css3 javascript typescript responsive design sass tailwind state management webpack vite website landing page', category: 'Web Developer' },
  { text: 'frontend engineering nextjs ui components user experience web page dom manipulation accessibility animation node.js express website template design browser devtools seo optimizer', category: 'Web Developer' },
  { text: 'wordpress template php shopify custom web design interactive interfaces browser compatibility speed optimization rest apis json static site generators fullstack developer', category: 'Web Developer' },

  // Data Scientist
  { text: 'data scientist statistical analysis pandas numpy scipy r machine learning predictive modeling visualization matplotlib seaborn tableau data cleaning exploratory analytics pipeline math', category: 'Data Scientist' },
  { text: 'data science models feature engineering sql big query spark statistical tests hypothesis linear regression random forest classification clustering metrics accuracy dashboards', category: 'Data Scientist' },
  { text: 'quantitative analysis data analyst forecasting model selection metrics analytics python pandas scikit learn data viz charts insights reports raw data extraction pipeline', category: 'Data Scientist' },

  // Machine Learning Engineer
  { text: 'machine learning engineer scikit-learn models tensorflow pytorch neural networks deep learning NLP classification regression hyperparameter tuning optimization sklearn pipelines numpy pandas gpu training', category: 'Machine Learning Engineer' },
  { text: 'ml engineer feature store deployment sagemaker mlflow tensorboard algorithms mathematical modeling reinforcement learning cluster model validation cross validation overfitting', category: 'Machine Learning Engineer' },
  { text: 'nlp engineer computer vision machine learning training pipelines neural layers transformer bert LLM word2vec tokenization cnn rnn optimization scikit learn models joblib', category: 'Machine Learning Engineer' },

  // AI Engineer
  { text: 'ai engineer artificial intelligence llm large language model prompt engineering langchain rag generative ai gemini open-ai openai api agents vector database chromadb pincone fine tuning embeddings', category: 'AI Engineer' },
  { text: 'generative ai engineer agentic workflow semantic search vectorization embedding models multi-agent crewai autogen deep learning transformers model serving ai applications', category: 'AI Engineer' },
  { text: 'ai integration cognitive services speech to text vision api open-ai completion fine tuning embedding retrieval augmented generation intelligent systems smart chat bot', category: 'AI Engineer' },

  // DevOps Engineer
  { text: 'devops engineer ci/cd pipelines jenkins github actions gitlab runner docker container orchestration kubernetes terraform ansible cloud formation scripting bash shell infra as code iaac', category: 'DevOps Engineer' },
  { text: 'infrastructure engineer devops aws azure gcp linux administration system setup monitoring prometheus grafana elk stack logstash logging alert manager zero downtime deployments', category: 'DevOps Engineer' },
  { text: 'site reliability engineer sre system administration linux containers docker k8s networks load balancing nginx security firewalls scripting automation automated builds pipeline', category: 'DevOps Engineer' },

  // Cybersecurity Analyst
  { text: 'cybersecurity analyst security network monitoring intrusion detection vulnerability assessment penetration testing firewalls wireshark siem splunk incident response encryption threat intelligence', category: 'Cybersecurity Analyst' },
  { text: 'information security compliance iso27001 gdpr soc2 pen test cryptography malware analysis access control identity management proxy policies audits risk assessment ethical hacking', category: 'Cybersecurity Analyst' },
  { text: 'network security vulnerability scanning threat hunting security operations center soc analyst endpoint protection zero trust firewalls active directory security configuration audits', category: 'Cybersecurity Analyst' },

  // Cloud Engineer
  { text: 'cloud engineer amazon web services aws cloud architecture ec2 s3 rds lambda iam vpc load balancer route53 cloudfront serverless multi cloud migration azure gcp', category: 'Cloud Engineer' },
  { text: 'gcp engineer google cloud platform compute engine cloud run cloud sql app engine bucket iam serverless functions cloud build deployment manager cloud storage infrastructure', category: 'Cloud Engineer' },
  { text: 'azure cloud administrator virtual networks azure devops storage accounts active directory vm provisioning hybrid cloud load balancers resource manager templates subscription management', category: 'Cloud Engineer' },

  // UI/UX Designer
  { text: 'ui/ux designer figma figma designs sketch adobe xd wireframes prototyping user research user journey wireframing mockups high fidelity interface design visual assets layout typography', category: 'UI/UX Designer' },
  { text: 'product designer user interface user experience usability testing design system style guide responsive layouts user feedback visual arts graphic design design interactions workflows', category: 'UI/UX Designer' },
  { text: 'ux researcher wireframes mockups figma prototypes user centered design mobile app design web interface storyboard accessibility contrast ratios graphic elements typography', category: 'UI/UX Designer' },
];

const MODEL_PATH = path.resolve('best_model.json');
let classifierInstance: MultinomialNaiveBayes | null = null;

// Initialize, train, and save the classifier (Joblib style)
export function getClassifier(): MultinomialNaiveBayes {
  if (classifierInstance) return classifierInstance;

  const clf = new MultinomialNaiveBayes();
  const loaded = clf.loadModel(MODEL_PATH);

  if (loaded) {
    classifierInstance = clf;
    console.log('NLP Model loaded from best_model.json successfully.');
    return clf;
  }

  // Preprocess and train
  console.log('Training Naive Bayes classifier on training corpus...');
  const X_train: string[][] = [];
  const y_train: string[] = [];

  SEED_TRAINING_CORPUS.forEach(sample => {
    const tokens = preprocessText(sample.text);
    X_train.push(tokens);
    y_train.push(sample.category);
  });

  clf.fit(X_train, y_train);
  clf.saveModel(MODEL_PATH);
  console.log('Model trained and saved to best_model.json (Joblib style).');

  classifierInstance = clf;
  return clf;
}

// Function to calculate ATS similarity and extract gaps
export function analyzeResumeATS(resumeText: string, jobText: string): MLAnalysis {
  const resumeTokens = preprocessText(resumeText);
  const jobTokens = preprocessText(jobText);

  // TF-IDF Vectorization & Similarity
  const vectorizer = new TfIdfVectorizer();
  vectorizer.fit([resumeTokens, jobTokens]);

  const resumeVec = vectorizer.transform(resumeTokens);
  const jobVec = vectorizer.transform(jobTokens);

  const cosineSim = TfIdfVectorizer.cosineSimilarity(resumeVec, jobVec);
  const matchScore = Math.round(cosineSim * 100);

  // Classification
  const clf = getClassifier();
  const category = clf.predict(resumeTokens);

  // Keyword Matching & Skill Gap Analysis
  const resumeTokenSet = new Set(resumeTokens);
  const jobTokenSet = new Set(jobTokens);

  // Technical and general keywords extracted
  const allJobKeywords = Array.from(jobTokenSet);
  const matchingTokens = allJobKeywords.filter(token => resumeTokenSet.has(token));
  const missingTokens = allJobKeywords.filter(token => !resumeTokenSet.has(token));

  // Limit terms and un-stem for readability
  // We map stems back to popular tech keywords if matching
  const stemToWordMap: Record<string, string> = {
    'develop': 'Software Development',
    'program': 'Programming',
    'react': 'React',
    'python': 'Python',
    'java': 'Java',
    'typescript': 'TypeScript',
    'docker': 'Docker',
    'kubernet': 'Kubernetes',
    'aw': 'AWS (Amazon Web Services)',
    'gcp': 'GCP (Google Cloud Platform)',
    'sql': 'SQL databases',
    'mongo': 'MongoDB',
    'postgr': 'PostgreSQL',
    'figma': 'Figma Design',
    'ui': 'UI/UX Interface Design',
    'cybersecur': 'Cybersecurity Protocols',
    'ci': 'CI/CD Pipelines',
    'github': 'Git / GitHub Version Control',
    'machin': 'Machine Learning',
    'data': 'Data Analytics',
    'ai': 'Artificial Intelligence',
    'llm': 'LLMs (Large Language Models)',
    'deep': 'Deep Learning',
    'test': 'Unit Testing',
    'secur': 'Information Security',
    'cloud': 'Cloud Infrastructure',
  };

  const mapStems = (stems: string[], limit = 10): string[] => {
    const list: string[] = [];
    stems.forEach(s => {
      if (stemToWordMap[s]) {
        list.push(stemToWordMap[s]);
      } else if (s.length > 2) {
        // Capitalize stem as a placeholder keyword
        list.push(s.charAt(0).toUpperCase() + s.slice(1));
      }
    });
    return Array.from(new Set(list)).slice(0, limit);
  };

  const matchingSkills = mapStems(matchingTokens, 8);
  const missingSkills = mapStems(missingTokens, 8);

  // Recommended skills are missing skills plus standard recommendations for the category
  const categoryDefaults: Record<string, string[]> = {
    'Software Engineer': ['System Design', 'Algorithms', 'Microservices', 'Unit Testing', 'SQL', 'Git'],
    'Web Developer': ['JavaScript', 'Tailwind CSS', 'Next.js', 'Vite', 'REST APIs', 'SEO Optimization'],
    'Data Scientist': ['Pandas & NumPy', 'Data Visualization', 'Tableau', 'R', 'Statistical Analysis', 'SQL'],
    'Machine Learning Engineer': ['PyTorch / TensorFlow', 'Scikit-Learn', 'Feature Engineering', 'Joblib', 'MLPipelines'],
    'AI Engineer': ['Prompt Engineering', 'LangChain', 'Vector Databases', 'RAG (Retrieval Augmented Generation)', 'Gemini API'],
    'DevOps Engineer': ['CI/CD Pipelines', 'Docker', 'Kubernetes', 'Ansible', 'Terraform', 'AWS/GCP'],
    'Cybersecurity Analyst': ['Penetration Testing', 'SIEM / Splunk', 'Firewalls', 'Vulnerability Scanning', 'SOC Audits'],
    'Cloud Engineer': ['AWS Architecture', 'Google Cloud Platform', 'IAM Policies', 'Cloud Security', 'Terraform'],
    'UI/UX Designer': ['Figma Designs', 'Wireframes & Prototypes', 'User Research', 'Design Systems', 'Typography']
  };

  const recommendedSkills = Array.from(new Set([
    ...missingSkills,
    ...(categoryDefaults[category] || ['System Design', 'Agile methodologies'])
  ])).slice(0, 8);

  // Experience level determination based on keywords
  let experienceLevel = 'Junior Level (0-2 years)';
  const lowerText = resumeText.toLowerCase();
  if (lowerText.includes('senior') || lowerText.includes('lead') || lowerText.includes('principal') || lowerText.includes('architect')) {
    experienceLevel = 'Senior Level (5+ years)';
  } else if (lowerText.includes('mid') || lowerText.includes('years experience') || lowerText.includes('experienced developer')) {
    experienceLevel = 'Mid-Senior Level (3-5 years)';
  }

  // ATS Scoring Breakdown out of 100
  const formatScore = resumeText.length > 300 ? 95 : 60; // Bullet points check etc.
  const hasContact = (lowerText.includes('@') && (lowerText.includes('phone') || /\d{3}/.test(lowerText))) ? 100 : 50;
  const hasSections = (lowerText.includes('education') && lowerText.includes('experience') && lowerText.includes('skills')) ? 100 : 40;
  const lengthScore = (resumeText.split(/\s+/).length > 200 && resumeText.split(/\s+/).length < 800) ? 100 : 70;

  const keywordMatchPercentage = Math.round((matchingTokens.length / Math.max(1, jobTokens.length)) * 100);

  // Calculate Subscores
  const skillsScore = Math.min(100, 30 + matchingSkills.length * 10);
  const experienceScore = lowerText.includes('experience') ? 90 : 40;
  const projectsScore = lowerText.includes('project') ? 95 : 30;
  const educationScore = lowerText.includes('education') || lowerText.includes('university') || lowerText.includes('college') ? 100 : 30;
  const certificationsScore = lowerText.includes('certificat') || lowerText.includes('license') ? 90 : 20;
  const atsScoreCalculated = Math.round(
    (hasContact * 0.2) + (hasSections * 0.3) + (lengthScore * 0.2) + (matchScore * 0.3)
  );

  // Overall Score weights:
  // Skills (30%) + Experience (20%) + Projects (15%) + Education (10%) + Certifications (10%) + ATS (10%) + Formatting (5%)
  const overallScore = Math.round(
    (skillsScore * 0.3) +
    (experienceScore * 0.2) +
    (projectsScore * 0.15) +
    (educationScore * 0.1) +
    (certificationsScore * 0.1) +
    (atsScoreCalculated * 0.1) +
    (formatScore * 0.05)
  );

  // Generate local rules-based suggestions
  const suggestions: string[] = [];
  if (hasContact < 100) suggestions.push('Add contact information including a professional phone number and social links (GitHub/LinkedIn).');
  if (hasSections < 100) suggestions.push('Structure your resume into standard headings: "Work Experience", "Education", and "Skills".');
  if (missingSkills.length > 0) {
    suggestions.push(`Incorporate high-value missing keywords: ${missingSkills.slice(0, 3).join(', ')}.`);
  }
  if (resumeText.split(/\s+/).length < 200) {
    suggestions.push('Expand your resume details. ATS algorithms favor detailed descriptions of projects and roles over short list items.');
  } else if (resumeText.split(/\s+/).length > 800) {
    suggestions.push('Shorten your resume slightly. Ideally, keep your resume under two pages (400-600 words) for best readability.');
  }
  if (matchingSkills.length < 3) {
    suggestions.push('Customize your experience descriptions to closely match the active verbs and terms used in the target job description.');
  }

  // Programmatic Pros and Cons
  const pros: string[] = [];
  const cons: string[] = [];

  if (matchingSkills.length >= 4) {
    pros.push('Strong technical skill alignment with the desired job description.');
  } else if (matchingSkills.length > 0) {
    pros.push('Contains key matching technical keywords relevant to the target role.');
  }

  if (hasSections === 100) {
    pros.push('Excellent layout structure with standard industry sections (Experience, Education, Skills).');
  }

  if (lengthScore === 100) {
    pros.push('Optimal content depth and length (perfectly balanced word count for ATS engines).');
  }

  if (lowerText.includes('experience') && lowerText.length > 200) {
    pros.push('Detailed professional work experience logs with defined responsibilities.');
  }

  if (lowerText.includes('project') && lowerText.length > 300) {
    pros.push('Demonstrates practical execution through structured project portfolio items.');
  }

  if (hasContact === 100) {
    pros.push('Comprehensive contact details and professional links provided.');
  }

  if (lowerText.includes('certificat') || lowerText.includes('license')) {
    pros.push('Validates industry capability with documented certifications.');
  }

  // Generate Cons
  if (missingSkills.length > 3) {
    cons.push(`Significant technical skill gap: lacking desired keywords like ${missingSkills.slice(0, 3).join(', ')}.`);
  } else if (missingSkills.length > 0) {
    cons.push(`Lacks minor target keywords such as ${missingSkills.slice(0, 2).join(', ')}.`);
  }

  if (hasContact < 100) {
    cons.push('Incomplete contact information or missing standard links (e.g., LinkedIn/GitHub/Email).');
  }

  if (hasSections < 100) {
    cons.push('Non-standard structural layout or missing core sections, which may confuse older ATS parsers.');
  }

  if (resumeText.split(/\s+/).length < 200) {
    cons.push('Under-detailed descriptions (too short to trigger sufficient semantic keyword matching).');
  } else if (resumeText.split(/\s+/).length > 800) {
    cons.push('Excessive word count (exceeds two pages, risking readability and reader fatigue).');
  }

  if (!lowerText.includes('project')) {
    cons.push('Lacks a dedicated portfolio or projects section to showcase hands-on work.');
  }

  if (matchingSkills.length < 2) {
    cons.push('Low overall keyword density compared to the target job description requirements.');
  }

  if (pros.length === 0) {
    pros.push('Standard, cleanly formatted visual template.');
  }
  if (cons.length === 0) {
    cons.push('No critical issues found. Your resume matches the criteria extremely well!');
  }

  return {
    matchScore,
    atsScore: atsScoreCalculated,
    category,
    experienceLevel,
    matchingSkills,
    missingSkills,
    recommendedSkills,
    keywordMatchPercentage,
    suggestions: suggestions.length > 0 ? suggestions : [
      'Incorporate more quantifiable achievements in your work experience bullet points.',
      'Highlight open-source contributions or personal portfolio links.',
      'Ensure clear, standard fonts and margins are used for absolute compatibility.'
    ],
    pros,
    cons,
    scoringBreakdown: {
      skills: skillsScore,
      experience: experienceScore,
      projects: projectsScore,
      education: educationScore,
      certifications: certificationsScore,
      ats: atsScoreCalculated,
      format: formatScore
    }
  };
}

// Ensure classifier is ready when loading the file
getClassifier();
