/// <reference types="vite/client" />
import React, { useState, useEffect, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import {
  Upload, Download, Sparkles, Layout, Settings, FileText, CheckCircle, XCircle,
  AlertCircle, History, ShieldAlert, Award, Globe, Mail, Phone, MapPin, Github,
  Linkedin, Plus, Trash, ArrowUp, ArrowDown, User, FileSpreadsheet, RefreshCw,
  Layers, Check, Search, Menu, Eye, Edit, ChevronRight, Briefcase, GraduationCap,
  Heart, Languages, BarChart2, ListChecks, QrCode, LayoutTemplate, X, KeyRound, ThumbsUp, ThumbsDown, Printer, Sun, Moon
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';

// --- STYLING PRESETS ---
const COLOR_THEMES = [
  { name: 'Slate Gray', hex: '#1e293b', class: 'bg-slate-800' },
  { name: 'Royal Blue', hex: '#1d4ed8', class: 'bg-blue-700' },
  { name: 'Forest Emerald', hex: '#0f766e', class: 'bg-teal-700' },
  { name: 'Crimson Burgundy', hex: '#991b1b', class: 'bg-red-800' },
  { name: 'Indigo Night', hex: '#4338ca', class: 'bg-indigo-700' },
  { name: 'Minimalist Black', hex: '#000000', class: 'bg-black' }
];

const FONTS = [
  { id: 'sans', name: 'Inter (Modern Sans)', css: 'font-sans' },
  { id: 'serif', name: 'Merriweather (Classic Serif)', css: 'font-serif' },
  { id: 'mono', name: 'JetBrains Mono (Technical)', css: 'font-mono' }
];

const formatLocalTimestamp = (isoString?: string) => {
  if (!isoString) return 'Just now';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return isoString;
  }
};

const generateId = () => Math.random().toString(36).substring(2, 15);

const API_BASE = import.meta.env.VITE_API_URL || 'https://ai-resume-analyzer-template-generator-1.onrender.com';

export default function App() {
  // --- CORE NAV STATE ---
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('resumatch_token');
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(() => {
    try {
      const saved = localStorage.getItem('resumatch_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [currentView, setCurrentViewRaw] = useState<'auth' | 'dashboard' | 'builder' | 'analyzer' | 'history' | 'admin'>(() => {
    try {
      const savedView = localStorage.getItem('resumatch_current_view');
      const savedToken = localStorage.getItem('resumatch_token');
      if (savedToken && savedView) {
        return savedView as any;
      }
      return savedToken ? 'dashboard' : 'auth';
    } catch {
      return 'auth';
    }
  });

  const setCurrentView = (view: 'auth' | 'dashboard' | 'builder' | 'analyzer' | 'history' | 'admin') => {
    setCurrentViewRaw(view);
    try {
      localStorage.setItem('resumatch_current_view', view);
    } catch (e) {
      console.error('Error persisting currentView to localStorage', e);
    }
  };

  // --- DARK MODE THEME STATE ---
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('resumatch_theme') === 'dark';
    } catch {
      return false;
    }
  });

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem('resumatch_theme', next ? 'dark' : 'light');
      } catch (e) {
        console.error('Failed to save theme setting', e);
      }
      return next;
    });
  };

  const getScoreColorClass = (score: number) => {
    if (score >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (score >= 60) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  };

  const saveTimeoutRef = useRef<any>(null);

  // --- AUTH FORM STATES ---
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // --- FORGOT PASSWORD STATES ---
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'verify' | 'reset'>('request');
  const [forgotCode, setForgotCode] = useState('');
  const [userCodeInput, setUserCodeInput] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState('');
  const [forgotErrorMessage, setForgotErrorMessage] = useState('');

  // --- APP STATE ---
  const [resumes, setResumes] = useState<any[]>([]);
  const [activeResume, setActiveResumeState] = useState<any | null>(() => {
    try {
      const savedRes = localStorage.getItem('resumatch_active_resume');
      return savedRes ? JSON.parse(savedRes) : null;
    } catch {
      return null;
    }
  });

  const setActiveResume = (res: any) => {
    setActiveResumeState(res);
    try {
      if (res) {
        localStorage.setItem('resumatch_active_resume', JSON.stringify(res));
      } else {
        localStorage.removeItem('resumatch_active_resume');
      }
    } catch (e) {
      console.error('Error persisting activeResume to localStorage', e);
    }
  };
  const [activeHistory, setActiveHistory] = useState<any[]>([]);
  const [systemStats, setSystemStats] = useState<any>(null);
  const [dashboardTemplate, setDashboardTemplate] = useState<'bento' | 'analytical' | 'minimalist'>('bento');
  const [dashSearchQuery, setDashSearchQuery] = useState('');
  const [dashCategoryFilter, setDashCategoryFilter] = useState('all');

  // --- JOB DESCRIPTION FOR ATS MATCH ---
  const [jobTitle, setJobTitle] = useState('');
  const [jobCompany, setJobCompany] = useState('');
  
  const [jobDescription, setJobDescriptionState] = useState<string>(() => {
    try {
      return localStorage.getItem('resumatch_job_description') || '';
    } catch {
      return '';
    }
  });

  const setJobDescription = (desc: string) => {
    setJobDescriptionState(desc);
    try {
      localStorage.setItem('resumatch_job_description', desc);
    } catch (e) {
      console.error('Error saving jobDescription to localStorage', e);
    }
  };

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [analysisResult, setAnalysisResultState] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('resumatch_analysis_result');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setAnalysisResult = (res: any) => {
    setAnalysisResultState(res);
    try {
      if (res) {
        localStorage.setItem('resumatch_analysis_result', JSON.stringify(res));
      } else {
        localStorage.removeItem('resumatch_analysis_result');
      }
    } catch (e) {
      console.error('Error saving analysisResult to localStorage', e);
    }
  };

  // --- AI SUGGESTIONS ---
  const [aiSuggestions, setAiSuggestionsState] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('resumatch_ai_suggestions');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setAiSuggestions = (sug: any) => {
    setAiSuggestionsState(sug);
    try {
      if (sug) {
        localStorage.setItem('resumatch_ai_suggestions', JSON.stringify(sug));
      } else {
        localStorage.removeItem('resumatch_ai_suggestions');
      }
    } catch (e) {
      console.error('Error saving aiSuggestions to localStorage', e);
    }
  };

  const [isRequestingSuggestions, setIsRequestingSuggestions] = useState(false);

  // --- NOTIFICATION BANNER STATE ---
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // --- QR CODE DISPLAY STATE ---
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrContent, setQrContent] = useState('');

  // --- CUSTOM CONFIRMATION DIALOG STATE ---
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // --- TEMPLATE SELECTOR STATE ---
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newResumeTitle, setNewResumeTitle] = useState('New Professional Resume');
  const [selectedTmplId, setSelectedTmplId] = useState('template-software');

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(null);
      }
    });
  };

  // Auto-clear notification helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const saveSession = (newToken: string | null, newUser: any | null) => {
    setToken(newToken);
    setUser(newUser);
    try {
      if (newToken) {
        localStorage.setItem('resumatch_token', newToken);
      } else {
        localStorage.removeItem('resumatch_token');
      }
      if (newUser) {
        localStorage.setItem('resumatch_user', JSON.stringify(newUser));
      } else {
        localStorage.removeItem('resumatch_user');
      }
    } catch (e) {
      console.error('Failed to save session to localStorage', e);
    }
  };

  // --- TRIGGER GUEST AUTO-LOGIN ---
  const handleGuestLogin = async () => {
    try {
      // Clear forms
      setAuthError('');
      // Standard local credentials for smooth testing
      const email = 'demo.recruiter@aistudio.com';
      const password = 'guestPassword123';

      let loginRes = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!loginRes.ok) {
        // If demo user does not exist, auto register
        const regRes = await fetch(`${API_BASE}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Demo Candidate', email, password })
        });
        loginRes = regRes;
      }

      const data = await loginRes.json();
      if (data.error) {
        setAuthError(data.error);
        return;
      }

      saveSession(data.token, data.user);
      setCurrentView('dashboard');
      showToast(`Welcome back, ${data.user.name}! Enjoy full access to ML analysis.`, 'success');
      fetchDashboardData(data.token);
    } catch (err) {
      console.error('Guest access failed, running completely local in-memory fallback:', err);
      // Fallback
      saveSession('demo-token-123', { id: 'usr-demo', name: 'Alex Carter', email: 'alex.carter@tech.com' });
      setCurrentView('dashboard');
    }
  };

  // --- REAL AUTH ACTIONS ---
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (authMode === 'register' && !authName) {
      setAuthError('Name is required for registration.');
      return;
    }
    if (!authEmail || !authPassword) {
      setAuthError('Email and password are required.');
      return;
    }

    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: authName,
          email: authEmail,
          password: authPassword
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setAuthError(data.detail || data.error || 'Authentication failed.');
        return;
      }

      saveSession(data.token, data.user);
      setCurrentView('dashboard');
      showToast(authMode === 'login' ? 'Logged in successfully!' : 'Account registered successfully!', 'success');
      fetchDashboardData(data.token);
    } catch (err) {
      setAuthError('Unable to connect to the backend server. Please make sure the backend is active.');
    }
  };

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErrorMessage('');
    setForgotSuccessMessage('');

    if (!forgotEmail) {
      setForgotErrorMessage('Please enter your email address.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });

      const data = await response.json();
      if (!response.ok) {
        setForgotErrorMessage(data.detail || data.error || 'Request failed.');
        return;
      }

      // Generate the code directly inside the app client-side
      const appGeneratedCode = Math.floor(100000 + Math.random() * 900000).toString();
      setForgotCode(appGeneratedCode);
      setForgotStep('verify');
      setForgotSuccessMessage('Security code generated directly by the application!');
    } catch (err) {
      // Offline fallback
      const appGeneratedCode = Math.floor(100000 + Math.random() * 900000).toString();
      setForgotCode(appGeneratedCode);
      setForgotStep('verify');
      setForgotSuccessMessage('Security code generated directly by the application!');
    }
  };

  const handleVerifyCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErrorMessage('');
    setForgotSuccessMessage('');

    if (userCodeInput.trim() !== forgotCode) {
      setForgotErrorMessage('Invalid security code. Please check the code and try again.');
      return;
    }

    setForgotStep('reset');
    setForgotSuccessMessage('Code verified successfully! Choose your new password.');
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErrorMessage('');
    setForgotSuccessMessage('');

    if (!forgotNewPassword || forgotNewPassword.length < 4) {
      setForgotErrorMessage('Password must be at least 4 characters long.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail,
          newPassword: forgotNewPassword
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setForgotErrorMessage(data.detail || data.error || 'Failed to reset password.');
        return;
      }

      setForgotSuccessMessage('Password successfully updated! Closing modal...');
      showToast('Password reset successfully! You can now log in with your new password.', 'success');
      
      // Auto populate password field
      setAuthEmail(forgotEmail);
      setAuthPassword(forgotNewPassword);

      setTimeout(() => {
        setShowForgotModal(false);
      }, 1500);
    } catch (err) {
      setForgotErrorMessage('Unable to connect to the backend server to complete the password reset.');
    }
  };

  const handleLogout = async () => {
    if (token) {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    }
    saveSession(null, null);
    setResumes([]);
    setActiveResume(null);
    setCurrentView('auth');
    showToast('Logged out securely.', 'info');
  };

  // --- FETCH PERSISTED DATABASE INFO ---
  const fetchDashboardData = async (activeToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/resumes`, {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      if (res.status === 401) {
        saveSession(null, null);
        setCurrentView('auth');
        setResumes([]);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setResumes(data);
        if (activeResume) {
          const match = data.find((r: any) => r.id === activeResume.id);
          if (match) {
            setActiveResume(match);
          }
        } else if (data.length > 0) {
          setActiveResume(data[0]);
        }
      } else {
        console.warn('API returned non-array resumes:', data);
        setResumes([]);
      }

      const statsRes = await fetch(`${API_BASE}/api/stats`, {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setSystemStats(statsData);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setResumes([]);
    }
  };

  const handleCreateResumeWithData = async (title: string, dataObj: any, selectedTemplateId = 'template-software', activeToken = token, redirectView = 'builder') => {
    try {
      const response = await fetch(`${API_BASE}/api/resumes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          title,
          templateId: selectedTemplateId,
          data: dataObj
        })
      });
      const newRes = await response.json();
      if (response.ok) {
        setResumes(prev => [newRes, ...prev]);
        setActiveResume(newRes);
        if (redirectView) {
          setCurrentView(redirectView as any);
        }
        showToast(`Created "${title}" based on selected template!`, 'success');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateEmpty = (selectedTemplateId = 'template-software', title = 'New Professional Resume') => {
    handleCreateResumeWithData(title, {
      personalInfo: { fullName: 'Firstname Lastname', email: 'email@example.com', phone: '', location: '', website: '', github: '', linkedin: '', summary: '', title: '' },
      education: [],
      experience: [],
      projects: [],
      skills: { technical: [], soft: [] },
      certifications: [],
      languages: [],
      interests: []
    }, selectedTemplateId);
  };

  const handleUpdateResume = (updated: any) => {
    // 1. Update the local resumes array immediately to keep lists in sync
    setResumes(prev => prev.map(r => r.id === updated.id ? updated : r));
    
    // 2. Clear any pending debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // 3. Queue the server save
    saveTimeoutRef.current = setTimeout(async () => {
      if (!token) return;
      try {
        const response = await fetch(`${API_BASE}/api/resumes/${updated.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updated)
        });
        if (response.ok) {
          const resData = await response.json();
          // If a job description is active, re-calculate ATS score in real time!
          if (jobDescription) {
            const analyzeRes = await fetch(`${API_BASE}/api/resumes/${updated.id}/analyze`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ jobDescription })
            });
            if (analyzeRes.ok) {
              const analyzeData = await analyzeRes.json();
              setAnalysisResult(analyzeData.analysis);
            }
          }
        } else {
          console.error('Failed to auto-save resume changes to server');
        }
      } catch (err) {
        console.error('Error auto-saving resume:', err);
      }
    }, 1000);
  };

  // --- IMMUTABLE STATE UPDATE HELPERS FOR BUILDER ---
  const updatePersonalInfoField = (field: string, value: string) => {
    if (!activeResume) return;
    const updated = {
      ...activeResume,
      data: {
        ...activeResume.data,
        personalInfo: {
          ...activeResume.data.personalInfo,
          [field]: value
        }
      }
    };
    setActiveResume(updated);
    handleUpdateResume(updated);
  };

  const updateSkillsField = (type: 'technical' | 'soft', valueStr: string) => {
    if (!activeResume) return;
    const list = valueStr.split(',').map(s => type === 'technical' ? s.trim().toUpperCase() : s.trim()).filter(s => s.length > 0);
    const updated = {
      ...activeResume,
      data: {
        ...activeResume.data,
        skills: {
          ...activeResume.data.skills,
          [type]: list
        }
      }
    };
    setActiveResume(updated);
    handleUpdateResume(updated);
  };

  const updateExperienceField = (index: number, field: string, value: any) => {
    if (!activeResume) return;
    const expList = activeResume.data.experience.map((item: any, i: number) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    const updated = {
      ...activeResume,
      data: {
        ...activeResume.data,
        experience: expList
      }
    };
    setActiveResume(updated);
    handleUpdateResume(updated);
  };

  const updateEducationField = (index: number, field: string, value: any) => {
    if (!activeResume) return;
    const eduList = activeResume.data.education.map((item: any, i: number) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    const updated = {
      ...activeResume,
      data: {
        ...activeResume.data,
        education: eduList
      }
    };
    setActiveResume(updated);
    handleUpdateResume(updated);
  };

  const updateProjectField = (index: number, field: string, value: any) => {
    if (!activeResume) return;
    const projList = activeResume.data.projects.map((item: any, i: number) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    const updated = {
      ...activeResume,
      data: {
        ...activeResume.data,
        projects: projList
      }
    };
    setActiveResume(updated);
    handleUpdateResume(updated);
  };


  const handleDeleteResume = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    showConfirm(
      'Delete Resume',
      'Are you absolutely sure you want to delete this resume? All backup versions will be removed.',
      async () => {
        try {
          const response = await fetch(`${API_BASE}/api/resumes/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            setResumes(prev => prev.filter(r => r.id !== id));
            if (activeResume?.id === id) setActiveResume(null);
            showToast('Resume deleted successfully.', 'success');
            fetchDashboardData(token);
          }
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  // --- ARROW-BASED REORDERING SYSTEM ---
  const reorderSection = (section: 'education' | 'experience' | 'projects' | 'certifications' | 'languages', index: number, direction: 'up' | 'down') => {
    if (!activeResume) return;
    const list = [...activeResume.data[section]];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    // Swap
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const updated = {
      ...activeResume,
      data: {
        ...activeResume.data,
        [section]: list
      }
    };
    setActiveResume(updated);
    handleUpdateResume(updated);
  };

  // --- REORDER PARENT SECTIONS ---
  const moveParentSection = (index: number, direction: 'up' | 'down') => {
    if (!activeResume) return;
    const list = [...activeResume.customization.sectionOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const updated = {
      ...activeResume,
      customization: {
        ...activeResume.customization,
        sectionOrder: list
      }
    };
    setActiveResume(updated);
    handleUpdateResume(updated);
    showToast('Section order updated!', 'success');
  };

  // --- UPLOAD & PARSE LOGIC ---
  const [isParsingFile, setIsParsingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    triggerParsing(file);
    if (e.target) {
      e.target.value = '';
    }
  };

  const triggerParsing = (file: File) => {
    setIsParsingFile(true);
    showToast(`Uploading ${file.name} for Machine Learning parsing...`, 'info');

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        let res = await fetch(`${API_BASE}/api/resumes/parse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileData: base64Data,
            fileName: file.name,
            fileType: file.type
          })
        });

        if (!res.ok) {
          res = await fetch(`${API_BASE}/api/parse-resume`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileData: base64Data,
              fileName: file.name,
              fileType: file.type
            })
          });
        }

        const data = await res.json();
        setIsParsingFile(false);

        if (!res.ok) {
          showToast(data.error || data.detail || 'Failed to extract text.', 'error');
          return;
        }

        // Create new resume based on extracted structured data
        await handleCreateResumeWithData(
          `Imported - ${file.name.split('.')[0]}`,
          data.parsedData,
          'template-software',
          token,
          'dashboard'
        );
        fetchDashboardData(token);
        showToast('Document uploaded, parsed & analyzed! Dashboard updated.', 'success');
      } catch (err) {
        setIsParsingFile(false);
        showToast('Server connection failed while parsing the resume.', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  // --- COMPUTE ATS COMPARISON ---
  const handleRunAnalysis = async () => {
    if (!activeResume || !jobDescription) {
      showToast('Please provide a target job description.', 'error');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAiSuggestions(null);
    showToast('Processing Natural Language Similarity Matching...', 'info');

    try {
      // 1. Run local ML TF-IDF Cosine Match + Naive Bayes Category Classification
      const res = await fetch(`${API_BASE}/api/resumes/${activeResume.id}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ jobDescription })
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || data.detail || 'Failed to complete analysis.', 'error');
        setIsAnalyzing(false);
        return;
      }

      setAnalysisResult(data.analysis);
      showToast('Cosine TF-IDF match processed successfully!', 'success');

      // 2. Fetch Gemini Smart Improvement Suggestions
      setIsRequestingSuggestions(true);
      const suggestRes = await fetch(`${API_BASE}/api/resumes/${activeResume.id}/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ jobDescription })
      });
      const suggestData = await suggestRes.json();
      setIsRequestingSuggestions(false);

      if (suggestRes.ok) {
        setAiSuggestions(suggestData);
      } else {
        setAiSuggestions({
          suggestions: [
            {
              priority: 'High',
              issueFound: 'Review standard ATS guidelines',
              whyAffects: 'Without a customized review, potential formatting bugs can limit parsed keyword recognition.',
              howToFix: 'Ensure simple layouts with standard headings (Work Experience, Skills, Education).',
              exampleImproved: 'Example: Senior Software Engineer at TechCorp'
            }
          ],
          top5Improvements: [
            'Use standard action verbs.',
            'Include relevant keywords matching the job description.',
            'Quantify accomplishments with key performance metrics.',
            'Maintain a clean, simple, single-column layout.',
            'List exact contact details clearly at the top.'
          ],
          scoreImpact: {
            currentScore: data.analysis?.atsScore || 50,
            estimatedScore: Math.min(100, (data.analysis?.atsScore || 50) + 15),
            potentialIncrease: 15
          },
          positiveFeedback: 'Your resume follows standard parsing guidelines.'
        });
      }
      setIsAnalyzing(false);
    } catch (err) {
      setIsAnalyzing(false);
      setIsRequestingSuggestions(false);
      showToast('Error connecting to the ATS evaluation server.', 'error');
    }
  };

  // --- HISTORY MANAGEMENT ---
  const handleViewHistory = async (resumeId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/resumes/${resumeId}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setActiveHistory(data);
      setCurrentView('history');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestoreHistory = async (historyId: string) => {
    if (!activeResume) return;
    showConfirm(
      'Restore Snapshot',
      'Restore this snapshot? Current unsaved modifications will be archived.',
      async () => {
        try {
          const res = await fetch(`${API_BASE}/api/resumes/${activeResume.id}/restore`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ historyId })
          });
          const updated = await res.json();
          if (res.ok) {
            setActiveResume(updated);
            showToast('Backup restored successfully!', 'success');
            setCurrentView('builder');
            fetchDashboardData(token);
          }
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  // --- GENERATE SHARE / VCARD CONTACT QR CODE ---
  const generateContactQRCode = () => {
    if (!activeResume) return;
    const pi = activeResume.data.personalInfo;
    
    // Formulate clean MECARD string for smartphone camera readers
    const mecard = `MECARD:N:${pi.fullName};EMAIL:${pi.email};TEL:${pi.phone};NOTE:${pi.title} - ${pi.summary.substring(0, 50)}...;URL:${pi.website || pi.github};;`;
    
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(mecard)}`;
    setQrContent(qrUrl);
    setShowQRModal(true);
  };

  // --- PRINT & HIGH-RES PDF EXPORT ---
  const handlePrint = () => {
    window.print();
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    if (!activeResume) return;
    const originalElement = document.getElementById('resume-print-area');
    if (!originalElement) {
      showToast('Resume preview element not found. Opening print dialog...', 'error');
      window.print();
      return;
    }

    setIsGeneratingPDF(true);
    showToast(`Generating high-resolution A4 PDF for "${activeResume.title}"...`, 'info');

    // Create a temporary isolated container specifically formatted for A4 PDF export
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '210mm';
    tempContainer.style.padding = '10mm 12mm';
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.style.color = '#0f172a';
    tempContainer.style.boxSizing = 'border-box';
    tempContainer.style.fontFamily = activeResume.customization?.fontFamily || 'Inter, sans-serif';

    // Clone the inner resume preview element exclusively
    const clone = originalElement.cloneNode(true) as HTMLElement;
    clone.style.border = 'none';
    clone.style.boxShadow = 'none';
    clone.style.padding = '0';
    clone.style.margin = '0';
    clone.style.width = '100%';
    clone.style.backgroundColor = '#ffffff';
    
    // Remove any print-hidden buttons inside clone if any exist
    const hiddenElements = clone.querySelectorAll('.print\\:hidden, button');
    hiddenElements.forEach(el => el.remove());

    tempContainer.appendChild(clone);
    document.body.appendChild(tempContainer);

    try {
      const filename = `${(activeResume.title || 'Resume').trim().replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

      const opt = {
        margin:       [5, 5, 5, 5],
        filename:     filename,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          letterRendering: true,
          windowWidth: 1024
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
      };

      const html2pdfRunner = (html2pdf as any)?.default || html2pdf || (window as any).html2pdf;

      if (html2pdfRunner) {
        const worker = html2pdfRunner().set(opt).from(tempContainer);
        await worker.save();
        showToast(`Successfully downloaded "${filename}"!`, 'success');
      } else {
        showToast('PDF engine unavailable. Opening print dialog...', 'info');
        window.print();
      }
    } catch (err) {
      console.error('Error generating PDF with html2pdf:', err);
      showToast('PDF compilation failed. Opening print dialog...', 'error');
      window.print();
    } finally {
      if (document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer);
      }
      setIsGeneratingPDF(false);
    }
  };

  const [isExportingReport, setIsExportingReport] = useState(false);
  const handleDownloadAtsReport = async () => {
    if (!analysisResult) return;
    setIsExportingReport(true);
    showToast('Compiling ATS Evaluation Report PDF...', 'info');
    try {
      const element = document.getElementById('analysis-results');
      if (!element) {
        showToast('Analysis report container not found.', 'error');
        setIsExportingReport(false);
        return;
      }

      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.width = '210mm';
      tempContainer.style.padding = '15mm';
      tempContainer.style.backgroundColor = '#ffffff';

      const clone = element.cloneNode(true) as HTMLElement;
      tempContainer.appendChild(clone);
      document.body.appendChild(tempContainer);

      const html2pdfRunner = (html2pdf as any)?.default || html2pdf || (window as any).html2pdf;
      const filename = `${activeResume?.title || 'Candidate'}_ATS_Evaluation_Report.pdf`;

      const opt = {
        margin:       10,
        filename:     filename,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      if (html2pdfRunner) {
        const worker = html2pdfRunner().set(opt).from(tempContainer);
        await worker.save();
        showToast(`Downloaded ATS Report: "${filename}"!`, 'success');
      } else {
        window.print();
      }
      document.body.removeChild(tempContainer);
    } catch (err) {
      console.error(err);
      showToast('ATS Report compilation failed.', 'error');
    } finally {
      setIsExportingReport(false);
    }
  };

  // --- RECHARTS HELPER DATA ---
  const getRechartsPieData = () => {
    if (!systemStats || !systemStats.categories) return [];
    return Object.entries(systemStats.categories).map(([name, value]) => ({
      name,
      value: value as number
    }));
  };

  const getAtsRadarData = () => {
    if (!analysisResult || !analysisResult.scoringBreakdown) {
      return [];
    }
    const b = analysisResult.scoringBreakdown;
    return [
      { subject: 'Keywords & Skills', score: b.skills },
      { subject: 'Experience Log', score: b.experience },
      { subject: 'Projects Portfolio', score: b.projects },
      { subject: 'Education Weight', score: b.education },
      { subject: 'Certifications', score: b.certifications },
      { subject: 'ATS Parsing Match', score: b.ats },
      { subject: 'Formatting Balance', score: b.format }
    ];
  };

  // Load stats once auth resolves
  useEffect(() => {
    if (token) {
      fetchDashboardData(token);
    }
  }, [token]);

  // Handle Drag and Drop for Upload Dashboard
  const [isDragActive, setIsDragActive] = useState(false);
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      triggerParsing(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} ${activeResume ? FONTS.find(f => f.id === activeResume.customization.fontFamily)?.css || 'font-sans' : 'font-sans'}`} id="app-container">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pdf,.docx"
        className="hidden"
        id="hidden-file-uploader"
      />
      
      {/* GLOBAL TOAST NOTIFICATION */}
      {notification && (
        <div id="toast-banner" className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl transition-all duration-300 max-w-md animate-bounce ${
          notification.type === 'success' ? 'bg-emerald-600 text-white' :
          notification.type === 'error' ? 'bg-rose-600 text-white' :
          'bg-slate-800 text-white'
        }`}>
          {notification.type === 'success' && <CheckCircle className="w-6 h-6" />}
          {notification.type === 'error' && <XCircle className="w-6 h-6" />}
          {notification.type === 'info' && <AlertCircle className="w-6 h-6 animate-spin" />}
          <p className="text-sm font-semibold">{notification.message}</p>
        </div>
      )}

      {/* SYSTEM HEADER */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md print:hidden" id="app-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-lg shadow-inner text-white">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold tracking-tight text-lg">ResuMatch AI</h1>
              <p className="text-xs text-slate-400 font-mono">NLP Resume Builder & Analyzer</p>
            </div>
          </div>

          {token && (
            <nav className="flex items-center gap-2 sm:gap-4">
              <button
                id="btn-nav-dash"
                onClick={() => setCurrentView('dashboard')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${currentView === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                Dashboard
              </button>
              {activeResume && (
                <>
                  <button
                    id="btn-nav-build"
                    onClick={() => setCurrentView('builder')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${currentView === 'builder' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                  >
                    Builder
                  </button>
                  <button
                    id="btn-nav-match"
                    onClick={() => {
                      setCurrentView('analyzer');
                      if (activeResume?.analysis) {
                        setAnalysisResult(activeResume.analysis);
                      }
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${currentView === 'analyzer' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
                  >
                    ATS Matcher
                  </button>
                </>
              )}
              <button
                id="btn-nav-admin"
                onClick={() => setCurrentView('admin')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${currentView === 'admin' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                Telemetry
              </button>

              <div className="h-6 w-[1px] bg-slate-800 mx-1"></div>

              <div className="flex items-center gap-3 pl-2">
                <button
                  id="btn-nav-theme-toggle"
                  onClick={toggleDarkMode}
                  className="p-2 border border-slate-700 rounded-lg text-xs font-bold text-slate-300 hover:bg-slate-800 transition flex items-center justify-center cursor-pointer"
                  title="Toggle Light / Dark Mode"
                >
                  {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-300" />}
                </button>
                <span className="hidden md:inline text-xs font-mono text-indigo-400">@{user?.name}</span>
                <button
                  id="btn-nav-logout"
                  onClick={handleLogout}
                  className="px-3 py-1.5 border border-slate-700 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-950/30 transition hover:border-rose-900"
                >
                  Logout
                </button>
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8" id="app-main-content">
        
        {/* --- 1. AUTH SCREEN --- */}
        {currentView === 'auth' && (
          <div className="max-w-md mx-auto my-12" id="panel-auth">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-8 h-8 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-black text-slate-800">Welcome to ResuMatch AI</h2>
                <p className="text-sm text-slate-500 mt-1">Design, Parse, and Analyze your resume with custom NLP classification & cosine matching models.</p>
              </div>

              {authError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-700 text-sm font-medium">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authMode === 'register' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name</label>
                    <input
                      id="input-reg-name"
                      type="text"
                      autoComplete="name"
                      placeholder="Alex Carter"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    id="input-auth-email"
                    type="email"
                    autoComplete="username email"
                    placeholder="alex@tech.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(authEmail);
                          setShowForgotModal(true);
                          setForgotSuccessMessage('');
                          setForgotErrorMessage('');
                          setForgotCode('');
                          setForgotNewPassword('');
                          setUserCodeInput('');
                          setForgotStep('request');
                        }}
                        className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    id="input-auth-password"
                    type="password"
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition"
                  />
                </div>

                <button
                  id="btn-auth-submit"
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  {authMode === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <span className="relative bg-white px-3 text-xs text-slate-400 font-mono">OR friction-free entry</span>
              </div>

              {/* GUEST MODE BUTTON */}
              <button
                id="btn-auth-guest"
                onClick={handleGuestLogin}
                className="w-full py-3 border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Launch Demo / Recruiter Mode
              </button>

              <div className="mt-6 text-center">
                <button
                  id="btn-auth-toggle"
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- 2. DASHBOARD VIEW --- */}
        {currentView === 'dashboard' && (() => {
          const resumesArr = Array.isArray(resumes) ? resumes : [];
          const filteredResumes = resumesArr.filter(res => {
            const titleMatch = (res.title || '').toLowerCase().includes(dashSearchQuery.toLowerCase());
            const nameMatch = (res.data?.personalInfo?.fullName || '').toLowerCase().includes(dashSearchQuery.toLowerCase());
            const roleMatch = (res.data?.personalInfo?.title || '').toLowerCase().includes(dashSearchQuery.toLowerCase());
            const matchesSearch = titleMatch || nameMatch || roleMatch;
            
            if (dashCategoryFilter === 'all') return matchesSearch;
            return matchesSearch && res.templateId === dashCategoryFilter;
          });

          return (
            <div className="space-y-8" id="panel-dashboard">
              
              {/* DASHBOARD TEMPLATE CHOICE SWITCHER */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                <div>
                  <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                    <LayoutTemplate className="w-5 h-5 text-indigo-600" />
                    Dashboard Template
                  </h2>
                  <p className="text-xs text-slate-400">Switch your workspace visualization theme instantly</p>
                </div>
                <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200/60 w-full sm:w-auto">
                  <button
                    onClick={() => setDashboardTemplate('bento')}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      dashboardTemplate === 'bento'
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🍱 Bento Grid
                  </button>
                  <button
                    onClick={() => setDashboardTemplate('analytical')}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      dashboardTemplate === 'analytical'
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📊 Analytical
                  </button>
                  <button
                    onClick={() => setDashboardTemplate('minimalist')}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      dashboardTemplate === 'minimalist'
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ⚡ Minimalist
                  </button>
                </div>
              </div>

              {/* ----------------- 1. EXECUTIVE BENTO GRID VIEW ----------------- */}
              {dashboardTemplate === 'bento' && (
                <div className="space-y-6" id="bento-dashboard-view">
                  
                  {/* Hero Intro */}
                  <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 rounded-2xl text-white p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl border border-indigo-900/40 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="space-y-2 relative z-10">
                      <div className="inline-flex items-center gap-1.5 bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-500/30 text-indigo-300 text-[10px] font-black uppercase tracking-widest">
                        <Sparkles className="w-3.5 h-3.5" /> Next-Gen AI Workspace
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">Enterprise NLP Portfolio Analytics</h2>
                      <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                        Design industry-standard ATS-optimized professional portfolios, parse documents with high-fidelity heuristic parsing pipelines, and match matching scoring vectors.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 relative z-10">
                      <button
                        onClick={() => {
                          setNewResumeTitle('My Professional Resume');
                          setSelectedTmplId('template-classic');
                          setShowTemplateModal(true);
                        }}
                        className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Create Resume
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-5 py-3 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer"
                      >
                        <Upload className="w-4 h-4 text-indigo-400" /> Upload Document
                      </button>
                    </div>
                  </div>

                  {/* Bento Structure */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Block A: Core Stats Analytics (7 columns) */}
                    {systemStats && (
                      <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between gap-6">
                        <div>
                          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Performance Matrix</span>
                          <h3 className="font-extrabold text-slate-800 text-base mt-1">Portfolio Scoring Core</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                          {/* Radial Progress indicator */}
                          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100/80 text-center">
                            <div className="relative w-20 h-20 flex items-center justify-center">
                              <svg className="w-full h-full transform -rotate-90">
                                <circle cx="40" cy="40" r="34" className="stroke-slate-200" strokeWidth="6" fill="transparent" />
                                <circle
                                  cx="40"
                                  cy="40"
                                  r="34"
                                  className="stroke-indigo-600 transition-all duration-1000"
                                  strokeWidth="6"
                                  fill="transparent"
                                  strokeDasharray={213.6}
                                  strokeDashoffset={213.6 - (213.6 * systemStats.averageAtsScore) / 100}
                                  strokeLinecap="round"
                                />
                              </svg>
                              <span className="absolute text-base font-black text-slate-800">{systemStats.averageAtsScore}%</span>
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider mt-3">ATS Quality Mean</span>
                          </div>

                          {/* Stat item B */}
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/80 flex flex-col justify-between">
                            <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Active Portfolios</span>
                            <div className="mt-2">
                              <h4 className="text-3xl font-black text-slate-800">{resumesArr.length}</h4>
                              <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Fully Synced
                              </p>
                            </div>
                          </div>

                          {/* Stat item C */}
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/80 flex flex-col justify-between">
                            <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider">ATS Vector Scans</span>
                            <div className="mt-2">
                              <h4 className="text-3xl font-black text-indigo-600">{systemStats.totalHistory}</h4>
                              <p className="text-[10px] text-slate-400 mt-1 font-medium">NLP matching checks</p>
                            </div>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-100 pt-4 flex items-center gap-2">
                          <span className="inline-block w-2 h-2 bg-indigo-500 rounded-full animate-ping"></span>
                          <span><strong>Automatic Indexing Active:</strong> Resumes are continuously audited against HR compliance rules.</span>
                        </div>
                      </div>
                    )}

                    {/* Block B: Drag Drop Zone (5 columns) */}
                    <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Document Ingestion</span>
                        <h3 className="font-extrabold text-slate-800 text-base mt-1">High-Speed Parsing Hub</h3>
                      </div>

                      <div
                        id="drop-zone-bento"
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center transition flex flex-col items-center justify-center min-h-[120px] cursor-pointer mt-4 ${
                          isDragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/60'
                        }`}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {isParsingFile ? (
                          <div className="space-y-2">
                            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                            <p className="text-[11px] font-bold text-slate-700">Extracting content via spaCy & Gemini pipelines...</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Upload className="w-6 h-6 text-indigo-500 mx-auto mb-1" />
                            <p className="text-xs font-black text-slate-700">Drop resume files here</p>
                            <p className="text-[10px] text-slate-400">PDF, DOCX formats supported</p>
                          </div>
                        )}
                      </div>

                      <p className="text-[10px] text-slate-400 mt-3 text-center">
                        Heuristic structural decomposition reconstructs your candidate experiences.
                      </p>
                    </div>

                  </div>

                  {/* Portfolio Grid Section */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        Saved Candidate Portfolios
                      </h3>
                      <span className="text-xs text-slate-400 font-bold">{filteredResumes.length} total portfolios</span>
                    </div>

                    {filteredResumes.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                        <p className="text-slate-500 text-sm font-medium">No portfolios match your current search.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="resumes-grid-bento">
                        {filteredResumes.map(res => (
                          <div
                            key={res.id}
                            className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-lg transition flex flex-col justify-between space-y-4 relative group"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="px-2.5 py-1 bg-slate-100 rounded-md text-[9px] font-black text-slate-600 uppercase tracking-widest">
                                  {res.templateId.replace('template-', '')} style
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {res.atsScore !== undefined && (
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-tight ${
                                      res.atsScore >= 80 
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' 
                                        : res.atsScore >= 60 
                                          ? 'bg-amber-50 text-amber-700 border border-amber-150' 
                                          : 'bg-indigo-50 text-indigo-700 border border-indigo-150'
                                    }`} title={res.scoreType === 'ats' ? 'ATS Match Score' : 'Profile Completion Score'}>
                                      {res.scoreType === 'ats' ? 'ATS' : 'Complete'}: {res.atsScore}%
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400 font-mono font-bold">
                                    {formatLocalTimestamp(res.updatedAt)}
                                  </span>
                                </div>
                              </div>
                              <h4 className="font-extrabold text-slate-800 mt-3 text-base group-hover:text-indigo-600 transition line-clamp-1">{res.title}</h4>
                              <p className="text-xs text-slate-500 mt-1 font-bold">
                                {res.data.personalInfo.fullName || 'Unnamed Portfolio'}
                              </p>
                              <p className="text-[11px] text-slate-400 line-clamp-1">{res.data.personalInfo.title || 'No Title Selected'}</p>
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-slate-50">
                              <button
                                onClick={() => {
                                  setActiveResume(res);
                                  setCurrentView('builder');
                                }}
                                className="flex-grow py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-[11px] font-black transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Edit className="w-3 h-3" /> Edit
                              </button>
                              <button
                                onClick={() => {
                                  setActiveResume(res);
                                  setCurrentView('analyzer');
                                  setAnalysisResult(null);
                                }}
                                className="py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-black transition flex items-center justify-center gap-1 cursor-pointer"
                                title="Run ATS Score Evaluation"
                              >
                                <Sparkles className="w-3 h-3" /> Score
                              </button>
                              <button
                                onClick={() => {
                                  setActiveResume(res);
                                  handleViewHistory(res.id);
                                }}
                                className="py-2 px-2.5 border border-slate-150 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer"
                                title="View Version Logs"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteResume(res.id, e)}
                                className="py-2 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer"
                                title="Delete Document"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* ----------------- 2. ANALYTICAL DETAILED VIEW ----------------- */}
              {dashboardTemplate === 'analytical' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn" id="analytical-dashboard-view">
                  
                  {/* Left Column: Real-time Filters & Template Breakdown Charts (4 columns) */}
                  <div className="lg:col-span-4 space-y-6">
                    
                    {/* Filter Widget */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">Search & Filters</h3>
                        <p className="text-xs text-slate-400">Refine documents by keyword or design layouts</p>
                      </div>

                      <div className="space-y-3">
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                          <input
                            type="text"
                            value={dashSearchQuery}
                            onChange={(e) => setDashSearchQuery(e.target.value)}
                            placeholder="Search name, title, role..."
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Design Preset Filter</label>
                          <div className="flex flex-col gap-1.5 pt-1">
                            <button
                              onClick={() => setDashCategoryFilter('all')}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                                dashCategoryFilter === 'all' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <span>📁 All Templates</span>
                              <span className="text-[10px] bg-white px-2 py-0.5 rounded-md border font-bold text-slate-500">{resumesArr.length}</span>
                            </button>
                            <button
                              onClick={() => setDashCategoryFilter('template-classic')}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                                dashCategoryFilter === 'template-classic' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <span>🏛️ Classic Style</span>
                              <span className="text-[10px] bg-white px-2 py-0.5 rounded-md border font-bold text-slate-500">
                                {resumesArr.filter(r => r.templateId === 'template-classic').length}
                              </span>
                            </button>
                            <button
                              onClick={() => setDashCategoryFilter('template-software')}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                                dashCategoryFilter === 'template-software' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <span>💻 Tech & Software</span>
                              <span className="text-[10px] bg-white px-2 py-0.5 rounded-md border font-bold text-slate-500">
                                {resumesArr.filter(r => r.templateId === 'template-software').length}
                              </span>
                            </button>
                            <button
                              onClick={() => setDashCategoryFilter('template-minimal')}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                                dashCategoryFilter === 'template-minimal' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <span>🌱 Modern Clean</span>
                              <span className="text-[10px] bg-white px-2 py-0.5 rounded-md border font-bold text-slate-500">
                                {resumesArr.filter(r => r.templateId === 'template-minimal').length}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recharts Pie Chart in Analytical View */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">Template Distribution</h3>
                        <p className="text-xs text-slate-400">Layout distribution for recruitment strategies</p>
                      </div>

                      <div className="h-44 relative flex items-center justify-center">
                        {resumesArr.length === 0 ? (
                          <span className="text-xs text-slate-400">No layout analytics available.</span>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Classic', value: resumesArr.filter(r => r.templateId === 'template-classic').length },
                                  { name: 'Software', value: resumesArr.filter(r => r.templateId === 'template-software').length },
                                  { name: 'Minimal', value: resumesArr.filter(r => r.templateId === 'template-minimal').length },
                                ].filter(d => d.value > 0)}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={60}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                <Cell fill="#4f46e5" />
                                <Cell fill="#06b6d4" />
                                <Cell fill="#10b981" />
                              </Pie>
                              <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-lg font-black text-slate-800">{resumesArr.length}</span>
                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Active</span>
                        </div>
                      </div>

                      <div className="flex justify-center gap-4 text-[10px] font-bold text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-600"></span> Classic
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-cyan-500"></span> Tech
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Minimal
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Right Column: In-depth Interactive Tables (8 columns) */}
                  <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-base">Analytical Portfolio Table</h3>
                        <p className="text-xs text-slate-400">Detailed overview of active documents and editing states</p>
                      </div>
                      <button
                        onClick={() => {
                          setNewResumeTitle('My Professional Resume');
                          setSelectedTmplId('template-classic');
                          setShowTemplateModal(true);
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> Create Document
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="pb-3 font-black">Portfolio Title / Candidate</th>
                            <th className="pb-3 font-black">Layout Style</th>
                            <th className="pb-3 font-black">ATS Score / Completeness</th>
                            <th className="pb-3 font-black">Saved Date</th>
                            <th className="pb-3 font-black text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filteredResumes.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-xs text-slate-400 font-medium">
                                No records matching search filters.
                              </td>
                            </tr>
                          ) : (
                            filteredResumes.map(res => (
                              <tr key={res.id} className="group hover:bg-slate-50/50 transition">
                                <td className="py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-700 font-black text-xs">
                                      {(res.title || 'R')[0].toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="text-xs font-extrabold text-slate-800 group-hover:text-indigo-600 transition">{res.title}</p>
                                      <p className="text-[10px] text-slate-400 font-bold">{res.data.personalInfo.fullName || 'Anonymous Candidate'}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4">
                                  <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[9px] font-black text-slate-600 uppercase tracking-widest">
                                    {res.templateId.replace('template-', '')}
                                  </span>
                                </td>
                                <td className="py-4">
                                  {res.atsScore !== undefined ? (
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono border ${
                                        res.atsScore >= 80 
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-150' 
                                          : res.atsScore >= 60 
                                            ? 'bg-amber-50 text-amber-700 border-amber-150' 
                                            : 'bg-indigo-50 text-indigo-700 border-indigo-150'
                                      }`}>
                                        {res.atsScore}%
                                      </span>
                                      <span className="text-[9px] text-slate-400 uppercase font-black tracking-tight">
                                        {res.scoreType === 'ats' ? 'ATS Match' : 'Complete'}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-mono">-</span>
                                  )}
                                </td>
                                <td className="py-4 text-[10px] text-slate-500 font-mono font-semibold">
                                  {formatLocalTimestamp(res.updatedAt)}
                                </td>
                                <td className="py-4 text-right">
                                  <div className="inline-flex gap-1.5">
                                    <button
                                      onClick={() => {
                                        setActiveResume(res);
                                        setCurrentView('builder');
                                      }}
                                      className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md transition cursor-pointer"
                                      title="Edit Document"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setActiveResume(res);
                                        setCurrentView('analyzer');
                                        setAnalysisResult(null);
                                      }}
                                      className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md transition cursor-pointer"
                                      title="ATS Optimization Score"
                                    >
                                      <Sparkles className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setActiveResume(res);
                                        handleViewHistory(res.id);
                                      }}
                                      className="p-1.5 border border-slate-150 hover:bg-slate-50 text-slate-600 rounded-md transition cursor-pointer"
                                      title="Revision History"
                                    >
                                      <History className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => handleDeleteResume(res.id, e)}
                                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md transition cursor-pointer"
                                      title="Delete Document"
                                    >
                                      <Trash className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span>Showing {filteredResumes.length} of {resumesArr.length} portfolios</span>
                      <span className="text-indigo-600 font-bold">Heuristic Index Engine Running</span>
                    </div>
                  </div>

                </div>
              )}

              {/* ----------------- 3. MINIMALIST TYPOGRAPHY VIEW ----------------- */}
              {dashboardTemplate === 'minimalist' && (
                <div className="space-y-8 animate-fadeIn" id="minimalist-dashboard-view">
                  
                  {/* Clean minimal metadata line */}
                  <div className="border-b border-slate-150 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div className="space-y-1">
                      <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">Resume Dashboard</h1>
                      <p className="text-xs text-slate-500 font-mono">
                        Active session: {user?.email || 'Guest Developer'}  •  Storage: Local Fail-safe Mode
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setNewResumeTitle('My Professional Resume');
                          setSelectedTmplId('template-classic');
                          setShowTemplateModal(true);
                        }}
                        className="px-4 py-2 border border-slate-800 hover:bg-slate-900 hover:text-white rounded-lg text-xs font-mono font-bold transition cursor-pointer text-slate-800"
                      >
                        [+ Create New]
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-mono transition cursor-pointer"
                      >
                        [Upload Document]
                      </button>
                    </div>
                  </div>

                  {/* Clean compact stats metrics bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-mono uppercase">Resumes</span>
                      <p className="text-base font-bold font-mono text-slate-900">{resumes.length}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-mono uppercase">Mean ATS Accuracy</span>
                      <p className="text-base font-bold font-mono text-slate-900">{systemStats?.averageAtsScore || 0}%</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-mono uppercase">Total Vectors Scanned</span>
                      <p className="text-base font-bold font-mono text-slate-900">{systemStats?.totalHistory || 0}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-mono uppercase">Layout Status</span>
                      <p className="text-base font-bold font-mono text-emerald-600">Stable</p>
                    </div>
                  </div>

                  {/* Clean Minimalist List */}
                  <div className="space-y-4">
                    <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Indexed Files</span>
                    
                    {filteredResumes.length === 0 ? (
                      <div className="py-12 border border-dashed border-slate-200 text-center rounded-lg">
                        <span className="text-xs text-slate-400 font-mono">No documents registered.</span>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl bg-white overflow-hidden shadow-xs">
                        {filteredResumes.map(res => (
                          <div
                            key={res.id}
                            className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 transition"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-slate-800 text-sm">{res.title}</h4>
                                <span className="text-[9px] px-1.5 py-0.5 bg-slate-150 rounded text-slate-600 font-mono tracking-tighter">
                                  {res.templateId.replace('template-', '')}
                                </span>
                                {res.atsScore !== undefined && (
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black font-mono border ${
                                    res.atsScore >= 80 
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                      : res.atsScore >= 60 
                                        ? 'bg-amber-50 text-amber-700 border-amber-100' 
                                        : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                  }`}>
                                    {res.scoreType === 'ats' ? 'ATS' : 'Complete'}: {res.atsScore}%
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">
                                {res.data.personalInfo.fullName || 'Anonymous'} • {res.data.personalInfo.title || 'Untitled Profile'}
                              </p>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                Updated: {new Date(res.updatedAt).toLocaleDateString()}
                              </span>
                            </div>

                            <div className="flex gap-4 text-xs font-mono font-bold pt-2 sm:pt-0">
                              <button
                                onClick={() => {
                                  setActiveResume(res);
                                  setCurrentView('builder');
                                }}
                                className="text-slate-700 hover:text-indigo-600 transition cursor-pointer"
                              >
                                [Edit]
                              </button>
                              <button
                                onClick={() => {
                                  setActiveResume(res);
                                  setCurrentView('analyzer');
                                  setAnalysisResult(null);
                                }}
                                className="text-slate-700 hover:text-indigo-600 transition cursor-pointer"
                              >
                                [Score]
                              </button>
                              <button
                                onClick={() => {
                                  setActiveResume(res);
                                  handleViewHistory(res.id);
                                }}
                                className="text-slate-500 hover:text-indigo-600 transition cursor-pointer"
                              >
                                [Logs]
                              </button>
                              <button
                                onClick={(e) => handleDeleteResume(res.id, e)}
                                className="text-rose-600 hover:text-rose-800 transition cursor-pointer"
                              >
                                [Delete]
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          );
        })()}

        {/* --- 3. RESUME BUILDER WORKSPACE --- */}
        {currentView === 'builder' && activeResume && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="panel-builder">
            
            {/* BUILDER SIDEBAR: 5 Columns */}
            <div className="lg:col-span-5 space-y-6" id="builder-forms-column">
              
              {/* SAVED RESUME META TITLE */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div className="flex-grow">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Resume Name</label>
                  <input
                    id="input-resume-title"
                    type="text"
                    value={activeResume.title}
                    onChange={(e) => {
                      const updated = { ...activeResume, title: e.target.value };
                      setActiveResume(updated);
                      handleUpdateResume(updated);
                    }}
                    className="font-extrabold text-slate-800 text-lg border-b border-dashed border-slate-200 hover:border-slate-400 focus:border-indigo-500 focus:ring-0 outline-none w-full"
                  />
                </div>
                <div className="flex items-center gap-2 pl-3">
                  <button
                    id="btn-manual-save"
                    type="button"
                    onClick={() => {
                      handleUpdateResume(activeResume);
                      showToast(`Saved "${activeResume.title}" to MongoDB successfully!`, 'success');
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    <Check className="w-3.5 h-3.5" /> Save Resume
                  </button>
                  <button
                    id="btn-builder-qr"
                    type="button"
                    onClick={generateContactQRCode}
                    className="p-2 border border-slate-100 hover:bg-slate-50 text-slate-600 rounded-xl transition cursor-pointer"
                    title="Generate Smartphone Contact QR Code"
                  >
                    <QrCode className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* STYLING & CUSTOMIZATION BOARD */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="font-extrabold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <Settings className="w-4 h-4 text-indigo-600" /> Styles & Layout
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* FONT SELECTOR */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Typography</label>
                    <select
                      id="select-font"
                      value={activeResume.customization.fontFamily}
                      onChange={(e) => {
                        const updated = {
                          ...activeResume,
                          customization: { ...activeResume.customization, fontFamily: e.target.value }
                        };
                        setActiveResume(updated);
                        handleUpdateResume(updated);
                      }}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      {FONTS.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* FONT SIZE */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Scale Size</label>
                    <select
                      id="select-font-size"
                      value={activeResume.customization.fontSize}
                      onChange={(e) => {
                        const updated = {
                          ...activeResume,
                          customization: { ...activeResume.customization, fontSize: e.target.value as any }
                        };
                        setActiveResume(updated);
                        handleUpdateResume(updated);
                      }}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="sm">Compact (Small)</option>
                      <option value="base">Standard (Normal)</option>
                      <option value="lg">Expanded (Large)</option>
                    </select>
                  </div>
                </div>

                {/* TEMPLATE CARD CAROUSEL */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Resume Templates</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2">
                    {[
                      { id: 'template-classic', label: 'Classic Pro' },
                      { id: 'template-modern', label: 'Modern Split' },
                      { id: 'template-minimal', label: 'B&W Minimal' },
                      { id: 'template-creative', label: 'Creative' },
                      { id: 'template-software', label: 'Software Eng' },
                      { id: 'template-ml', label: 'ML Eng' },
                      { id: 'template-dataci', label: 'Data Sci' },
                      { id: 'template-executive', label: 'Executive Leader' },
                      { id: 'template-academic', label: 'Academic Scholar' },
                      { id: 'template-startup', label: 'Bold Startup' },
                      { id: 'template-elegant', label: 'Elegant Editorial' }
                    ].map(t => (
                      <button
                        id={`btn-temp-select-${t.id}`}
                        key={t.id}
                        onClick={() => {
                          const updated = { ...activeResume, templateId: t.id };
                          setActiveResume(updated);
                          handleUpdateResume(updated);
                          showToast(`Applied ${t.label} Layout!`, 'success');
                        }}
                        className={`p-2.5 rounded-xl border text-[11px] font-extrabold text-center transition ${
                          activeResume.templateId === t.id
                            ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700'
                            : 'border-slate-100 bg-slate-50/50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* COLOR PRESETS */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Color Palette Theme</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLOR_THEMES.map(theme => (
                      <button
                        id={`btn-color-theme-${theme.name}`}
                        key={theme.name}
                        onClick={() => {
                          const updated = {
                            ...activeResume,
                            customization: { ...activeResume.customization, colorTheme: theme.hex }
                          };
                          setActiveResume(updated);
                          handleUpdateResume(updated);
                        }}
                        className={`w-6 h-6 rounded-full border border-slate-200 cursor-pointer ${theme.class} ${
                          activeResume.customization.colorTheme === theme.hex ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
                        }`}
                        title={theme.name}
                      />
                    ))}
                  </div>
                </div>

                {/* PARENT SECTION ORDER REORGANIZATION */}
                <div className="border-t border-slate-100 pt-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Section Layout Hierarchy</label>
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {activeResume.customization.sectionOrder.map((secName: string, idx: number) => (
                      <div key={secName} className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg text-xs font-semibold text-slate-700">
                        <span className="capitalize">{secName === 'personalInfo' ? 'Header / Contacts' : secName}</span>
                        <div className="flex items-center gap-1">
                          <button
                            id={`btn-sec-up-${secName}`}
                            disabled={idx === 0}
                            onClick={() => moveParentSection(idx, 'up')}
                            className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            id={`btn-sec-down-${secName}`}
                            disabled={idx === activeResume.customization.sectionOrder.length - 1}
                            onClick={() => moveParentSection(idx, 'down')}
                            className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CORE RESUME DATA FORMS */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-6 max-h-[600px] overflow-y-auto pr-2">
                <h3 className="font-extrabold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <Layout className="w-4 h-4 text-indigo-600" /> Resume Content Modules
                </h3>

                {/* 1. PERSONAL INFORMATION */}
                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl">
                  <h4 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-500" /> Personal Details
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Full Name</label>
                      <input
                        id="input-pi-name"
                        type="text"
                        value={activeResume.data.personalInfo.fullName}
                        onChange={(e) => updatePersonalInfoField('fullName', e.target.value)}
                        className="w-full text-xs p-2 bg-white border rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Target Job Title</label>
                      <input
                        id="input-pi-title"
                        type="text"
                        placeholder="e.g. Senior Software Engineer"
                        value={activeResume.data.personalInfo.title}
                        onChange={(e) => updatePersonalInfoField('title', e.target.value)}
                        className="w-full text-xs p-2 bg-white border rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Email</label>
                      <input
                        id="input-pi-email"
                        type="email"
                        value={activeResume.data.personalInfo.email}
                        onChange={(e) => updatePersonalInfoField('email', e.target.value)}
                        className="w-full text-xs p-2 bg-white border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Phone</label>
                      <input
                        id="input-pi-phone"
                        type="text"
                        value={activeResume.data.personalInfo.phone}
                        onChange={(e) => updatePersonalInfoField('phone', e.target.value)}
                        className="w-full text-xs p-2 bg-white border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Location</label>
                      <input
                        id="input-pi-location"
                        type="text"
                        value={activeResume.data.personalInfo.location}
                        onChange={(e) => updatePersonalInfoField('location', e.target.value)}
                        className="w-full text-xs p-2 bg-white border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Portfolio Website</label>
                      <input
                        id="input-pi-web"
                        type="text"
                        value={activeResume.data.personalInfo.website}
                        onChange={(e) => updatePersonalInfoField('website', e.target.value)}
                        className="w-full text-xs p-2 bg-white border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">GitHub Profile</label>
                      <input
                        id="input-pi-gh"
                        type="text"
                        placeholder="https://github.com/..."
                        value={activeResume.data.personalInfo.github}
                        onChange={(e) => updatePersonalInfoField('github', e.target.value)}
                        className="w-full text-xs p-2 bg-white border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">LinkedIn Profile</label>
                      <input
                        id="input-pi-li"
                        type="text"
                        placeholder="https://linkedin.com/in/..."
                        value={activeResume.data.personalInfo.linkedin}
                        onChange={(e) => updatePersonalInfoField('linkedin', e.target.value)}
                        className="w-full text-xs p-2 bg-white border rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Professional Summary</label>
                    <textarea
                      id="textarea-pi-summary"
                      rows={3}
                      value={activeResume.data.personalInfo.summary}
                      onChange={(e) => updatePersonalInfoField('summary', e.target.value)}
                      className="w-full text-xs p-2 bg-white border rounded-lg resize-y outline-none"
                    />
                  </div>
                </div>

                {/* 2. SKILLS (TECHNICAL & SOFT) */}
                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl">
                  <h4 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-500" /> Core Competencies & Skills
                  </h4>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Technical / Tech Skills (Comma Separated)</label>
                    <input
                      id="input-skills-tech"
                      type="text"
                      placeholder="React, Node.js, Python..."
                      value={activeResume.data.skills.technical.join(', ')}
                      onChange={(e) => {
                        const list = e.target.value.split(',').map(s => s.trim().toUpperCase()).filter(s => s.length > 0);
                        const updated = { ...activeResume };
                        updated.data.skills.technical = list;
                        setActiveResume(updated);
                        handleUpdateResume(updated);
                      }}
                      className="w-full text-xs p-2.5 bg-white border rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Soft / Interpersonal Skills (Comma Separated)</label>
                    <input
                      id="input-skills-soft"
                      type="text"
                      placeholder="Communication, Teamwork, Leadership..."
                      value={activeResume.data.skills.soft.join(', ')}
                      onChange={(e) => {
                        const list = e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
                        const updated = { ...activeResume };
                        updated.data.skills.soft = list;
                        setActiveResume(updated);
                        handleUpdateResume(updated);
                      }}
                      className="w-full text-xs p-2.5 bg-white border rounded-lg outline-none"
                    />
                  </div>
                </div>

                {/* 3. WORK EXPERIENCE MODULE */}
                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-indigo-500" /> Work Experience
                    </h4>
                    <button
                      id="btn-add-experience"
                      onClick={() => {
                        const updated = { ...activeResume };
                        updated.data.experience.push({
                          id: 'exp-' + generateId(),
                          company: 'New Company',
                          position: 'Job Title',
                          location: '',
                          startDate: '2023-01',
                          endDate: 'Present',
                          current: true,
                          description: 'Added standard accomplishment details.'
                        });
                        setActiveResume(updated);
                        handleUpdateResume(updated);
                      }}
                      className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Role
                    </button>
                  </div>

                  <div className="space-y-3">
                    {activeResume.data.experience.map((exp: any, index: number) => (
                      <div key={exp.id} className="p-3 bg-white rounded-xl border border-slate-100 space-y-2 relative">
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          <button
                            id={`btn-exp-up-${exp.id}`}
                            onClick={() => reorderSection('experience', index, 'up')}
                            disabled={index === 0}
                            className="p-1 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded disabled:opacity-35"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            id={`btn-exp-down-${exp.id}`}
                            onClick={() => reorderSection('experience', index, 'down')}
                            disabled={index === activeResume.data.experience.length - 1}
                            className="p-1 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded disabled:opacity-35"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            id={`btn-exp-del-${exp.id}`}
                            onClick={() => {
                              const updated = { ...activeResume };
                              updated.data.experience = updated.data.experience.filter((e: any) => e.id !== exp.id);
                              setActiveResume(updated);
                              handleUpdateResume(updated);
                            }}
                            className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded"
                          >
                            <Trash className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pr-20">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Company</label>
                            <input
                              id={`input-exp-comp-${exp.id}`}
                              type="text"
                              value={exp.company}
                              onChange={(e) => updateExperienceField(index, 'company', e.target.value)}
                              className="w-full text-xs p-1.5 border rounded"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Position</label>
                            <input
                              id={`input-exp-pos-${exp.id}`}
                              type="text"
                              value={exp.position}
                              onChange={(e) => updateExperienceField(index, 'position', e.target.value)}
                              className="w-full text-xs p-1.5 border rounded"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Dates</label>
                            <input
                              id={`input-exp-date-${exp.id}`}
                              type="text"
                              placeholder="e.g. 2022-01 - Present"
                              value={exp.startDate + ' - ' + exp.endDate}
                              onChange={(e) => {
                                const [start, ...endParts] = e.target.value.split('-');
                                const end = endParts.join('-').trim();
                                const updated = {
                                  ...activeResume,
                                  data: {
                                    ...activeResume.data,
                                    experience: activeResume.data.experience.map((item: any, i: number) => 
                                      i === index ? { ...item, startDate: start.trim(), endDate: end } : item
                                    )
                                  }
                                };
                                setActiveResume(updated);
                                handleUpdateResume(updated);
                              }}
                              className="w-full text-xs p-1.5 border rounded"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Location</label>
                            <input
                              id={`input-exp-loc-${exp.id}`}
                              type="text"
                              value={exp.location}
                              onChange={(e) => updateExperienceField(index, 'location', e.target.value)}
                              className="w-full text-xs p-1.5 border rounded"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block">Roles & Accomplishments</label>
                          <textarea
                            id={`textarea-exp-desc-${exp.id}`}
                            rows={3}
                            value={exp.description}
                            onChange={(e) => updateExperienceField(index, 'description', e.target.value)}
                            className="w-full text-xs p-2 border rounded resize-y outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. EDUCATION SEGMENT */}
                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-indigo-500" /> Education Background
                    </h4>
                    <button
                      id="btn-add-education"
                      onClick={() => {
                        const updated = { ...activeResume };
                        updated.data.education.push({
                          id: 'edu-' + generateId(),
                          institution: 'Institution Name',
                          degree: 'Degree',
                          fieldOfStudy: 'Field',
                          startDate: '2020',
                          endDate: '2024'
                        });
                        setActiveResume(updated);
                        handleUpdateResume(updated);
                      }}
                      className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add College
                    </button>
                  </div>

                  <div className="space-y-3">
                    {activeResume.data.education.map((edu: any, index: number) => (
                      <div key={edu.id} className="p-3 bg-white rounded-xl border border-slate-100 space-y-2 relative">
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          <button
                            id={`btn-edu-del-${edu.id}`}
                            onClick={() => {
                              const updated = { ...activeResume };
                              updated.data.education = updated.data.education.filter((e: any) => e.id !== edu.id);
                              setActiveResume(updated);
                              handleUpdateResume(updated);
                            }}
                            className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded"
                          >
                            <Trash className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pr-10">
                          <div>
                            <input
                              id={`input-edu-inst-${edu.id}`}
                              type="text"
                              placeholder="Institution"
                              value={edu.institution}
                              onChange={(e) => updateEducationField(index, 'institution', e.target.value)}
                              className="w-full text-xs p-1.5 border rounded"
                            />
                          </div>
                          <div>
                            <input
                              id={`input-edu-deg-${edu.id}`}
                              type="text"
                              placeholder="Degree & Major"
                              value={edu.degree + ' in ' + edu.fieldOfStudy}
                              onChange={(e) => {
                                const [degree, ...fieldParts] = e.target.value.split(' in ');
                                const fieldOfStudy = fieldParts.join(' in ').trim();
                                const updated = {
                                  ...activeResume,
                                  data: {
                                    ...activeResume.data,
                                    education: activeResume.data.education.map((item: any, i: number) => 
                                      i === index ? { ...item, degree: degree.trim(), fieldOfStudy: fieldOfStudy } : item
                                    )
                                  }
                                };
                                setActiveResume(updated);
                                handleUpdateResume(updated);
                              }}
                              className="w-full text-xs p-1.5 border rounded"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. PROJECTS PORTFOLIO */}
                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-indigo-500" /> Key Projects
                    </h4>
                    <button
                      id="btn-add-project"
                      onClick={() => {
                        const updated = { ...activeResume };
                        updated.data.projects.push({
                          id: 'proj-' + generateId(),
                          title: 'New Project',
                          role: 'Developer',
                          technologies: 'React, Node',
                          description: 'Core developer details.'
                        });
                        setActiveResume(updated);
                        handleUpdateResume(updated);
                      }}
                      className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Project
                    </button>
                  </div>

                  <div className="space-y-3">
                    {activeResume.data.projects.map((proj: any, index: number) => (
                      <div key={proj.id} className="p-3 bg-white rounded-xl border border-slate-100 space-y-2 relative">
                        <div className="absolute top-2 right-2">
                          <button
                            id={`btn-proj-del-${proj.id}`}
                            onClick={() => {
                              const updated = { ...activeResume };
                              updated.data.projects = updated.data.projects.filter((p: any) => p.id !== proj.id);
                              setActiveResume(updated);
                              handleUpdateResume(updated);
                            }}
                            className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded"
                          >
                            <Trash className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="space-y-2 pr-10">
                          <input
                            id={`input-proj-title-${proj.id}`}
                            type="text"
                            placeholder="Project Title"
                            value={proj.title}
                            onChange={(e) => updateProjectField(index, 'title', e.target.value)}
                            className="w-full text-xs p-1.5 border rounded"
                          />
                          <input
                            id={`input-proj-tech-${proj.id}`}
                            type="text"
                            placeholder="Technologies used (React, AWS...)"
                            value={proj.technologies}
                            onChange={(e) => updateProjectField(index, 'technologies', e.target.value)}
                            className="w-full text-xs p-1.5 border rounded"
                          />
                          <textarea
                            id={`textarea-proj-desc-${proj.id}`}
                            rows={2}
                            placeholder="Description"
                            value={proj.description}
                            onChange={(e) => updateProjectField(index, 'description', e.target.value)}
                            className="w-full text-xs p-1.5 border rounded resize-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* LIVE PREVIEW: 7 Columns */}
            <div className="lg:col-span-7 flex flex-col space-y-4" id="builder-preview-column">
              <div className="bg-slate-900 px-4 py-3 rounded-2xl flex items-center justify-between text-white shadow-md print:hidden">
                <span className="text-xs font-mono tracking-wider uppercase text-indigo-400">⚡ Live ATS-Ready Output Preview</span>
                <div className="flex gap-2">
                  <button
                    id="btn-download-pdf"
                    type="button"
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer text-white shadow-xs disabled:opacity-50"
                  >
                    {isGeneratingPDF ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Compiling A4 PDF...
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" /> Download PDF
                      </>
                    )}
                  </button>
                  <button
                    id="btn-print-resume"
                    type="button"
                    onClick={handlePrint}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer text-slate-200"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print
                  </button>
                </div>
              </div>

              {/* DYNAMIC TEMPLATE CONTAINER CANVAS */}
              <div
                id="resume-print-area"
                className={`bg-white border rounded-2xl p-6 sm:p-10 shadow-xl overflow-hidden print:border-none print:shadow-none print:p-0 ${
                  activeResume.customization.fontSize === 'sm' ? 'text-xs' :
                  activeResume.customization.fontSize === 'lg' ? 'text-lg' :
                  'text-sm'
                }`}
              >
                                {/* RENDER THE SELECTED LAYOUT TEMPLATE */}
                {(() => {
                  const data = activeResume.data || {};
                  const themeColor = activeResume.customization?.colorTheme || '#1e293b';
                  const sectionOrder = activeResume.customization?.sectionOrder || ['personalInfo', 'experience', 'projects', 'education', 'skills', 'certifications', 'languages'];

                  const renderClassicSection = (secName: string) => {
                    switch (secName) {
                      case 'personalInfo':
                        if (!data.personalInfo?.summary) return null;
                        return (
                          <div key="profile" className="space-y-1.5">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider border-b pb-1" style={{ color: themeColor, borderColor: `${themeColor}33` }}>Professional Profile</h3>
                            <p className="text-slate-600 leading-relaxed text-justify text-xs">{data.personalInfo.summary}</p>
                          </div>
                        );
                      case 'experience':
                        if (!data.experience || data.experience.length === 0) return null;
                        return (
                          <div key="experience" className="space-y-3">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider border-b pb-1" style={{ color: themeColor, borderColor: `${themeColor}33` }}>Professional History</h3>
                            <div className="space-y-3.5">
                              {data.experience.map((exp: any) => (
                                <div key={exp.id} className="space-y-1">
                                  <div className="flex justify-between items-start text-xs">
                                    <div>
                                      <strong className="font-bold text-slate-800 text-[12px]">{exp.position}</strong> • <span className="italic text-slate-600 font-medium">{exp.company}</span>
                                      {exp.location && <span className="text-slate-400 text-[10px] ml-2">({exp.location})</span>}
                                    </div>
                                    <span className="text-slate-500 font-semibold text-[10px] whitespace-nowrap">{exp.startDate} - {exp.endDate}</span>
                                  </div>
                                  <p className="text-slate-600 leading-relaxed whitespace-pre-line text-xs pl-2.5 border-l border-slate-100">{exp.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      case 'projects':
                        if (!data.projects || data.projects.length === 0) return null;
                        return (
                          <div key="projects" className="space-y-3">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider border-b pb-1" style={{ color: themeColor, borderColor: `${themeColor}33` }}>Key Projects</h3>
                            <div className="space-y-3.5">
                              {data.projects.map((proj: any) => (
                                <div key={proj.id} className="space-y-1 text-xs">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <strong className="font-bold text-slate-800 text-[12px]">{proj.title}</strong>
                                      {proj.role && <span className="text-slate-500 italic ml-1">({proj.role})</span>}
                                    </div>
                                    {proj.link && (
                                      <a href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-[10px] font-mono">
                                        {proj.link}
                                      </a>
                                    )}
                                  </div>
                                  {proj.technologies && (
                                    <div className="text-[10px] text-indigo-600 font-mono font-medium">
                                      Technologies: {proj.technologies}
                                    </div>
                                  )}
                                  <p className="text-slate-600 leading-relaxed text-xs pl-2.5 border-l border-slate-100">{proj.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      case 'education':
                        if (!data.education || data.education.length === 0) return null;
                        return (
                          <div key="education" className="space-y-3">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider border-b pb-1" style={{ color: themeColor, borderColor: `${themeColor}33` }}>Education</h3>
                            <div className="space-y-3">
                              {data.education.map((edu: any) => (
                                <div key={edu.id} className="space-y-1 text-xs">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <strong className="font-bold text-slate-800 text-[12px]">{edu.degree} in {edu.fieldOfStudy}</strong> • <span className="text-slate-600 italic font-medium">{edu.institution}</span>
                                    </div>
                                    <span className="text-slate-500 font-semibold text-[10px] whitespace-nowrap">{edu.startDate} - {edu.endDate}</span>
                                  </div>
                                  {edu.grade && <div className="text-[10px] text-slate-500 font-semibold">GPA / Academic Standing: {edu.grade}</div>}
                                  {edu.description && <p className="text-slate-500 leading-relaxed text-xs pl-2.5 border-l border-slate-100">{edu.description}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      case 'skills':
                        const hasTech = data.skills?.technical && data.skills.technical.length > 0;
                        const hasSoft = data.skills?.soft && data.skills.soft.length > 0;
                        if (!hasTech && !hasSoft) return null;
                        return (
                          <div key="skills" className="space-y-2">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider border-b pb-1" style={{ color: themeColor, borderColor: `${themeColor}33` }}>Skills & Expertise</h3>
                            <div className="space-y-2 text-xs">
                              {hasTech && (
                                <p className="text-slate-600 leading-relaxed">
                                  <strong className="text-slate-800 uppercase tracking-wider text-[10px]">Technical Toolkit:</strong> {data.skills.technical.join(', ')}
                                </p>
                              )}
                              {hasSoft && (
                                <p className="text-slate-600 leading-relaxed">
                                  <strong className="text-slate-800 uppercase tracking-wider text-[10px]">Professional & Soft Skills:</strong> {data.skills.soft.join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      case 'certifications':
                        if (!data.certifications || data.certifications.length === 0) return null;
                        return (
                          <div key="certifications" className="space-y-2.5">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider border-b pb-1" style={{ color: themeColor, borderColor: `${themeColor}33` }}>Certifications</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              {data.certifications.map((cert: any) => (
                                <div key={cert.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                                  <div>
                                    <div className="font-extrabold text-slate-800 text-[11px]">{cert.name}</div>
                                    <div className="text-slate-500 text-[10px]">{cert.issuer}</div>
                                  </div>
                                  {cert.date && <div className="text-slate-400 text-[10px] font-mono">{cert.date}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      case 'languages':
                        if (!data.languages || data.languages.length === 0) return null;
                        return (
                          <div key="languages" className="space-y-2">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider border-b pb-1" style={{ color: themeColor, borderColor: `${themeColor}33` }}>Languages</h3>
                            <div className="flex flex-wrap gap-4 text-xs">
                              {data.languages.map((lang: any) => (
                                <div key={lang.id} className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-800">{lang.name}:</span>
                                  <span className="text-slate-500 italic">{lang.proficiency}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      default:
                        return null;
                    }
                  };

                  const renderMinimalSection = (secName: string) => {
                    switch (secName) {
                      case 'personalInfo':
                        if (!data.personalInfo?.summary) return null;
                        return (
                          <div key="profile" className="space-y-1.5 font-serif">
                            <h3 className="text-[10px] font-black uppercase tracking-widest border-b border-black pb-0.5">Summary / Professional Objective</h3>
                            <p className="text-slate-800 leading-relaxed text-justify text-xs">{data.personalInfo.summary}</p>
                          </div>
                        );
                      case 'experience':
                        if (!data.experience || data.experience.length === 0) return null;
                        return (
                          <div key="experience" className="space-y-3.5 font-serif">
                            <h3 className="text-[10px] font-black uppercase tracking-widest border-b border-black pb-0.5">Experience History</h3>
                            <div className="space-y-3.5">
                              {data.experience.map((exp: any) => (
                                <div key={exp.id} className="space-y-1">
                                  <div className="flex justify-between items-baseline text-xs font-bold text-black">
                                    <span>{exp.position} — {exp.company} {exp.location ? `(${exp.location})` : ''}</span>
                                    <span className="font-normal text-slate-600 font-sans text-[10px] whitespace-nowrap">{exp.startDate} – {exp.endDate}</span>
                                  </div>
                                  <p className="text-slate-700 leading-relaxed text-xs whitespace-pre-line pl-2.5">{exp.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      case 'projects':
                        if (!data.projects || data.projects.length === 0) return null;
                        return (
                          <div key="projects" className="space-y-3.5 font-serif">
                            <h3 className="text-[10px] font-black uppercase tracking-widest border-b border-black pb-0.5">Key Initiatives</h3>
                            <div className="space-y-3.5">
                              {data.projects.map((proj: any) => (
                                <div key={proj.id} className="space-y-1">
                                  <div className="flex justify-between items-baseline text-xs font-bold text-black">
                                    <span>{proj.title} {proj.role ? `— ${proj.role}` : ''}</span>
                                    {proj.link && <span className="font-normal text-indigo-800 font-sans text-[10px] underline break-all">{proj.link}</span>}
                                  </div>
                                  {proj.technologies && <div className="text-[9px] text-slate-500 font-mono tracking-wider font-semibold">Technologies: {proj.technologies}</div>}
                                  <p className="text-slate-700 leading-relaxed text-xs pl-2.5">{proj.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      case 'education':
                        if (!data.education || data.education.length === 0) return null;
                        return (
                          <div key="education" className="space-y-3 font-serif">
                            <h3 className="text-[10px] font-black uppercase tracking-widest border-b border-black pb-0.5">Education Overview</h3>
                            <div className="space-y-3">
                              {data.education.map((edu: any) => (
                                <div key={edu.id} className="space-y-1">
                                  <div className="flex justify-between items-baseline text-xs font-bold text-black">
                                    <span>{edu.degree} in {edu.fieldOfStudy} — {edu.institution}</span>
                                    <span className="font-normal text-slate-600 font-sans text-[10px] whitespace-nowrap">{edu.startDate} – {edu.endDate}</span>
                                  </div>
                                  {edu.grade && <div className="text-[10px] text-slate-600">Grade Point Average: {edu.grade}</div>}
                                  {edu.description && <p className="text-slate-600 text-xs pl-2.5 leading-relaxed">{edu.description}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      case 'skills':
                        const hasTechM = data.skills?.technical && data.skills.technical.length > 0;
                        const hasSoftM = data.skills?.soft && data.skills.soft.length > 0;
                        if (!hasTechM && !hasSoftM) return null;
                        return (
                          <div key="skills" className="space-y-2 font-serif">
                            <h3 className="text-[10px] font-black uppercase tracking-widest border-b border-black pb-0.5">Expertise Matrix</h3>
                            <div className="space-y-1.5 text-xs">
                              {hasTechM && <p className="text-slate-800"><strong className="text-black uppercase text-[10px] font-sans tracking-widest">Technologies:</strong> {data.skills.technical.join(', ')}</p>}
                              {hasSoftM && <p className="text-slate-800"><strong className="text-black uppercase text-[10px] font-sans tracking-widest">Core Skills:</strong> {data.skills.soft.join(', ')}</p>}
                            </div>
                          </div>
                        );
                      case 'certifications':
                        if (!data.certifications || data.certifications.length === 0) return null;
                        return (
                          <div key="certifications" className="space-y-2 font-serif">
                            <h3 className="text-[10px] font-black uppercase tracking-widest border-b border-black pb-0.5">Certifications & Credentials</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                              {data.certifications.map((cert: any) => (
                                <div key={cert.id} className="flex justify-between items-baseline py-0.5 border-b border-slate-100">
                                  <span className="font-bold text-black">{cert.name} <span className="font-normal text-slate-500 font-sans text-[9px]">({cert.issuer})</span></span>
                                  {cert.date && <span className="text-slate-500 font-sans text-[10px] whitespace-nowrap">{cert.date}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      case 'languages':
                        if (!data.languages || data.languages.length === 0) return null;
                        return (
                          <div key="languages" className="space-y-2 font-serif">
                            <h3 className="text-[10px] font-black uppercase tracking-widest border-b border-black pb-0.5">Languages</h3>
                            <div className="flex flex-wrap gap-x-6 text-xs pt-0.5">
                              {data.languages.map((lang: any) => (
                                <div key={lang.id} className="flex items-center gap-1">
                                  <strong className="text-black font-bold">{lang.name}:</strong>
                                  <span className="text-slate-600 italic">{lang.proficiency}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      default:
                        return null;
                    }
                  };

                  const renderSoftwareSection = (secName: string) => {
                    const isML = activeResume.templateId === 'template-ml';
                    const isDS = activeResume.templateId === 'template-dataci';
                    
                    switch (secName) {
                      case 'personalInfo':
                        if (!data.personalInfo?.summary) return null;
                        return (
                          <div key="profile" className="space-y-1.5 font-mono">
                            <h3 className="font-bold uppercase text-indigo-600 border-b border-slate-100 pb-0.5">01 // Profile Summary</h3>
                            <p className="text-slate-700 leading-relaxed text-justify text-xs">{data.personalInfo.summary}</p>
                          </div>
                        );
                      case 'skills':
                        const hasTechS = data.skills?.technical && data.skills.technical.length > 0;
                        const hasSoftS = data.skills?.soft && data.skills.soft.length > 0;
                        if (!hasTechS && !hasSoftS) return null;
                        return (
                          <div key="skills" className="space-y-2 font-mono">
                            <h3 className="font-bold uppercase text-indigo-600 border-b border-slate-100 pb-0.5">02 // Technical Toolkit</h3>
                            {hasTechS && (
                              <p className="text-slate-700 leading-relaxed text-xs">
                                <strong className="text-indigo-800">[Tech_Stack]:</strong> {data.skills.technical.join(', ')}
                              </p>
                            )}
                            {hasSoftS && (
                              <p className="text-slate-700 leading-relaxed text-xs">
                                <strong className="text-indigo-800">[Core_Comp]:</strong> {data.skills.soft.join(', ')}
                              </p>
                            )}
                          </div>
                        );
                      case 'experience':
                        if (!data.experience || data.experience.length === 0) return null;
                        return (
                          <div key="experience" className="space-y-3 font-mono">
                            <h3 className="font-bold uppercase text-indigo-600 border-b border-slate-100 pb-0.5">03 // Professional Experience Log</h3>
                            <div className="space-y-3.5">
                              {data.experience.map((exp: any) => (
                                <div key={exp.id} className="space-y-1">
                                  <div className="flex justify-between font-bold text-slate-850 text-xs">
                                    <span>&gt; {exp.position} @ {exp.company}</span>
                                    <span className="text-slate-500 font-normal text-[10px] whitespace-nowrap">{exp.startDate} - {exp.endDate}</span>
                                  </div>
                                  {exp.location && <div className="text-[10px] text-slate-400 pl-3">Location: {exp.location}</div>}
                                  <p className="text-slate-600 whitespace-pre-line leading-relaxed pl-3 border-l-2 border-indigo-100 text-xs">{exp.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      case 'projects':
                        if (!data.projects || data.projects.length === 0) return null;
                        return (
                          <div key="projects" className="space-y-3 font-mono">
                            <h3 className="font-bold uppercase text-indigo-600 border-b border-slate-100 pb-0.5">04 // Key Project Repositories</h3>
                            <div className="space-y-3.5">
                              {data.projects.map((proj: any) => (
                                <div key={proj.id} className="space-y-1 text-xs">
                                  <div className="flex justify-between items-baseline font-bold text-slate-800">
                                    <span>$ {proj.title} {proj.role ? `[role: ${proj.role}]` : ''}</span>
                                    {proj.link && (
                                      <a href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-[10px]">
                                        {proj.link}
                                      </a>
                                    )}
                                  </div>
                                  {proj.technologies && <div className="text-[9px] text-indigo-600 font-semibold">[tech_stack: {proj.technologies}]</div>}
                                  <p className="text-slate-600 pl-3 border-l-2 border-slate-200">{proj.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      case 'education':
                        if (!data.education || data.education.length === 0) return null;
                        return (
                          <div key="education" className="space-y-3 font-mono">
                            <h3 className="font-bold uppercase text-indigo-600 border-b border-slate-100 pb-0.5">05 // Academic Foundations</h3>
                            <div className="space-y-3">
                              {data.education.map((edu: any) => (
                                <div key={edu.id} className="space-y-1 text-xs">
                                  <div className="flex justify-between font-bold text-slate-800">
                                    <span>{edu.degree} in {edu.fieldOfStudy}</span>
                                    <span className="text-slate-500 font-normal text-[10px] whitespace-nowrap">{edu.startDate} - {edu.endDate}</span>
                                  </div>
                                  <div className="text-slate-650 font-medium italic">{edu.institution} {edu.grade ? `[GPA: ${edu.grade}]` : ''}</div>
                                  {edu.description && <p className="text-slate-500 pl-3 border-l-2 border-slate-200">{edu.description}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      case 'certifications':
                        if (!data.certifications || data.certifications.length === 0) return null;
                        return (
                          <div key="certifications" className="space-y-2 font-mono">
                            <h3 className="font-bold uppercase text-indigo-600 border-b border-slate-100 pb-0.5">06 // Professional Credentials</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              {data.certifications.map((cert: any) => (
                                <div key={cert.id} className="flex justify-between items-center bg-slate-50/50 p-2 rounded-xl border border-slate-150">
                                  <div>
                                    <div className="font-bold text-slate-850 text-[11px]">{cert.name}</div>
                                    <div className="text-slate-500 text-[10px]">{cert.issuer}</div>
                                  </div>
                                  {cert.date && <div className="text-slate-400 text-[10px]">{cert.date}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      case 'languages':
                        if (!data.languages || data.languages.length === 0) return null;
                        return (
                          <div key="languages" className="space-y-2 font-mono">
                            <h3 className="font-bold uppercase text-indigo-600 border-b border-slate-100 pb-0.5">07 // Human Communication</h3>
                            <div className="flex flex-wrap gap-4 text-xs">
                              {data.languages.map((lang: any) => (
                                <div key={lang.id} className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-850">{lang.name}:</span>
                                  <span className="text-slate-500 italic">{lang.proficiency}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      default:
                        return null;
                    }
                  };

                  const renderExecutiveSection = (secName: string) => {
                    switch (secName) {
                      case 'personalInfo':
                        if (!data.personalInfo?.summary) return null;
                        return (
                          <div key="profile" className="space-y-2 border-l-4 pl-4 border-slate-800">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Executive Summary</h3>
                            <p className="text-slate-700 leading-relaxed text-justify text-xs font-serif">{data.personalInfo.summary}</p>
                          </div>
                        );
                      case 'experience':
                        if (!data.experience || data.experience.length === 0) return null;
                        return (
                          <div key="experience" className="space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider border-b-2 border-slate-800 pb-1 text-slate-800">Professional Leadership History</h3>
                            <div className="space-y-4">
                              {data.experience.map((exp: any) => (
                                <div key={exp.id} className="space-y-1">
                                  <div className="flex justify-between items-start text-xs">
                                    <div>
                                      <strong className="font-extrabold text-slate-900 text-[13px]">{exp.position}</strong>
                                      <span className="text-slate-600 font-medium ml-1">| {exp.company}</span>
                                      {exp.location && <span className="text-slate-500 text-[10px] ml-2 font-serif">({exp.location})</span>}
                                    </div>
                                    <span className="text-slate-600 font-bold text-[10px] uppercase whitespace-nowrap tracking-wider">{exp.startDate} – {exp.endDate}</span>
                                  </div>
                                  <p className="text-slate-700 leading-relaxed whitespace-pre-line text-xs pl-3 border-l border-slate-300 font-serif">{exp.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      case 'projects':
                        if (!data.projects || data.projects.length === 0) return null;
                        return (
                          <div key="projects" className="space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider border-b-2 border-slate-800 pb-1 text-slate-800">Key Initiatives & Impact</h3>
                            <div className="space-y-4">
                              {data.projects.map((proj: any) => (
                                <div key={proj.id} className="space-y-1 text-xs">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <strong className="font-bold text-slate-900 text-[12px]">{proj.title}</strong>
                                      {proj.role && <span className="text-slate-600 italic ml-1">({proj.role})</span>}
                                    </div>
                                    {proj.link && (
                                      <a href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`} target="_blank" rel="noreferrer" className="text-indigo-650 hover:underline text-[10px] font-mono">
                                        {proj.link}
                                      </a>
                                    )}
                                  </div>
                                  {proj.technologies && (
                                    <div className="text-[10px] text-slate-600 font-medium">
                                      Focus: {proj.technologies}
                                    </div>
                                  )}
                                  <p className="text-slate-700 leading-relaxed text-xs pl-3 border-l border-slate-300 font-serif">{proj.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      case 'education':
                        if (!data.education || data.education.length === 0) return null;
                        return (
                          <div key="education" className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider border-b-2 border-slate-800 pb-1 text-slate-800">Education</h3>
                            <div className="space-y-3">
                              {data.education.map((edu: any) => (
                                <div key={edu.id} className="space-y-1 text-xs">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <strong className="font-bold text-slate-900 text-[12px]">{edu.degree} in {edu.fieldOfStudy}</strong> • <span className="text-slate-700 italic font-medium">{edu.institution}</span>
                                    </div>
                                    <span className="text-slate-650 font-semibold text-[10px] whitespace-nowrap">{edu.startDate} – {edu.endDate}</span>
                                  </div>
                                  {edu.grade && <div className="text-[10px] text-slate-650 font-serif">Academic Performance: {edu.grade}</div>}
                                  {edu.description && <p className="text-slate-600 leading-relaxed text-xs pl-3 border-l border-slate-300 font-serif">{edu.description}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      case 'skills':
                        const hasTechEx = data.skills?.technical && data.skills.technical.length > 0;
                        const hasSoftEx = data.skills?.soft && data.skills.soft.length > 0;
                        if (!hasTechEx && !hasSoftEx) return null;
                        return (
                          <div key="skills" className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider border-b-2 border-slate-800 pb-1 text-slate-800">Leadership Competency Matrix</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              {hasTechEx && (
                                <div className="space-y-1">
                                  <strong className="text-slate-800 uppercase tracking-wider text-[10px]">Strategic & Tech Tools:</strong>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {data.skills.technical.map((s: string) => (
                                      <span key={s} className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-medium text-[10px]">{s}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {hasSoftEx && (
                                <div className="space-y-1">
                                  <strong className="text-slate-800 uppercase tracking-wider text-[10px]">Executive Leadership Capabilities:</strong>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {data.skills.soft.map((s: string) => (
                                      <span key={s} className="px-2 py-0.5 bg-indigo-50 text-indigo-800 rounded font-semibold text-[10px]">{s}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      case 'certifications':
                        if (!data.certifications || data.certifications.length === 0) return null;
                        return (
                          <div key="certifications" className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider border-b-2 border-slate-800 pb-1 text-slate-800">Professional Board Certifications</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              {data.certifications.map((cert: any) => (
                                <div key={cert.id} className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-lg border border-slate-200">
                                  <div>
                                    <div className="font-extrabold text-slate-800 text-[11px]">{cert.name}</div>
                                    <div className="text-slate-500 text-[10px]">{cert.issuer}</div>
                                  </div>
                                  {cert.date && <div className="text-slate-400 text-[10px] font-mono">{cert.date}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      case 'languages':
                        if (!data.languages || data.languages.length === 0) return null;
                        return (
                          <div key="languages" className="space-y-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider border-b-2 border-slate-800 pb-1 text-slate-800">Languages</h3>
                            <div className="flex flex-wrap gap-4 text-xs">
                              {data.languages.map((lang: any) => (
                                <div key={lang.id} className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-850">{lang.name}:</span>
                                  <span className="text-slate-500 italic">{lang.proficiency}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      default:
                        return null;
                    }
                  };

                  const renderAcademicSection = (secName: string) => {
                    switch (secName) {
                      case 'personalInfo':
                        if (!data.personalInfo?.summary) return null;
                        return (
                          <div key="profile" className="space-y-2 text-center font-serif">
                            <h3 className="text-[11px] font-bold uppercase tracking-widest border-b border-double border-slate-900 pb-1 text-slate-950">Research Summary & Objective</h3>
                            <p className="text-slate-800 leading-relaxed text-justify text-xs italic mx-4">{data.personalInfo.summary}</p>
                          </div>
                        );
                      case 'experience':
                        if (!data.experience || data.experience.length === 0) return null;
                        return (
                          <div key="experience" className="space-y-3 font-serif">
                            <h3 className="text-[11px] font-bold uppercase tracking-widest border-b border-double border-slate-900 pb-1 text-slate-900">Academic & Professional Appointments</h3>
                            <div className="space-y-4">
                              {data.experience.map((exp: any) => (
                                <div key={exp.id} className="space-y-1">
                                  <div className="flex justify-between items-baseline text-xs">
                                    <div>
                                      <strong className="font-bold text-slate-900">{exp.position}</strong>, <span className="italic text-slate-850">{exp.company}</span>
                                      {exp.location && <span className="text-slate-500 text-[10px] ml-1">({exp.location})</span>}
                                    </div>
                                    <span className="text-slate-650 text-[10px] font-semibold whitespace-nowrap">{exp.startDate} - {exp.endDate}</span>
                                  </div>
                                  <p className="text-slate-700 leading-relaxed text-xs pl-3 border-l border-slate-200 text-justify">{exp.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      case 'projects':
                        if (!data.projects || data.projects.length === 0) return null;
                        return (
                          <div key="projects" className="space-y-3 font-serif">
                            <h3 className="text-[11px] font-bold uppercase tracking-widest border-b border-double border-slate-900 pb-1 text-slate-900">Selected Research Publications & Projects</h3>
                            <div className="space-y-4">
                              {data.projects.map((proj: any) => (
                                <div key={proj.id} className="space-y-1 text-xs">
                                  <div className="flex justify-between items-baseline">
                                    <div>
                                      <strong className="font-bold text-slate-900">{proj.title}</strong>
                                      {proj.role && <span className="text-slate-600 italic ml-1">— Role: {proj.role}</span>}
                                    </div>
                                    {proj.link && (
                                      <span className="text-indigo-800 hover:underline text-[10px] font-mono break-all">{proj.link}</span>
                                    )}
                                  </div>
                                  {proj.technologies && (
                                    <div className="text-[10px] text-slate-600 italic">
                                      Research Fields / Methodologies: {proj.technologies}
                                    </div>
                                  )}
                                  <p className="text-slate-700 leading-relaxed text-xs pl-3 border-l border-slate-200 text-justify">{proj.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      case 'education':
                        if (!data.education || data.education.length === 0) return null;
                        return (
                          <div key="education" className="space-y-3 font-serif">
                            <h3 className="text-[11px] font-bold uppercase tracking-widest border-b border-double border-slate-900 pb-1 text-slate-900">Academic Background</h3>
                            <div className="space-y-3.5">
                              {data.education.map((edu: any) => (
                                <div key={edu.id} className="space-y-1 text-xs">
                                  <div className="flex justify-between items-baseline">
                                    <div>
                                      <strong className="font-bold text-slate-900">{edu.degree} in {edu.fieldOfStudy}</strong>, <span className="text-slate-800 italic">{edu.institution}</span>
                                    </div>
                                    <span className="text-slate-600 text-[10px] font-semibold whitespace-nowrap">{edu.startDate} - {edu.endDate}</span>
                                  </div>
                                  {edu.grade && <div className="text-[10px] text-slate-600 font-sans">Dissertation / Grade: {edu.grade}</div>}
                                  {edu.description && <p className="text-slate-600 leading-relaxed text-xs pl-3 border-l border-slate-200">{edu.description}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      case 'skills':
                        const hasTechAc = data.skills?.technical && data.skills.technical.length > 0;
                        const hasSoftAc = data.skills?.soft && data.skills.soft.length > 0;
                        if (!hasTechAc && !hasSoftAc) return null;
                        return (
                          <div key="skills" className="space-y-2 font-serif">
                            <h3 className="text-[11px] font-bold uppercase tracking-widest border-b border-double border-slate-900 pb-1 text-slate-900">Fields of Expertise</h3>
                            <div className="space-y-2 text-xs">
                              {hasTechAc && (
                                <p className="text-slate-700 leading-relaxed">
                                  <strong className="text-slate-900 uppercase tracking-wider text-[10px] font-sans">Methodologies & Analytics:</strong> {data.skills.technical.join(', ')}
                                </p>
                              )}
                              {hasSoftAc && (
                                <p className="text-slate-700 leading-relaxed">
                                  <strong className="text-slate-900 uppercase tracking-wider text-[10px] font-sans">Subject Expertise & Pedagogies:</strong> {data.skills.soft.join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      case 'certifications':
                        if (!data.certifications || data.certifications.length === 0) return null;
                        return (
                          <div key="certifications" className="space-y-2.5 font-serif">
                            <h3 className="text-[11px] font-bold uppercase tracking-widest border-b border-double border-slate-900 pb-1 text-slate-900">Fellowships & Honors</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              {data.certifications.map((cert: any) => (
                                <div key={cert.id} className="py-1 border-b border-slate-150">
                                  <div className="font-bold text-slate-900">{cert.name}</div>
                                  <div className="text-slate-600 text-[11px] italic">{cert.issuer} {cert.date ? `(${cert.date})` : ''}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      case 'languages':
                        if (!data.languages || data.languages.length === 0) return null;
                        return (
                          <div key="languages" className="space-y-2 font-serif">
                            <h3 className="text-[11px] font-bold uppercase tracking-widest border-b border-double border-slate-900 pb-1 text-slate-900">Languages</h3>
                            <div className="flex flex-wrap gap-4 text-xs">
                              {data.languages.map((lang: any) => (
                                <div key={lang.id} className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900">{lang.name}:</span>
                                  <span className="text-slate-600 italic">{lang.proficiency}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      default:
                        return null;
                    }
                  };

                  const renderStartupSection = (secName: string) => {
                    switch (secName) {
                      case 'personalInfo':
                        if (!data.personalInfo?.summary) return null;
                        return (
                          <div key="profile" className="space-y-2 p-3 bg-indigo-50/20 border-l-4 border-indigo-500 rounded-r-xl">
                            <h3 className="text-xs font-black uppercase tracking-wider text-indigo-700">Quick Pitch</h3>
                            <p className="text-slate-700 leading-relaxed text-justify text-xs">{data.personalInfo.summary}</p>
                          </div>
                        );
                      case 'experience':
                        if (!data.experience || data.experience.length === 0) return null;
                        return (
                          <div key="experience" className="space-y-3">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">Impact Record</h3>
                            <div className="space-y-4">
                              {data.experience.map((exp: any) => (
                                <div key={exp.id} className="space-y-1">
                                  <div className="flex justify-between items-start text-xs">
                                    <div>
                                      <strong className="font-bold text-slate-900 text-[12px]">{exp.position}</strong> <span className="text-slate-400">@</span> <strong className="text-indigo-650 font-extrabold">{exp.company}</strong>
                                      {exp.location && <span className="text-slate-400 text-[10px] ml-1">({exp.location})</span>}
                                    </div>
                                    <span className="text-slate-500 text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">{exp.startDate} - {exp.endDate}</span>
                                  </div>
                                  <p className="text-slate-600 leading-relaxed text-xs pl-3 border-l-2 border-indigo-400 whitespace-pre-line">{exp.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      case 'projects':
                        if (!data.projects || data.projects.length === 0) return null;
                        return (
                          <div key="projects" className="space-y-3">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">Shipped Projects</h3>
                            <div className="grid grid-cols-1 gap-3">
                              {data.projects.map((proj: any) => (
                                <div key={proj.id} className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-1 text-xs">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <strong className="font-bold text-slate-900 text-sm">{proj.title}</strong>
                                      {proj.role && <span className="text-slate-500 italic ml-1">({proj.role})</span>}
                                    </div>
                                    {proj.link && (
                                      <a href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-[10px] font-mono font-bold">
                                        {proj.link}
                                      </a>
                                    )}
                                  </div>
                                  {proj.technologies && (
                                    <div className="text-[10px] text-indigo-600 font-mono font-medium">
                                      Stack: {proj.technologies}
                                    </div>
                                  )}
                                  <p className="text-slate-600 leading-relaxed text-xs">{proj.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      case 'education':
                        if (!data.education || data.education.length === 0) return null;
                        return (
                          <div key="education" className="space-y-3">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">Education</h3>
                            <div className="space-y-3">
                              {data.education.map((edu: any) => (
                                <div key={edu.id} className="space-y-1 text-xs">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <strong className="font-bold text-slate-900">{edu.degree}</strong> • <span className="text-indigo-600 font-semibold">{edu.institution}</span>
                                    </div>
                                    <span className="text-slate-500 text-[10px] whitespace-nowrap">{edu.startDate} - {edu.endDate}</span>
                                  </div>
                                  {edu.grade && <div className="text-[10px] text-slate-500 font-medium">KPI: {edu.grade}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      case 'skills':
                        const hasTechSt = data.skills?.technical && data.skills.technical.length > 0;
                        const hasSoftSt = data.skills?.soft && data.skills.soft.length > 0;
                        if (!hasTechSt && !hasSoftSt) return null;
                        return (
                          <div key="skills" className="space-y-2">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">Skillset</h3>
                            <div className="space-y-2.5 text-xs">
                              {hasTechSt && (
                                <div>
                                  <strong className="text-indigo-700 text-[10px] uppercase tracking-wider font-bold block mb-1">Hardcore Tech Stack:</strong>
                                  <div className="flex flex-wrap gap-1">
                                    {data.skills.technical.map((s: string) => (
                                      <span key={s} className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-lg text-[10px] font-bold text-indigo-700">{s}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {hasSoftSt && (
                                <div>
                                  <strong className="text-indigo-700 text-[10px] uppercase tracking-wider font-bold block mb-1">Execution & Ownership:</strong>
                                  <div className="flex flex-wrap gap-1">
                                    {data.skills.soft.map((s: string) => (
                                      <span key={s} className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-medium text-slate-700">{s}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      case 'certifications':
                        if (!data.certifications || data.certifications.length === 0) return null;
                        return (
                          <div key="certifications" className="space-y-2.5">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">Certifications</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              {data.certifications.map((cert: any) => (
                                <div key={cert.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-150">
                                  <div>
                                    <div className="font-extrabold text-slate-800 text-[11px]">{cert.name}</div>
                                    <div className="text-indigo-600 text-[10px] font-semibold">{cert.issuer}</div>
                                  </div>
                                  {cert.date && <div className="text-slate-400 text-[10px] font-mono">{cert.date}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      case 'languages':
                        if (!data.languages || data.languages.length === 0) return null;
                        return (
                          <div key="languages" className="space-y-2">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">Languages</h3>
                            <div className="flex flex-wrap gap-4 text-xs">
                              {data.languages.map((lang: any) => (
                                <div key={lang.id} className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-800">{lang.name}:</span>
                                  <span className="text-slate-500 italic">{lang.proficiency}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      default:
                        return null;
                    }
                  };

                  const renderElegantSection = (secName: string) => {
                    switch (secName) {
                      case 'personalInfo':
                        if (!data.personalInfo?.summary) return null;
                        return (
                          <div key="profile" className="space-y-2 border-b border-amber-200/50 pb-4 font-serif text-slate-900">
                            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-800 text-center">Executive Summary</h3>
                            <p className="text-slate-700 leading-relaxed text-justify text-xs italic font-serif px-6">{data.personalInfo.summary}</p>
                          </div>
                        );
                      case 'experience':
                        if (!data.experience || data.experience.length === 0) return null;
                        return (
                          <div key="experience" className="space-y-4 font-serif">
                            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-800 border-b border-amber-200/50 pb-1">Professional History</h3>
                            <div className="space-y-5">
                              {data.experience.map((exp: any) => (
                                <div key={exp.id} className="space-y-1.5">
                                  <div className="flex justify-between items-baseline text-xs">
                                    <div>
                                      <strong className="font-extrabold text-slate-900 text-[13px]">{exp.position}</strong>
                                      <span className="text-slate-500 italic font-medium ml-1">at {exp.company}</span>
                                      {exp.location && <span className="text-slate-400 text-[10px] ml-2">({exp.location})</span>}
                                    </div>
                                    <span className="text-slate-500 font-bold text-[9px] uppercase tracking-widest whitespace-nowrap">{exp.startDate} - {exp.endDate}</span>
                                  </div>
                                  <p className="text-slate-600 leading-relaxed whitespace-pre-line text-xs pl-3 border-l border-amber-200/60 text-justify">{exp.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      case 'projects':
                        if (!data.projects || data.projects.length === 0) return null;
                        return (
                          <div key="projects" className="space-y-4 font-serif">
                            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-800 border-b border-amber-200/50 pb-1">Initiatives & Projects</h3>
                            <div className="space-y-5">
                              {data.projects.map((proj: any) => (
                                <div key={proj.id} className="space-y-1.5 text-xs">
                                  <div className="flex justify-between items-baseline">
                                    <div>
                                      <strong className="font-bold text-slate-900 text-[12px]">{proj.title}</strong>
                                      {proj.role && <span className="text-slate-500 italic ml-1">({proj.role})</span>}
                                    </div>
                                    {proj.link && (
                                      <a href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`} target="_blank" rel="noreferrer" className="text-amber-850 hover:underline text-[10px] font-mono">
                                        {proj.link}
                                      </a>
                                    )}
                                  </div>
                                  {proj.technologies && (
                                    <div className="text-[10px] text-slate-500 italic">
                                      Domain & Tech: {proj.technologies}
                                    </div>
                                  )}
                                  <p className="text-slate-600 leading-relaxed text-xs pl-3 border-l border-amber-200/60 text-justify">{proj.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      case 'education':
                        if (!data.education || data.education.length === 0) return null;
                        return (
                          <div key="education" className="space-y-3 font-serif">
                            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-800 border-b border-amber-200/50 pb-1">Education Background</h3>
                            <div className="space-y-3">
                              {data.education.map((edu: any) => (
                                <div key={edu.id} className="space-y-1 text-xs">
                                  <div className="flex justify-between items-baseline">
                                    <div>
                                      <strong className="font-bold text-slate-900 text-[12px]">{edu.degree} in {edu.fieldOfStudy}</strong> • <span className="text-slate-600 italic font-medium">{edu.institution}</span>
                                    </div>
                                    <span className="text-slate-500 font-bold text-[9px] uppercase tracking-widest whitespace-nowrap">{edu.startDate} - {edu.endDate}</span>
                                  </div>
                                  {edu.grade && <div className="text-[10px] text-slate-500 italic">Academic Distinction: {edu.grade}</div>}
                                  {edu.description && <p className="text-slate-500 leading-relaxed text-xs pl-3 border-l border-amber-200/60">{edu.description}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      case 'skills':
                        const hasTechEl = data.skills?.technical && data.skills.technical.length > 0;
                        const hasSoftEl = data.skills?.soft && data.skills.soft.length > 0;
                        if (!hasTechEl && !hasSoftEl) return null;
                        return (
                          <div key="skills" className="space-y-3 font-serif">
                            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-800 border-b border-amber-200/50 pb-1">Expertise Matrix</h3>
                            <div className="space-y-2 text-xs">
                              {hasTechEl && (
                                <p className="text-slate-600 leading-relaxed">
                                  <strong className="text-slate-800 uppercase tracking-widest text-[9px] font-sans">Technologies:</strong> {data.skills.technical.join(' / ')}
                                </p>
                              )}
                              {hasSoftEl && (
                                <p className="text-slate-600 leading-relaxed">
                                  <strong className="text-slate-800 uppercase tracking-widest text-[9px] font-sans">Capabilities:</strong> {data.skills.soft.join(' / ')}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      case 'certifications':
                        if (!data.certifications || data.certifications.length === 0) return null;
                        return (
                          <div key="certifications" className="space-y-2.5 font-serif">
                            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-800 border-b border-amber-200/50 pb-1">Credentials</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                              {data.certifications.map((cert: any) => (
                                <div key={cert.id} className="flex justify-between items-baseline py-1 border-b border-amber-100/30">
                                  <span className="font-bold text-slate-800">{cert.name} <span className="font-normal text-slate-500 font-sans text-[9px]">({cert.issuer})</span></span>
                                  {cert.date && <span className="text-slate-400 font-sans text-[9px] whitespace-nowrap font-bold tracking-widest uppercase">{cert.date}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      case 'languages':
                        if (!data.languages || data.languages.length === 0) return null;
                        return (
                          <div key="languages" className="space-y-2 font-serif">
                            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-800 border-b border-amber-200/50 pb-1">Languages</h3>
                            <div className="flex flex-wrap gap-x-6 text-xs pt-1">
                              {data.languages.map((lang: any) => (
                                <div key={lang.id} className="flex items-center gap-1.5">
                                  <strong className="text-slate-800 font-bold">{lang.name}:</strong>
                                  <span className="text-slate-500 italic">{lang.proficiency}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      default:
                        return null;
                    }
                  };

                  // 1. CLASSIC PRO LAYOUT
                  if (activeResume.templateId === 'template-classic') {
                    return (
                      <div className="space-y-6 text-xs">
                        <div className="text-center border-b pb-4">
                          <h2 className="text-3xl font-extrabold tracking-tight" style={{ color: themeColor }}>{data.personalInfo?.fullName}</h2>
                          <p className="font-bold text-slate-600 mt-1">{data.personalInfo?.title}</p>
                          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-slate-500 mt-2.5">
                            {data.personalInfo?.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {data.personalInfo.email}</span>}
                            {data.personalInfo?.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {data.personalInfo.phone}</span>}
                            {data.personalInfo?.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {data.personalInfo.location}</span>}
                            {data.personalInfo?.website && <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> {data.personalInfo.website}</span>}
                            {data.personalInfo?.github && <span className="flex items-center gap-1"><Github className="w-3.5 h-3.5" /> {data.personalInfo.github.replace('https://', '')}</span>}
                            {data.personalInfo?.linkedin && <span className="flex items-center gap-1"><Linkedin className="w-3.5 h-3.5" /> {data.personalInfo.linkedin.replace('https://', '')}</span>}
                          </div>
                        </div>

                        {sectionOrder.map(sec => renderClassicSection(sec))}
                      </div>
                    );
                  }

                  // 2. MODERN SPLIT LAYOUT
                  if (activeResume.templateId === 'template-modern') {
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-xs">
                        {/* LEFT COLUMN: Sidebar (4 cols) */}
                        <div className="md:col-span-4 space-y-6 md:border-r md:pr-6 border-slate-100">
                          <div className="space-y-1.5 pb-4 border-b border-slate-100">
                            <h2 className="text-2xl font-black tracking-tight" style={{ color: themeColor }}>{data.personalInfo?.fullName}</h2>
                            <p className="font-extrabold uppercase tracking-widest text-[10px] text-indigo-600">{data.personalInfo?.title}</p>
                          </div>
                          
                          {/* Contact Details */}
                          <div className="space-y-2 text-slate-600">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Contact Details</h4>
                            <div className="space-y-2 pt-1">
                              {data.personalInfo?.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /> <span className="break-all">{data.personalInfo.email}</span></div>}
                              {data.personalInfo?.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /> <span>{data.personalInfo.phone}</span></div>}
                              {data.personalInfo?.location && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400" /> <span>{data.personalInfo.location}</span></div>}
                              {data.personalInfo?.website && <div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-slate-400" /> <span>{data.personalInfo.website}</span></div>}
                              {data.personalInfo?.github && <div className="flex items-center gap-2"><Github className="w-3.5 h-3.5 text-slate-400" /> <span className="break-all">{data.personalInfo.github.replace('https://', '')}</span></div>}
                              {data.personalInfo?.linkedin && <div className="flex items-center gap-2"><Linkedin className="w-3.5 h-3.5 text-slate-400" /> <span className="break-all">{data.personalInfo.linkedin.replace('https://', '')}</span></div>}
                            </div>
                          </div>

                          {/* Technical Skills */}
                          {data.skills?.technical && data.skills.technical.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Expertise</h4>
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {data.skills.technical.map((s: string) => (
                                  <span key={s} className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded text-[10px] font-bold text-slate-700" style={{ borderLeftColor: themeColor, borderLeftWidth: '2px' }}>{s}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Soft Skills */}
                          {data.skills?.soft && data.skills.soft.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Core Competencies</h4>
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {data.skills.soft.map((s: string) => (
                                  <span key={s} className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded text-[10px] font-semibold text-slate-600">{s}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Languages */}
                          {data.languages && data.languages.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Languages</h4>
                              <div className="space-y-1.5 pt-1">
                                {data.languages.map((lang: any) => (
                                  <div key={lang.id} className="flex justify-between items-center text-[11px]">
                                    <span className="font-bold text-slate-700">{lang.name}</span>
                                    <span className="text-slate-500 italic text-[10px]">{lang.proficiency}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Interests */}
                          {data.interests && data.interests.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Interests</h4>
                              <div className="flex flex-wrap gap-1 pt-1">
                                {data.interests.map((interest: string) => (
                                  <span key={interest} className="text-[10px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{interest}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* RIGHT COLUMN: Main Content (8 cols) */}
                        <div className="md:col-span-8 space-y-6">
                          {data.personalInfo?.summary && (
                            <div className="space-y-2">
                              <h3 className="text-xs font-bold uppercase tracking-wider pb-1 border-b border-slate-100" style={{ color: themeColor }}>Professional Summary</h3>
                              <p className="text-slate-600 leading-relaxed text-justify text-xs">{data.personalInfo.summary}</p>
                            </div>
                          )}

                          {data.experience && data.experience.length > 0 && (
                            <div className="space-y-4">
                              <h3 className="text-xs font-bold uppercase tracking-wider pb-1 border-b border-slate-100" style={{ color: themeColor }}>Work Experience</h3>
                              <div className="space-y-4">
                                {data.experience.map((exp: any) => (
                                  <div key={exp.id} className="space-y-1">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <h4 className="font-extrabold text-slate-800 text-xs">{exp.position}</h4>
                                        <div className="text-[11px] text-slate-500 font-medium italic">{exp.company} {exp.location ? `• ${exp.location}` : ''}</div>
                                      </div>
                                      <span className="text-[10px] font-bold text-indigo-650 bg-indigo-50/50 px-2 py-0.5 rounded-lg whitespace-nowrap">{exp.startDate} - {exp.endDate}</span>
                                    </div>
                                    <p className="text-slate-600 text-xs whitespace-pre-line leading-relaxed pl-2.5 border-l border-slate-100">{exp.description}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {data.projects && data.projects.length > 0 && (
                            <div className="space-y-4">
                              <h3 className="text-xs font-bold uppercase tracking-wider pb-1 border-b border-slate-100" style={{ color: themeColor }}>Key Projects</h3>
                              <div className="space-y-4">
                                {data.projects.map((proj: any) => (
                                  <div key={proj.id} className="space-y-1">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <h4 className="font-extrabold text-slate-800 text-xs">{proj.title}</h4>
                                        {proj.role && <span className="text-[10px] text-slate-500 italic">Role: {proj.role}</span>}
                                      </div>
                                      {proj.link && (
                                        <a href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-[10px] font-mono">
                                          {proj.link}
                                        </a>
                                      )}
                                    </div>
                                    {proj.technologies && (
                                      <div className="text-[10px] text-indigo-600 font-mono font-medium">Tech Stack: {proj.technologies}</div>
                                    )}
                                    <p className="text-slate-600 text-xs whitespace-pre-line leading-relaxed pl-2.5 border-l border-slate-100">{proj.description}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {data.education && data.education.length > 0 && (
                            <div className="space-y-4">
                              <h3 className="text-xs font-bold uppercase tracking-wider pb-1 border-b border-slate-100" style={{ color: themeColor }}>Education</h3>
                              <div className="space-y-3.5">
                                {data.education.map((edu: any) => (
                                  <div key={edu.id} className="space-y-1">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <h4 className="font-bold text-slate-800 text-xs">{edu.degree} in {edu.fieldOfStudy}</h4>
                                        <div className="text-[11px] text-slate-600 font-medium">{edu.institution}</div>
                                      </div>
                                      <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">{edu.startDate} - {edu.endDate}</span>
                                    </div>
                                    {edu.grade && <div className="text-[10px] text-slate-500 font-semibold">Grade: {edu.grade}</div>}
                                    {edu.description && <p className="text-slate-500 text-xs pl-2.5 border-l border-slate-100 leading-relaxed">{edu.description}</p>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {data.certifications && data.certifications.length > 0 && (
                            <div className="space-y-3">
                              <h3 className="text-xs font-bold uppercase tracking-wider pb-1 border-b border-slate-100" style={{ color: themeColor }}>Certifications</h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {data.certifications.map((cert: any) => (
                                  <div key={cert.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                                    <div>
                                      <div className="font-bold text-slate-800 text-[11px]">{cert.name}</div>
                                      <div className="text-slate-500 text-[10px]">{cert.issuer}</div>
                                    </div>
                                    {cert.date && <div className="text-slate-400 text-[10px] font-mono">{cert.date}</div>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // 3. BLACK AND WHITE MINIMAL LAYOUT
                  if (activeResume.templateId === 'template-minimal') {
                    return (
                      <div className="space-y-6 text-black">
                        <div className="border-b-2 border-black pb-3">
                          <h2 className="text-3xl font-black uppercase tracking-tight font-serif">{data.personalInfo?.fullName}</h2>
                          <p className="text-xs font-bold italic tracking-widest mt-1.5 uppercase font-sans text-slate-700">{data.personalInfo?.title}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-3 font-sans text-slate-600">
                            {data.personalInfo?.email && <span>{data.personalInfo.email}</span>}
                            {data.personalInfo?.phone && <span>{data.personalInfo.phone}</span>}
                            {data.personalInfo?.location && <span>{data.personalInfo.location}</span>}
                            {data.personalInfo?.website && <span>{data.personalInfo.website}</span>}
                            {data.personalInfo?.github && <span>github: {data.personalInfo.github.replace('https://', '')}</span>}
                            {data.personalInfo?.linkedin && <span>linkedin: {data.personalInfo.linkedin.replace('https://', '')}</span>}
                          </div>
                        </div>

                        {sectionOrder.map(sec => renderMinimalSection(sec))}
                      </div>
                    );
                  }

                  // 4. SOFTWARE / TECH-INTENSE LAYOUT (template-software, template-ml, template-dataci)
                  if (activeResume.templateId === 'template-software' || activeResume.templateId === 'template-ml' || activeResume.templateId === 'template-dataci') {
                    const isML = activeResume.templateId === 'template-ml';
                    const isDS = activeResume.templateId === 'template-dataci';
                    return (
                      <div className="space-y-6 font-mono text-xs">
                        <div className="border-b border-slate-200 pb-3">
                          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{data.personalInfo?.fullName}</h2>
                          <p className="text-indigo-650 font-bold tracking-widest mt-0.5">{data.personalInfo?.title}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5 text-slate-500 text-[11px]">
                            {data.personalInfo?.email && <span>email: {data.personalInfo.email}</span>}
                            {data.personalInfo?.phone && <span>tel: {data.personalInfo.phone}</span>}
                            {data.personalInfo?.location && <span>loc: {data.personalInfo.location}</span>}
                            {data.personalInfo?.website && <span>web: {data.personalInfo.website}</span>}
                            {data.personalInfo?.github && <span>github: {data.personalInfo.github.replace('https://', '')}</span>}
                            {data.personalInfo?.linkedin && <span>linkedin: {data.personalInfo.linkedin.replace('https://', '')}</span>}
                          </div>
                        </div>

                        {/* Highly relevant details depending on sub-specialty */}
                        {isML && (
                          <div className="p-2.5 bg-indigo-50/40 rounded-xl border border-indigo-100">
                            <strong className="text-indigo-800">ML Specialization Models & Research:</strong> Large Language Models (LLMs), RAG, Tokenization, Transformers, Multi-Agent pipelines, Reinforcement Learning.
                          </div>
                        )}

                        {isDS && (
                          <div className="p-2.5 bg-emerald-50/40 rounded-xl border border-emerald-100">
                            <strong className="text-emerald-800">Data Analytics Pipeline:</strong> Predictive Modeling, Random Forests, pandas, numpy, scikit-learn, math libraries, A/B Testing protocols.
                          </div>
                        )}

                        {sectionOrder.map(sec => renderSoftwareSection(sec))}
                      </div>
                    );
                  }

                  // 5. CREATIVE TIMELINE LAYOUT
                  if (activeResume.templateId === 'template-creative') {
                    return (
                      <div className="space-y-6 text-xs">
                        {/* Header Banner */}
                        <div className="text-white p-6 rounded-2xl -mx-6 -mt-6 sm:-mx-10 sm:-mt-10" style={{ backgroundColor: themeColor }}>
                          <h2 className="text-3xl font-black tracking-tight">{data.personalInfo?.fullName}</h2>
                          <p className="font-extrabold uppercase tracking-widest text-[11px] opacity-90 mt-1">{data.personalInfo?.title}</p>
                          
                          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 text-[11px] opacity-80 pt-2 border-t border-white/20">
                            {data.personalInfo?.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {data.personalInfo.email}</span>}
                            {data.personalInfo?.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {data.personalInfo.phone}</span>}
                            {data.personalInfo?.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {data.personalInfo.location}</span>}
                            {data.personalInfo?.website && <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> {data.personalInfo.website}</span>}
                            {data.personalInfo?.github && <span className="flex items-center gap-1"><Github className="w-3.5 h-3.5" /> {data.personalInfo.github.replace('https://', '')}</span>}
                            {data.personalInfo?.linkedin && <span className="flex items-center gap-1"><Linkedin className="w-3.5 h-3.5" /> {data.personalInfo.linkedin.replace('https://', '')}</span>}
                          </div>
                        </div>

                        {/* About */}
                        {data.personalInfo?.summary && (
                          <div className="space-y-2 pt-2">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">About Me</h3>
                            <p className="text-slate-600 leading-relaxed text-justify text-xs">{data.personalInfo.summary}</p>
                          </div>
                        )}

                        {/* Timeline for Experience and Projects */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                          {/* Left: Experience & Projects (8 cols) */}
                          <div className="md:col-span-8 space-y-6">
                            {data.experience && data.experience.length > 0 && (
                              <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: themeColor }}>Experience Journey</h3>
                                <div className="relative border-l-2 border-indigo-100 pl-5 ml-2.5 space-y-5">
                                  {data.experience.map((exp: any) => (
                                    <div key={exp.id} className="relative space-y-1">
                                      {/* Timeline marker */}
                                      <span className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs" style={{ backgroundColor: themeColor }}></span>
                                      <div className="flex justify-between items-start text-xs">
                                        <div>
                                          <strong className="font-bold text-slate-800 text-xs">{exp.position}</strong>
                                          <span className="text-slate-500 italic ml-1">at {exp.company}</span>
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">{exp.startDate} - {exp.endDate}</span>
                                      </div>
                                      <p className="text-slate-600 leading-relaxed text-xs whitespace-pre-line">{exp.description}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {data.projects && data.projects.length > 0 && (
                              <div className="space-y-4 pt-2">
                                <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: themeColor }}>Key Projects</h3>
                                <div className="relative border-l-2 border-indigo-100 pl-5 ml-2.5 space-y-5">
                                  {data.projects.map((proj: any) => (
                                    <div key={proj.id} className="relative space-y-1">
                                      <span className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-slate-400 shadow-xs"></span>
                                      <div className="flex justify-between items-start text-xs">
                                        <strong className="font-bold text-slate-800 text-xs">{proj.title}</strong>
                                        {proj.link && (
                                          <a href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-[10px] font-mono">
                                            {proj.link}
                                          </a>
                                        )}
                                      </div>
                                      {proj.role && <div className="text-[10px] text-slate-500">Role: {proj.role}</div>}
                                      {proj.technologies && <div className="text-[10px] text-indigo-600 font-mono font-medium">Stack: {proj.technologies}</div>}
                                      <p className="text-slate-600 leading-relaxed text-xs">{proj.description}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right: Skills, Education, Certs, Languages (4 cols) */}
                          <div className="md:col-span-4 space-y-6">
                            {data.skills?.technical && data.skills.technical.length > 0 && (
                              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Technical</h4>
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {data.skills.technical.map((s: string) => (
                                    <span key={s} className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700">{s}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {data.skills?.soft && data.skills.soft.length > 0 && (
                              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Soft Skills</h4>
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {data.skills.soft.map((s: string) => (
                                    <span key={s} className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[10px] font-medium text-slate-600">{s}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {data.education && data.education.length > 0 && (
                              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Education</h4>
                                {data.education.map((edu: any) => (
                                  <div key={edu.id} className="space-y-1">
                                    <div className="font-bold text-slate-800 text-[11px]">{edu.degree}</div>
                                    <div className="text-[10px] text-slate-500">{edu.institution}</div>
                                    <div className="text-[9px] text-slate-400 whitespace-nowrap">{edu.startDate} - {edu.endDate}</div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {data.certifications && data.certifications.length > 0 && (
                              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Credentials</h4>
                                {data.certifications.map((cert: any) => (
                                  <div key={cert.id} className="space-y-1">
                                    <div className="font-bold text-slate-800 text-[11px]">{cert.name}</div>
                                    <div className="text-[9px] text-slate-500">{cert.issuer}</div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {data.languages && data.languages.length > 0 && (
                              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Languages</h4>
                                <div className="space-y-1.5 pt-1">
                                  {data.languages.map((lang: any) => (
                                    <div key={lang.id} className="flex justify-between items-center text-[10px]">
                                      <span className="font-bold text-slate-700">{lang.name}</span>
                                      <span className="text-slate-500 italic">{lang.proficiency}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 6. EXECUTIVE LAYOUT
                  if (activeResume.templateId === 'template-executive') {
                    return (
                      <div className="space-y-6 text-xs max-w-4xl mx-auto p-4 md:p-8 bg-white text-slate-900 leading-relaxed font-serif">
                        {/* Header */}
                        <div className="text-center border-b-4 border-slate-900 pb-5 space-y-3">
                          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 uppercase font-sans">{data.personalInfo?.fullName}</h2>
                          <p className="font-bold uppercase tracking-widest text-xs text-slate-600 font-sans">{data.personalInfo?.title}</p>
                          
                          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4 text-[11px] text-slate-700 font-medium font-sans">
                            {data.personalInfo?.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-800" /> {data.personalInfo.email}</span>}
                            {data.personalInfo?.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-800" /> {data.personalInfo.phone}</span>}
                            {data.personalInfo?.location && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-800" /> {data.personalInfo.location}</span>}
                            {data.personalInfo?.website && <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-slate-800" /> {data.personalInfo.website}</span>}
                            {data.personalInfo?.github && <span className="flex items-center gap-1.5"><Github className="w-3.5 h-3.5 text-slate-800" /> {data.personalInfo.github.replace('https://', '')}</span>}
                            {data.personalInfo?.linkedin && <span className="flex items-center gap-1.5"><Linkedin className="w-3.5 h-3.5 text-slate-800" /> {data.personalInfo.linkedin.replace('https://', '')}</span>}
                          </div>
                        </div>

                        {/* Two Columns */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
                          {/* Main Content (8 cols) */}
                          <div className="lg:col-span-8 space-y-6">
                            {sectionOrder.map((sec: string) => {
                              if (['personalInfo', 'experience', 'projects'].includes(sec)) {
                                return renderExecutiveSection(sec);
                              }
                              return null;
                            })}
                          </div>

                          {/* Sidebar Content (4 cols) */}
                          <div className="lg:col-span-4 space-y-6 border-l border-slate-200 pl-0 lg:pl-6">
                            {sectionOrder.map((sec: string) => {
                              if (!['personalInfo', 'experience', 'projects'].includes(sec)) {
                                return renderExecutiveSection(sec);
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 7. ACADEMIC LAYOUT
                  if (activeResume.templateId === 'template-academic') {
                    return (
                      <div className="space-y-6 text-xs max-w-4xl mx-auto p-4 md:p-8 bg-white text-slate-900 font-serif leading-relaxed">
                        {/* Elegant Scholarly Header */}
                        <div className="text-center space-y-2 border-b-2 border-double border-slate-900 pb-5">
                          <h2 className="text-2xl font-bold tracking-wide uppercase text-slate-950">{data.personalInfo?.fullName}</h2>
                          <p className="font-semibold italic text-slate-850 text-xs">{data.personalInfo?.title}</p>
                          
                          <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 mt-3 text-[11px] text-slate-700 font-sans">
                            {data.personalInfo?.email && <span className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-slate-900" /> {data.personalInfo.email}</span>}
                            {data.personalInfo?.phone && <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-900" /> {data.personalInfo.phone}</span>}
                            {data.personalInfo?.location && <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-slate-900" /> {data.personalInfo.location}</span>}
                            {data.personalInfo?.website && <span className="flex items-center gap-1.5"><Globe className="w-3 h-3 text-slate-900" /> {data.personalInfo.website}</span>}
                            {data.personalInfo?.github && <span className="flex items-center gap-1.5"><Github className="w-3 h-3 text-slate-900" /> {data.personalInfo.github.replace('https://', '')}</span>}
                            {data.personalInfo?.linkedin && <span className="flex items-center gap-1.5"><Linkedin className="w-3 h-3 text-slate-900" /> {data.personalInfo.linkedin.replace('https://', '')}</span>}
                          </div>
                        </div>

                        {/* Single Column Scholarly Sections */}
                        <div className="space-y-6 pt-2">
                          {sectionOrder.map((secName: string) => renderAcademicSection(secName))}
                        </div>
                      </div>
                    );
                  }

                  // 8. STARTUP LAYOUT
                  if (activeResume.templateId === 'template-startup') {
                    return (
                      <div className="space-y-6 text-xs max-w-4xl mx-auto p-4 md:p-8 bg-slate-50/50 rounded-2xl border border-slate-150 text-slate-800 font-sans leading-relaxed">
                        {/* Startup Grid Header */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center border-b border-slate-250 pb-6">
                          <div className="md:col-span-8 space-y-1">
                            <h2 className="text-3xl font-black tracking-tight text-slate-900">{data.personalInfo?.fullName}</h2>
                            <p className="text-indigo-600 font-extrabold uppercase tracking-wider text-xs">{data.personalInfo?.title}</p>
                          </div>
                          <div className="md:col-span-4 space-y-1.5 text-slate-600 text-[11px] font-medium bg-white p-3.5 rounded-xl border border-slate-200">
                            {data.personalInfo?.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-indigo-500" /> <span className="truncate">{data.personalInfo.email}</span></div>}
                            {data.personalInfo?.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-indigo-500" /> <span>{data.personalInfo.phone}</span></div>}
                            {data.personalInfo?.location && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-indigo-500" /> <span>{data.personalInfo.location}</span></div>}
                            {data.personalInfo?.website && <div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-indigo-500" /> <span className="truncate">{data.personalInfo.website}</span></div>}
                          </div>
                        </div>

                        {/* Two Columns Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
                          {/* Left Column (8 cols) */}
                          <div className="lg:col-span-8 space-y-6">
                            {sectionOrder.map((secName: string) => {
                              if (['personalInfo', 'experience', 'projects'].includes(secName)) {
                                return renderStartupSection(secName);
                              }
                              return null;
                            })}
                          </div>

                          {/* Right Column (4 cols) */}
                          <div className="lg:col-span-4 space-y-6">
                            {sectionOrder.map((secName: string) => {
                              if (!['personalInfo', 'experience', 'projects'].includes(secName)) {
                                return renderStartupSection(secName);
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 9. ELEGANT LAYOUT
                  if (activeResume.templateId === 'template-elegant') {
                    return (
                      <div className="space-y-6 text-xs max-w-4xl mx-auto p-4 md:p-8 bg-amber-50/5 text-slate-900 font-serif leading-relaxed">
                        {/* Luxury Centered Header */}
                        <div className="text-center space-y-3 border-b border-amber-200/60 pb-6">
                          <h2 className="text-3xl font-light tracking-widest text-slate-900 uppercase font-serif">{data.personalInfo?.fullName}</h2>
                          <div className="h-[1px] w-12 bg-amber-400 mx-auto"></div>
                          <p className="font-bold uppercase tracking-widest text-[10px] text-amber-800 font-sans">{data.personalInfo?.title}</p>
                          
                          <div className="flex flex-wrap justify-center gap-x-6 gap-y-1.5 mt-4 text-[10px] text-slate-500 uppercase tracking-wider font-sans font-medium">
                            {data.personalInfo?.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-amber-700" /> {data.personalInfo.email}</span>}
                            {data.personalInfo?.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-amber-700" /> {data.personalInfo.phone}</span>}
                            {data.personalInfo?.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-amber-700" /> {data.personalInfo.location}</span>}
                            {data.personalInfo?.website && <span className="flex items-center gap-1"><Globe className="w-3 h-3 text-amber-700" /> {data.personalInfo.website}</span>}
                          </div>
                        </div>

                        {/* Columns */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
                          {/* Main Body (8 cols) */}
                          <div className="lg:col-span-8 space-y-6">
                            {sectionOrder.map((secName: string) => {
                              if (['personalInfo', 'experience', 'projects'].includes(secName)) {
                                return renderElegantSection(secName);
                              }
                              return null;
                            })}
                          </div>

                          {/* Sidebar (4 cols) */}
                          <div className="lg:col-span-4 space-y-6 lg:border-l lg:border-amber-100/50 lg:pl-6">
                            {sectionOrder.map((secName: string) => {
                              if (!['personalInfo', 'experience', 'projects'].includes(secName)) {
                                return renderElegantSection(secName);
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })()}
              </div>
            </div>

          </div>
        )}

        {/* --- 4. ATS COMPARATIVE MATCH VIEW --- */}
        {currentView === 'analyzer' && activeResume && (
          <div className="space-y-8" id="panel-analyzer">
            
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Sparkles className="text-indigo-600" /> Machine Learning Resume Matcher
              </h3>
              <p className="text-sm text-slate-500">
                Pasting the target job requirements will extract keywords automatically. Our vectorizer computes cosine similarity scores and uses Multinomial Naive Bayes to audit your ATS compatibility!
              </p>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Inputs */}
                <div className="md:col-span-5 space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                      <span>Job Specification Text</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => {
                          setJobDescription("We are looking for a Web Developer. Required skills: JavaScript, React, HTML5, CSS3, Tailwind CSS, Vite, Node.js, Express, and state management. Experience building web pages, responsive frontends, and REST APIs.");
                          showToast('Loaded Web Developer (JavaScript) job requirements!', 'info');
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 text-[10px] font-black rounded-lg transition text-slate-600 cursor-pointer"
                      >
                        Web Developer (JS)
                      </button>
                      <button
                        onClick={() => {
                          setJobDescription("We are looking for a Machine Learning Engineer. Required skills: Python, Scikit-Learn, TensorFlow, PyTorch, neural networks, deep learning, NLP, pipelines, model tuning, and training ML models.");
                          showToast('Loaded Machine Learning Engineer job requirements!', 'info');
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 text-[10px] font-black rounded-lg transition text-slate-600 cursor-pointer"
                      >
                        ML Engineer
                      </button>
                      <button
                        onClick={() => {
                          setJobDescription("We are looking for a Software Engineer. Required skills: Java, Python, C++, clean code, microservices, Docker, Kubernetes, system architecture, SQL databases, and algorithms.");
                          showToast('Loaded Software Engineer job requirements!', 'info');
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 text-[10px] font-black rounded-lg transition text-slate-600 cursor-pointer"
                      >
                        Software Engineer
                      </button>
                    </div>
                  </div>
                  <textarea
                    id="textarea-job-desc"
                    name="job_description"
                    autoComplete="off"
                    data-lpignore="true"
                    rows={12}
                    placeholder="Paste full job description requirements, technical prerequisites, and candidate details here..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="w-full text-xs p-3.5 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <button
                    id="btn-run-analysis"
                    onClick={handleRunAnalysis}
                    disabled={isAnalyzing || !jobDescription}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" /> Matching TF-IDF Vectors...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" /> Execute Machine Learning Audit
                      </>
                    )}
                  </button>
                </div>

                {/* Comparative Chart/Result space */}
                <div className="md:col-span-7 flex flex-col justify-center">
                  {!analysisResult && !isAnalyzing && (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-2">
                      <BarChart2 className="w-12 h-12 text-slate-300" />
                      <p className="text-sm font-bold text-slate-700">Awaiting ML Model Execution</p>
                      <p className="text-xs text-slate-400">Input target specifications on the left and trigger the cosine analyzer.</p>
                    </div>
                  )}

                  {isAnalyzing && (
                    <div className="text-center py-12 space-y-3">
                      <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
                      <p className="text-sm font-semibold text-slate-700">Tokenizing, Lemmatizing, and Computing TF-IDF Vectors...</p>
                      <p className="text-xs text-slate-400 font-mono">Running Multinomial Naive Bayes Classifications</p>
                    </div>
                  )}

                  {analysisResult && (
                    <div className="space-y-6" id="analysis-results">
                      
                      {/* TOP REPORT TOOLBAR */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                        <div>
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-indigo-600" /> Executive ATS Evaluation Report
                          </h4>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">Scanned against: <strong className="text-slate-700">{jobCompany || 'Target Role Specs'}</strong></p>
                        </div>
                        <button
                          id="btn-download-ats-report"
                          onClick={handleDownloadAtsReport}
                          disabled={isExportingReport}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <Download className="w-3.5 h-3.5 text-indigo-400" />
                          {isExportingReport ? 'Compiling PDF Report...' : 'Download Full ATS Report (PDF)'}
                        </button>
                      </div>

                      {/* HERO SCORE & KEY METRICS GRID */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                          
                          {/* Large Animated Overall ATS Score Circle */}
                          <div className="md:col-span-4 flex flex-col items-center justify-center p-6 bg-slate-900 text-white rounded-2xl relative overflow-hidden shadow-md">
                            <h4 className="text-xs font-extrabold uppercase tracking-widest text-indigo-400 mb-4">Overall ATS Compatibility</h4>
                            <div className="relative w-36 h-36 flex items-center justify-center">
                              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" className="text-slate-800" fill="transparent" />
                                <circle
                                  cx="50" cy="50" r="42"
                                  stroke="currentColor" strokeWidth="8"
                                  strokeDasharray="264"
                                  strokeDashoffset={264 - (264 * (analysisResult.atsScore || 0)) / 100}
                                  strokeLinecap="round"
                                  className={`transition-all duration-1000 ease-out ${
                                    analysisResult.atsScore >= 80 ? 'text-emerald-500' :
                                    analysisResult.atsScore >= 60 ? 'text-amber-500' :
                                    'text-rose-500'
                                  }`}
                                  fill="transparent"
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-black">{analysisResult.atsScore}%</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ATS Score</span>
                              </div>
                            </div>
                            <div className="mt-4 text-center">
                              <span className={`px-3 py-1 text-xs font-extrabold rounded-full ${
                                analysisResult.atsScore >= 80 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                analysisResult.atsScore >= 60 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}>
                                {analysisResult.atsScore >= 80 ? '✓ Excellent Match' : analysisResult.atsScore >= 60 ? '⚡ Average Match' : '⚠️ Action Needed'}
                              </span>
                              <p className="text-[11px] text-slate-400 font-mono mt-2">{analysisResult.category} • {analysisResult.experienceLevel}</p>
                            </div>
                          </div>

                          {/* 4 Metric Sub-Cards Grid */}
                          <div className="md:col-span-8 grid grid-cols-2 gap-4">
                            
                            {/* Keyword Match Card */}
                            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                              (analysisResult.matchScore || analysisResult.keywordMatchPercentage) >= 80 ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' :
                              (analysisResult.matchScore || analysisResult.keywordMatchPercentage) >= 60 ? 'bg-amber-50/60 border-amber-200 text-amber-900' :
                              'bg-rose-50/60 border-rose-200 text-rose-900'
                            }`}>
                              <div className="flex justify-between items-start">
                                <span className="text-xs font-extrabold uppercase tracking-wider">Keyword Match</span>
                                <span className="text-2xl font-black">{analysisResult.matchScore || analysisResult.keywordMatchPercentage}%</span>
                              </div>
                              <p className="text-[11px] opacity-80 mt-2 font-medium">TF-IDF N-Gram similarity overlap with job posting.</p>
                            </div>

                            {/* Skills Match Card */}
                            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                              analysisResult.keywordMatchPercentage >= 80 ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' :
                              analysisResult.keywordMatchPercentage >= 60 ? 'bg-amber-50/60 border-amber-200 text-amber-900' :
                              'bg-rose-50/60 border-rose-200 text-rose-900'
                            }`}>
                              <div className="flex justify-between items-start">
                                <span className="text-xs font-extrabold uppercase tracking-wider">Skills Match</span>
                                <span className="text-2xl font-black">{analysisResult.keywordMatchPercentage}%</span>
                              </div>
                              <p className="text-[11px] opacity-80 mt-2 font-medium">Technical stack & soft skills saturation.</p>
                            </div>

                            {/* Formatting Score Card */}
                            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                              (analysisResult.readabilityScore || 90) >= 80 ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' :
                              (analysisResult.readabilityScore || 90) >= 60 ? 'bg-amber-50/60 border-amber-200 text-amber-900' :
                              'bg-rose-50/60 border-rose-200 text-rose-900'
                            }`}>
                              <div className="flex justify-between items-start">
                                <span className="text-xs font-extrabold uppercase tracking-wider">Formatting Score</span>
                                <span className="text-2xl font-black">{analysisResult.readabilityScore || 90}%</span>
                              </div>
                              <p className="text-[11px] opacity-80 mt-2 font-medium">Standard ATS headers, contact info & layout.</p>
                            </div>

                            {/* Experience Match Card */}
                            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                              (analysisResult.scoringBreakdown?.experience || 75) >= 80 ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' :
                              (analysisResult.scoringBreakdown?.experience || 75) >= 60 ? 'bg-amber-50/60 border-amber-200 text-amber-900' :
                              'bg-rose-50/60 border-rose-200 text-rose-900'
                            }`}>
                              <div className="flex justify-between items-start">
                                <span className="text-xs font-extrabold uppercase tracking-wider">Experience Match</span>
                                <span className="text-2xl font-black">{analysisResult.scoringBreakdown?.experience || 75}%</span>
                              </div>
                              <p className="text-[11px] opacity-80 mt-2 font-medium">Work history tenure: {analysisResult.experienceLevel}.</p>
                            </div>

                          </div>

                        </div>
                      </div>

                      {/* SUMMARY FEEDBACK CARD */}
                      {analysisResult.summaryFeedback && (
                        <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-100 flex items-start gap-3">
                          <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <h5 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Professional Summary Feedback</h5>
                            <p className="text-xs text-slate-700 leading-relaxed font-medium">{analysisResult.summaryFeedback}</p>
                          </div>
                        </div>
                      )}

                      {/* RADAR CHART BREAKDOWN */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">ML Vector Score Breakdown</h4>
                        <div className="h-60">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getAtsRadarData()}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 10 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} />
                              <Radar name="Resume Vector" dataKey="score" stroke="#4f46e5" fill="#818cf8" fillOpacity={0.6} />
                              <Legend />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* KEYWORDS & SKILLS GAP DETECTOR */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-3">
                          <div>
                            <h5 className="font-extrabold text-xs text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                              <CheckCircle className="w-4 h-4 text-emerald-600" /> Matched Job Keywords ({(analysisResult.matchedKeywords || analysisResult.matchingSkills || []).length})
                            </h5>
                            {(analysisResult.matchedKeywords || analysisResult.matchingSkills || []).length === 0 ? (
                              <p className="text-xs text-slate-500">No overlapping tech keywords parsed.</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {(analysisResult.matchedKeywords || analysisResult.matchingSkills || []).map((s: string) => (
                                  <span key={s} className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">{s}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 space-y-3">
                          <div>
                            <h5 className="font-extrabold text-xs text-rose-800 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                              <XCircle className="w-4 h-4 text-rose-600" /> Missing Target Keywords ({(analysisResult.missingKeywords || analysisResult.missingSkills || []).length})
                            </h5>
                            {(analysisResult.missingKeywords || analysisResult.missingSkills || []).length === 0 ? (
                              <p className="text-xs text-emerald-600 font-semibold">Great! Target role requirements are fully satisfied.</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {(analysisResult.missingKeywords || analysisResult.missingSkills || []).map((s: string) => (
                                  <span key={s} className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded">{s}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* PROS & CONS AUDIT */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-emerald-50/30 p-4 rounded-xl border border-emerald-100">
                          <h5 className="font-extrabold text-xs text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                            <ThumbsUp className="w-4 h-4 text-emerald-600" /> Key Strengths / Pros
                          </h5>
                          <ul className="space-y-2">
                            {(analysisResult.pros || [
                              'Clear layout hierarchy with standard industry sections.',
                              'Document contains contact details and essential headings.'
                            ]).map((p: string, idx: number) => (
                              <li key={idx} className="text-xs text-slate-700 flex items-start gap-1.5">
                                <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                                <span>{p}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-rose-50/30 p-4 rounded-xl border border-rose-100">
                          <h5 className="font-extrabold text-xs text-rose-800 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                            <ThumbsDown className="w-4 h-4 text-rose-500" /> Weaknesses / Cons
                          </h5>
                          <ul className="space-y-2">
                            {(analysisResult.cons || [
                              'Could benefit from more specific technical key terms from the description.',
                              'Ensure all metrics (percentages, numbers) are maximized in work history.'
                            ]).map((c: string, idx: number) => (
                              <li key={idx} className="text-xs text-slate-700 flex items-start gap-1.5">
                                <span className="text-rose-500 font-bold mt-0.5">✗</span>
                                <span>{c}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* ACTION VERBS & RECOMMENDATIONS MATRIX */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        
                        {/* Missing Action Verbs */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-2">
                          <h5 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> High-Impact Action Verbs
                          </h5>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {(analysisResult.missingActionVerbs || ['Architected', 'Spearheaded', 'Engineered', 'Optimized']).map((v: string) => (
                              <span key={v} className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold rounded">{v}</span>
                            ))}
                          </div>
                        </div>

                        {/* Recommended Certifications */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-2">
                          <h5 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-indigo-600" /> Key Certifications
                          </h5>
                          <ul className="space-y-1 pt-1">
                            {(analysisResult.recommendedCertifications || ['AWS Solutions Architect', 'Kubernetes CKA']).map((cert: string, idx: number) => (
                              <li key={idx} className="text-[11px] text-slate-700 font-bold flex items-center gap-1">
                                <span className="text-indigo-600 font-bold">▸</span> {cert}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Recommended Projects */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-2">
                          <h5 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Portfolio Project Ideas
                          </h5>
                          <ul className="space-y-1 pt-1">
                            {(analysisResult.recommendedProjects || ['Enterprise API Gateway', 'Realtime Multi-Tenant SaaS']).map((proj: string, idx: number) => (
                              <li key={idx} className="text-[11px] text-slate-700 font-bold flex items-center gap-1">
                                <span className="text-emerald-600 font-bold">▸</span> {proj}
                              </li>
                            ))}
                          </ul>
                        </div>

                      </div>

                      {/* SMART IMPROVEMENTS / SUGGESTIONS */}
                      <div className="space-y-6">
                        
                        {/* LOADING STATE */}
                        {isRequestingSuggestions && (
                          <div className="bg-indigo-50/50 p-8 rounded-2xl border border-indigo-100 flex flex-col items-center justify-center space-y-3">
                            <Sparkles className="w-8 h-8 text-indigo-600 animate-spin" />
                            <p className="text-sm font-bold text-slate-700">Deep Generative AI Analysis...</p>
                            <p className="text-xs text-indigo-600/70 italic font-mono text-center">Querying career advisors at Gemini-3.5-flash for personalized ATS suggestions.</p>
                          </div>
                        )}

                        {/* DETAILED RECIPES FOR SUCCESS */}
                        {aiSuggestions && !isRequestingSuggestions && (
                          <div className="space-y-6" id="ats-improvement-suggestions">
                            
                            {/* SCORE ESTIMATE IMPACT HEADER CARD */}
                            {aiSuggestions.scoreImpact && (
                              <div className="bg-gradient-to-r from-indigo-50 to-emerald-50/30 p-5 rounded-2xl border border-indigo-100/80 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4">
                                <div className="space-y-1 text-center lg:text-left">
                                  <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 justify-center lg:justify-start">
                                    📈 Estimated ATS Score After Applying Suggestions
                                  </h4>
                                  <p className="text-xs text-slate-500 font-medium">Apply the recruiter-approved improvements below to maximize your visibility.</p>
                                </div>
                                <div className="flex flex-wrap items-center justify-center gap-4 bg-white px-5 py-3 rounded-xl border border-slate-100 shadow-xs">
                                  <div className="text-center">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Score</span>
                                    <p className="text-xl font-extrabold text-rose-500">{aiSuggestions.scoreImpact.currentScore}/100</p>
                                  </div>
                                  <span className="text-slate-300 font-light text-xl">➔</span>
                                  <div className="text-center">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Estimated Score</span>
                                    <p className="text-xl font-extrabold text-emerald-600">{aiSuggestions.scoreImpact.estimatedScore}/100</p>
                                  </div>
                                  <div className="border-l pl-3 text-center">
                                    <span className="text-[10px] text-emerald-600 font-black uppercase tracking-wider">Potential Increase</span>
                                    <p className="text-lg font-black text-emerald-500">+{aiSuggestions.scoreImpact.potentialIncrease}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* TOP 5 QUICK IMPROVEMENTS CHECKLIST */}
                            {aiSuggestions.top5Improvements && aiSuggestions.top5Improvements.length > 0 && (
                              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
                                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                                  ✅ Top 5 Quick Improvements
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {aiSuggestions.top5Improvements.map((item: string, idx: number) => (
                                    <div key={idx} className="flex items-start gap-2.5 bg-slate-50/50 p-3 rounded-xl border border-slate-100/50 hover:border-indigo-100/80 transition">
                                      <input type="checkbox" className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5" />
                                      <span className="text-xs font-semibold text-slate-700 leading-tight">{item}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* POSITIVE FEEDBACK SECTION */}
                            {aiSuggestions.positiveFeedback && (
                              <div className="bg-emerald-50/20 border border-emerald-100/60 p-4 rounded-xl flex items-start gap-3">
                                <span className="text-xl">🌟</span>
                                <div className="space-y-1">
                                  <h5 className="text-xs font-bold text-emerald-800">Recruiter Evaluation Insights</h5>
                                  <p className="text-xs text-slate-600 leading-relaxed font-medium">{aiSuggestions.positiveFeedback}</p>
                                </div>
                              </div>
                            )}

                            {/* INDIVIDUAL DETAILED SUGGESTIONS */}
                            <div className="space-y-4">
                              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest">
                                📝 Detailed Actionable Improvement Roadmap
                              </h4>
                              <div className="grid grid-cols-1 gap-4">
                                {aiSuggestions.suggestions && aiSuggestions.suggestions.map((s: any, idx: number) => {
                                  const isHigh = s.priority?.toLowerCase() === 'high';
                                  const isMedium = s.priority?.toLowerCase() === 'medium';
                                  
                                  let badgeColor = "bg-blue-50 text-blue-700 border-blue-100";
                                  if (isHigh) badgeColor = "bg-rose-50 text-rose-700 border-rose-100";
                                  else if (isMedium) badgeColor = "bg-amber-50 text-amber-700 border-amber-100";

                                  return (
                                    <div key={idx} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-4 hover:border-slate-200 transition flex flex-col md:flex-row gap-4 items-start">
                                      
                                      {/* Left Column: Priority Badge & Info */}
                                      <div className="w-full md:w-1/3 space-y-2">
                                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-full border ${badgeColor}`}>
                                          Priority: {s.priority}
                                        </span>
                                        <div className="pt-2">
                                          <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Issue Found</h5>
                                          <p className="text-xs font-black text-slate-800 mt-1 leading-snug">{s.issueFound}</p>
                                        </div>
                                      </div>

                                      {/* Right Column: Why, How, Example */}
                                      <div className="w-full md:w-2/3 space-y-3.5 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
                                        <div>
                                          <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Why it affects ATS Score</h5>
                                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{s.whyAffects}</p>
                                        </div>
                                        <div>
                                          <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">How to fix it</h5>
                                          <p className="text-xs text-slate-700 mt-1 leading-relaxed font-semibold">{s.howToFix}</p>
                                        </div>
                                        {s.exampleImproved && (
                                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <h5 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Example of an Improved Version</h5>
                                            <p className="text-xs text-slate-800 font-mono mt-1 whitespace-pre-wrap leading-relaxed">{s.exampleImproved}</p>
                                          </div>
                                        )}
                                      </div>

                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                          </div>
                        )}
                      </div>

                    </div>
                  )}

                </div>

              </div>
            </div>

          </div>
        )}

        {/* --- 5. VERSION SNAPSHOT HISTORY VIEW --- */}
        {currentView === 'history' && activeResume && (
          <div className="space-y-6" id="panel-history">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <History className="text-indigo-600" /> Resume Version Archives
              </h3>
              <button
                id="btn-history-back"
                onClick={() => setCurrentView('dashboard')}
                className="px-4 py-2 border rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                Back to Dashboard
              </button>
            </div>

            {activeHistory.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border">
                <p className="text-slate-500 text-sm">No old snapshot backups found. Backups are saved automatically when editing resume segments.</p>
              </div>
            ) : (
              <div className="space-y-4" id="history-snapshots">
                {activeHistory.map(snapshot => (
                  <div key={snapshot.id} className="bg-white border rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-800">{snapshot.title}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-[10px] rounded font-mono font-bold text-slate-500 uppercase tracking-wide">{snapshot.templateId.replace('template-', '')}</span>
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-1">
                        Snapshot captured: <strong className="text-slate-700">{formatLocalTimestamp(snapshot.timestamp)}</strong>
                      </p>
                      {snapshot.jobTitle && (
                        <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                          Target Role: {snapshot.jobTitle}
                        </p>
                      )}
                      
                      {snapshot.analysis && (
                        <div className="flex flex-wrap gap-2 items-center mt-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md">
                            ATS Score: {snapshot.analysis.atsScore}%
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md">
                            Category: {snapshot.analysis.category}
                          </span>
                          {snapshot.analysis.keywordMatchPercentage !== undefined && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-md">
                              Keyword Match: {snapshot.analysis.keywordMatchPercentage}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        id={`btn-restore-snap-${snapshot.id}`}
                        onClick={() => handleRestoreHistory(snapshot.id)}
                        className="flex-grow sm:flex-grow-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold shadow transition cursor-pointer"
                      >
                        Restore Snapshot
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- 6. TELEMETRY / ADMIN VIEW --- */}
        {currentView === 'admin' && (
          <div className="space-y-8 animate-fade-in" id="panel-admin">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <ShieldAlert className="text-indigo-600 animate-pulse" /> Platform Telemetry & Analytics
            </h3>

            {/* CHARTS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8" id="admin-charts">
              
              {/* Category distribution */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h4 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Multinomial Naive Bayes Categories Prediction</h4>
                <div className="h-64 flex items-center justify-center">
                  {!systemStats || getRechartsPieData().length === 0 ? (
                    <p className="text-xs text-slate-400">Execute comparison tests in ATS Matcher to populate Naive Bayes telemetry.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getRechartsPieData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {getRechartsPieData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#4f46e5', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'][index % 6]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* System status details */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                <h4 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Machine Learning System Pipeline Logs</h4>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Classification Categories</span>
                    <span className="text-xs font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">9 Classes Active</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['Software Engineer', 'Web Developer', 'Data Scientist', 'Machine Learning Engineer', 'AI Engineer', 'DevOps Engineer', 'Cybersecurity Analyst', 'Cloud Engineer', 'UI/UX Designer'].map(c => (
                      <span key={c} className="text-[10px] font-bold p-1.5 bg-slate-50 border rounded text-slate-600 text-center truncate">{c}</span>
                    ))}
                  </div>

                  <div className="space-y-2 border-t pt-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Stopwords Corpus Size</span>
                      <strong className="font-mono text-slate-800">127 standard English terms</strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">TF-IDF Vectorizer Mode</span>
                      <strong className="font-mono text-slate-800">Normal (Smoothed Inverse Frequency)</strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Joblib Equivalent</span>
                      <strong className="font-mono text-slate-800">best_model.json Serialization</strong>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* FOOTER SECTION */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-xs text-slate-500 print:hidden mt-12" id="app-footer">
        <p>© 2026 ResuMatch AI Platform. Developed server-side at Port 3000. Under rigorous compliance guidelines.</p>
      </footer>

      {/* QR CODE POPUP MODAL */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" id="qr-modal">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <h3 className="font-black text-slate-800 text-lg">Smart Contact vCard QR</h3>
            <p className="text-xs text-slate-500">Scan this code using any smartphone camera to instantly import your profile into the recruiter's address book!</p>
            
            <div className="p-4 bg-slate-50 rounded-xl inline-block border">
              <img src={qrContent} alt="Contact QR Code" className="w-48 h-48 mx-auto" />
            </div>

            <div className="pt-2">
              <button
                id="btn-close-qr"
                onClick={() => setShowQRModal(false)}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION DIALOG MODAL */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4" id="custom-confirm-modal">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-lg">{confirmDialog.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{confirmDialog.message}</p>
            
            <div className="flex gap-3 pt-2 justify-end">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-sm"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHOOSE RESUME TEMPLATE MODAL */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[110] flex items-center justify-center p-4 overflow-y-auto" id="template-choose-modal">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto relative">
            
            {/* Close Button */}
            <button
              onClick={() => setShowTemplateModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title & Description */}
            <div className="space-y-1">
              <h3 className="font-black text-slate-900 text-xl flex items-center gap-2">
                <LayoutTemplate className="w-6 h-6 text-indigo-600" />
                Select Resume Template Layout
              </h3>
              <p className="text-xs text-slate-500">
                Choose a visual template designed for ATS optimization and recruiter compliance.
              </p>
            </div>

            {/* Resume Title Input */}
            <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                Resume Portfolio Title
              </label>
              <input
                type="text"
                value={newResumeTitle}
                onChange={(e) => setNewResumeTitle(e.target.value)}
                placeholder="e.g. Lead Machine Learning Engineer Resume"
                className="w-full px-3 py-2.5 bg-white border border-slate-250 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-bold text-slate-800 shadow-sm"
              />
            </div>

            {/* Template Selection Grid */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                Select Layout Template ({[
                  { id: 'template-classic', label: 'Classic Pro', description: 'Stately and traditional, perfect for finance, corporate admin, and business administration.', color: 'border-l-4 border-slate-800 bg-slate-50/50' },
                  { id: 'template-modern', label: 'Modern Split', description: 'Sleek two-column design, highlighting key achievements on a dynamic left column layout.', color: 'border-l-4 border-indigo-600 bg-indigo-50/10' },
                  { id: 'template-minimal', label: 'B&W Minimal', description: 'An elegant high-contrast minimal layout focusing purely on pristine typography details.', color: 'border-l-4 border-slate-400 bg-slate-50/50' },
                  { id: 'template-creative', label: 'Creative Bold', description: 'A vibrant timeline layout with a colored banner capturing agency and marketing focus.', color: 'border-l-4 border-pink-500 bg-pink-50/10' },
                  { id: 'template-software', label: 'Software Eng', description: 'Excellent tech-industry layout emphasizing coding stacks, KPI scores, and metrics.', color: 'border-l-4 border-emerald-500 bg-emerald-50/10' },
                  { id: 'template-ml', label: 'ML Eng', description: 'Optimized for machine learning, model metrics, mathematical research, and frameworks.', color: 'border-l-4 border-blue-600 bg-blue-50/10' },
                  { id: 'template-dataci', label: 'Data Sci', description: 'Analytics-driven portfolio emphasizing data science models, pipelines, and tools.', color: 'border-l-4 border-teal-500 bg-teal-50/10' },
                  { id: 'template-executive', label: 'Executive Leader', description: 'Double-column layout prioritizing stately leadership, corporate impact, and metrics.', color: 'border-l-4 border-slate-700 bg-slate-100/50' },
                  { id: 'template-academic', label: 'Academic Scholar', description: 'CV layout with scholarly dual borders, publications, and professional appointments.', color: 'border-l-4 border-violet-600 bg-violet-50/10' },
                  { id: 'template-startup', label: 'Bold Startup', description: 'High growth environment visual design, using tech-driven layouts and rapid pitches.', color: 'border-l-4 border-indigo-500 bg-indigo-50/20' },
                  { id: 'template-elegant', label: 'Elegant Editorial', description: 'A highly refined layout with deluxe serif headings, centered lines, and luxury appeal.', color: 'border-l-4 border-amber-600 bg-amber-50/20' }
                ].length} options)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: 'template-classic', label: 'Classic Pro', description: 'Stately and traditional, perfect for finance, corporate admin, and business administration.', color: 'border-l-4 border-slate-850 bg-slate-50/50' },
                  { id: 'template-modern', label: 'Modern Split', description: 'Sleek two-column design, highlighting key achievements on a dynamic left column layout.', color: 'border-l-4 border-indigo-650 bg-indigo-50/10' },
                  { id: 'template-minimal', label: 'B&W Minimal', description: 'An elegant high-contrast minimal layout focusing purely on pristine typography details.', color: 'border-l-4 border-slate-400 bg-slate-50/50' },
                  { id: 'template-creative', label: 'Creative Bold', description: 'A vibrant timeline layout with a colored banner capturing agency and marketing focus.', color: 'border-l-4 border-pink-500 bg-pink-50/10' },
                  { id: 'template-software', label: 'Software Eng', description: 'Excellent tech-industry layout emphasizing coding stacks, KPI scores, and metrics.', color: 'border-l-4 border-emerald-500 bg-emerald-50/10' },
                  { id: 'template-ml', label: 'ML Eng', description: 'Optimized for machine learning, model metrics, mathematical research, and frameworks.', color: 'border-l-4 border-blue-600 bg-blue-50/10' },
                  { id: 'template-dataci', label: 'Data Sci', description: 'Analytics-driven portfolio emphasizing data science models, pipelines, and tools.', color: 'border-l-4 border-teal-500 bg-teal-50/10' },
                  { id: 'template-executive', label: 'Executive Leader', description: 'Double-column layout prioritizing stately leadership, corporate impact, and metrics.', color: 'border-l-4 border-slate-700 bg-slate-100/50' },
                  { id: 'template-academic', label: 'Academic Scholar', description: 'CV layout with scholarly dual borders, publications, and professional appointments.', color: 'border-l-4 border-violet-600 bg-violet-50/10' },
                  { id: 'template-startup', label: 'Bold Startup', description: 'High growth environment visual design, using tech-driven layouts and rapid pitches.', color: 'border-l-4 border-indigo-500 bg-indigo-50/20' },
                  { id: 'template-elegant', label: 'Elegant Editorial', description: 'A highly refined layout with deluxe serif headings, centered lines, and luxury appeal.', color: 'border-l-4 border-amber-600 bg-amber-50/20' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTmplId(t.id)}
                    className={`text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between h-28 cursor-pointer ${
                      selectedTmplId === t.id
                        ? 'ring-2 ring-indigo-600 border-indigo-600 shadow-sm'
                        : 'border-slate-200 hover:border-slate-350 hover:bg-slate-50/50'
                    } ${t.color}`}
                  >
                    <div>
                      <div className="flex justify-between items-center">
                        <strong className="text-xs font-black text-slate-800">{t.label}</strong>
                        {selectedTmplId === t.id && (
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed line-clamp-3">
                        {t.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleCreateEmpty(selectedTmplId, newResumeTitle);
                  setShowTemplateModal(false);
                }}
                disabled={!newResumeTitle.trim()}
                className={`px-6 py-2.5 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-sm ${
                  newResumeTitle.trim()
                    ? 'bg-indigo-600 hover:bg-indigo-500'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                Create Portfolio
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[110] flex items-center justify-center p-4 overflow-y-auto" id="forgot-password-modal">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 md:p-8 space-y-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto relative">
            
            {/* Close Button */}
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title & Description */}
            <div className="space-y-1">
              <h3 className="font-black text-slate-900 text-xl flex items-center gap-2">
                <KeyRound className="w-6 h-6 text-indigo-600" />
                Password Recovery
              </h3>
              <p className="text-xs text-slate-500">
                Recover or update your account password instantly. The OTP is generated directly by the application.
              </p>
            </div>

            {/* Success and Error messages */}
            {forgotErrorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-700 text-xs font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{forgotErrorMessage}</span>
              </div>
            )}

            {forgotSuccessMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-700 text-xs font-medium">
                <Check className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{forgotSuccessMessage}</span>
              </div>
            )}

            {/* STEP 1: REQUEST CODE */}
            {forgotStep === 'request' && (
              <form onSubmit={handleForgotPasswordRequest} className="space-y-4">
                <div className="p-3 bg-indigo-50 border border-indigo-100/80 rounded-xl text-xs text-indigo-800 space-y-1">
                  <span className="font-bold block">💡 Self-Contained Environment Info:</span>
                  <p className="text-[11px] leading-relaxed">
                    No email setup is required. Your verification OTP will be displayed directly inside this window in the next step.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                    Registered Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="e.g. alex@tech.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-bold text-slate-800 shadow-sm"
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-sm flex items-center justify-center gap-2"
                >
                  Generate OTP Code
                </button>
              </form>
            )}

            {/* STEP 2: VERIFY CODE */}
            {forgotStep === 'verify' && (
              <form onSubmit={handleVerifyCodeSubmit} className="space-y-4">
                <div className="space-y-2 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/60 text-center">
                  <p className="text-xs text-indigo-900 font-bold">
                    🔑 OTP generated directly by the application:
                  </p>
                  <p className="text-[11px] text-slate-500">
                    (No email check needed. Please copy and enter the code below)
                  </p>
                  <div className="mt-2 inline-flex items-center gap-2 bg-white px-5 py-2.5 rounded-xl border border-indigo-200 shadow-sm font-mono font-black text-lg text-indigo-700 tracking-widest">
                    {forgotCode}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block text-center">
                    Enter Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={userCodeInput}
                    onChange={(e) => setUserCodeInput(e.target.value)}
                    placeholder="123456"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-black tracking-widest focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden text-slate-800 shadow-sm"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setForgotStep('request')}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-sm"
                  >
                    Verify Code
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: RESET PASSWORD */}
            {forgotStep === 'reset' && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                    Choose New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden font-bold text-slate-800 shadow-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-sm"
                >
                  Update Password & Log In
                </button>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
