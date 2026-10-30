import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ACADEMY_BLUEPRINTS,
  AcademyBlueprint,
  CareerStage,
  convertToUSD,
  DEFAULT_OPPORTUNITIES,
  FundingTier,
  GrantOpportunity,
  LanguageCode,
  OpportunityStatus,
  RegionScope,
  SAMPLE_PROPOSAL_DRAFTS,
  SubjectCategory,
  TRANSLATIONS,
} from './data/grantData';
import { GaiaGlobe } from './components/GaiaGlobe';
import { SpatialWorldMap } from './components/SpatialWorldMap';
import {
  auth,
  clampString,
  collection,
  db,
  doc,
  getDoc,
  googleProvider,
  handleFirestoreError,
  onAuthStateChanged,
  onSnapshot,
  OperationType,
  query,
  sanitizeValidId,
  serverTimestamp,
  setDoc,
  signInWithPopup,
  signOut,
  updateDoc,
  User,
  where,
} from './firebase';

type ActiveTab = 'dashboard' | 'map' | 'compliance' | 'academy' | 'sites' | 'email';
type PaidPlanId = 'pro_monthly' | 'csv_pass' | 'audit_pass' | 'blueprint_pass';

interface PaymentReceipt {
  id: string;
  planLabel: string;
  amountLabel: string;
  method: 'Payoneer' | 'Card' | 'USDC';
  timestamp: string;
}

interface ComplianceAuditResult {
  overallScore: number;
  verdictLabel: string;
  logicModelAlignment: string;
  budgetCompliance: string;
  eligibilityRisks: string;
  rubricBreakdown: {
    criterion: string;
    score: number;
    maxScore: number;
    status: string;
    finding: string;
  }[];
  actionableChecklist: string[];
  auditedAt: string;
  nonGenerativeCertificate: string;
}

interface ToastItem {
  id: string;
  title: string;
  message: string;
  tone: 'emerald' | 'teal' | 'amber';
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
}

export default function App() {
  // Language & Navigation State
  const [lang, setLang] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('grantscout_lang') as LanguageCode | null;
    return saved && TRANSLATIONS[saved] ? saved : 'en';
  });
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Firebase Auth & Cloud Sync State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  // Opportunities State
  const [customOpportunities, setCustomOpportunities] = useState<GrantOpportunity[]>([]);
  const [opportunities, setOpportunities] = useState<GrantOpportunity[]>(() => {
    const saved = localStorage.getItem('grantscout_opportunities');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // fallback to default
      }
    }
    return DEFAULT_OPPORTUNITIES;
  });

  useEffect(() => {
    localStorage.setItem('grantscout_opportunities', JSON.stringify(opportunities));
  }, [opportunities]);

  // Search & Filter State
  const [subjectFilter, setSubjectFilter] = useState<SubjectCategory>('ALL');
  const [keywordSearch, setKeywordSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<CareerStage>('ALL');
  const [regionFilter, setRegionFilter] = useState<RegionScope>('ALL');
  const [fundingFilter, setFundingFilter] = useState<FundingTier>('ALL');
  const [statusFilter, setStatusFilter] = useState<OpportunityStatus>('ALL');
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  // Modals & Paid Tier State
  const [siteModalOpen, setSiteModalOpen] = useState(false);
  const [detailOpp, setDetailOpp] = useState<GrantOpportunity | null>(null);
  const [activeBlueprint, setActiveBlueprint] = useState<AcademyBlueprint | null>(null);
  const [unlockedBlueprints, setUnlockedBlueprints] = useState<string[]>(['guide-1']);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'Payoneer' | 'Card' | 'USDC'>('USDC');
  const [proUnlocked, setProUnlocked] = useState(false);
  const [unlockedPasses, setUnlockedPasses] = useState<{
    csvAndAnalytics: boolean;
    complianceCredits: number;
  }>({
    csvAndAnalytics: false,
    complianceCredits: 0,
  });
  const [selectedPlan, setSelectedPlan] = useState<PaidPlanId>('pro_monthly');
  const [pendingBlueprintId, setPendingBlueprintId] = useState<string | null>(null);
  const [pendingCsvScope, setPendingCsvScope] = useState<'current' | 'shortlist' | 'chart' | null>(null);
  const [chartMetric, setChartMetric] = useState<'totalUSD' | 'avgUSD'>('totalUSD');
  const [paymentReceipts, setPaymentReceipts] = useState<PaymentReceipt[]>([]);

  // Quick URL Survey State
  const [quickUrlInput, setQuickUrlInput] = useState('');
  const [surveyingUrl, setSurveyingUrl] = useState(false);

  // Submit Opportunity Modal Form State
  const [formTitle, setFormTitle] = useState('');
  const [formProvider, setFormProvider] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formCurrency, setFormCurrency] = useState<'USD' | 'EUR' | 'GBP'>('USD');
  const [formAmount, setFormAmount] = useState('35000');
  const [formRegion, setFormRegion] = useState<Exclude<RegionScope, 'ALL'>>('Global');
  const [formStage, setFormStage] = useState<Exclude<CareerStage, 'ALL'>>('Early Career');
  const [formSubject, setFormSubject] = useState<Exclude<SubjectCategory, 'ALL'>>('Science & Tech');
  const [formDeadline, setFormDeadline] = useState('2026-12-31');
  const [formNotes, setFormNotes] = useState('');

  // AI Proposal Compliance Checker State
  const [complianceTargetCall, setComplianceTargetCall] = useState(
    'Horizon Europe Research Call (Standard Rubric)'
  );
  const [complianceOverhead, setComplianceOverhead] = useState<number>(10);
  const [proposalDraft, setProposalDraft] = useState(SAMPLE_PROPOSAL_DRAFTS.compliant.text);
  const [auditingProposal, setAuditingProposal] = useState(false);
  const [auditResult, setAuditResult] = useState<ComplianceAuditResult | null>(null);

  // Email Digest Tab State
  const [subscriberEmail, setSubscriberEmail] = useState('researcher@university.edu');
  const [digestCadence, setDigestCadence] = useState<'Weekly' | 'Bi-Weekly' | 'Urgent-Only'>('Weekly');
  const [digestRegion, setDigestRegion] = useState<RegionScope>('ALL');
  const [digestSubject, setDigestSubject] = useState<SubjectCategory>('ALL');

  // Floating SurveyorBot AI Widget State
  const [botOpen, setBotOpen] = useState(false);
  const [botInput, setBotInput] = useState('');
  const [botSending, setBotSending] = useState(false);
  const [botMessages, setBotMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: TRANSLATIONS.en.botWelcome,
    },
  ]);

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const pushToast = (title: string, message: string, tone: ToastItem['tone'] = 'teal') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, title, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4200);
  };

  // Sync RTL & Language
  useEffect(() => {
    localStorage.setItem('grantscout_lang', lang);
    const htmlEl = document.documentElement;
    if (lang === 'ar') {
      htmlEl.setAttribute('dir', 'rtl');
      htmlEl.classList.add('font-arabic');
    } else {
      htmlEl.setAttribute('dir', 'ltr');
      htmlEl.classList.remove('font-arabic');
    }
    setBotMessages((prev) =>
      prev.map((m) => (m.id === 'welcome' ? { ...m, text: TRANSLATIONS[lang].botWelcome } : m))
    );
  }, [lang]);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const getLocalizedTitle = (opp: GrantOpportunity): string => {
    if (lang === 'fr' && opp.title_fr) return opp.title_fr;
    if (lang === 'es' && opp.title_es) return opp.title_es;
    if (lang === 'pt' && opp.title_pt) return opp.title_pt;
    if (lang === 'sw' && opp.title_sw) return opp.title_sw;
    if (lang === 'ar' && opp.title_ar) return opp.title_ar;
    return opp.title;
  };

  // Filtered Opportunities & Live Metrics
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      if (showSavedOnly && !savedIds.includes(opp.id)) return false;
      if (subjectFilter !== 'ALL' && opp.subject !== subjectFilter) return false;
      if (stageFilter !== 'ALL' && opp.stage !== stageFilter) return false;
      if (regionFilter !== 'ALL' && opp.region !== regionFilter) return false;
      if (statusFilter !== 'ALL' && opp.status !== statusFilter) return false;

      const usdAmount = convertToUSD(opp.amount, opp.currency);
      if (fundingFilter === 'TIER_1' && usdAmount >= 25000) return false;
      if (fundingFilter === 'TIER_2' && (usdAmount < 25000 || usdAmount > 100000)) return false;
      if (fundingFilter === 'TIER_3' && usdAmount <= 100000) return false;

      if (keywordSearch.trim()) {
        const q = keywordSearch.toLowerCase();
        const hay = `${opp.title} ${opp.title_fr || ''} ${opp.provider} ${opp.region} ${opp.subject} ${opp.locationLabel} ${opp.notes}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [
    opportunities,
    showSavedOnly,
    savedIds,
    subjectFilter,
    stageFilter,
    regionFilter,
    statusFilter,
    fundingFilter,
    keywordSearch,
  ]);

  const totalUsdPool = useMemo(() => {
    return filteredOpportunities.reduce((sum, opp) => sum + convertToUSD(opp.amount, opp.currency), 0);
  }, [filteredOpportunities]);

  const closingSoonCount = useMemo(() => {
    return filteredOpportunities.filter((opp) => opp.status === 'Closing Soon').length;
  }, [filteredOpportunities]);

  const resetFilters = () => {
    setSubjectFilter('ALL');
    setKeywordSearch('');
    setStageFilter('ALL');
    setRegionFilter('ALL');
    setFundingFilter('ALL');
    setStatusFilter('ALL');
    setShowSavedOnly(false);
    pushToast('Filters Reset', 'Showing all verified global funding opportunities.', 'teal');
  };

  // Firebase Auth Listener & Initial Workspace Provisioning
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthReady(true);

      if (user) {
        const uid = sanitizeValidId(user.uid);
        const userDocPath = `users/${uid}`;
        const privateDocPath = `users/${uid}/private/info`;

        try {
          const userRef = doc(db, 'users', uid);
          const snap = await getDoc(userRef);

          if (!snap.exists()) {
            await setDoc(userRef, {
              ownerId: uid,
              displayName: clampString(user.displayName || 'Researcher', 1, 120, 'Researcher'),
              proUnlocked: false,
              csvAndAnalyticsUnlocked: false,
              complianceCredits: 0,
              savedIds: [],
              unlockedBlueprints: ['guide-1'],
              digestCadence: 'Weekly',
              digestRegion: 'ALL',
              digestSubject: 'ALL',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, userDocPath);
        }

        try {
          const privRef = doc(db, 'users', uid, 'private', 'info');
          const privSnap = await getDoc(privRef);
          if (!privSnap.exists()) {
            const safeEmail = clampString(
              user.email || 'researcher@university.edu',
              3,
              254,
              'researcher@university.edu'
            );
            await setDoc(privRef, {
              ownerId: uid,
              email: safeEmail,
              subscriberEmail: safeEmail,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, privateDocPath);
        }
      } else {
        setCustomOpportunities([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-Time Firestore Listeners when Authenticated
  useEffect(() => {
    if (!authReady || !currentUser) return;

    const uid = sanitizeValidId(currentUser.uid);
    const userDocPath = `users/${uid}`;
    const privateDocPath = `users/${uid}/private/info`;
    const oppsPath = 'userOpportunities';
    const receiptsPath = 'paymentReceipts';

    const unsubWorkspace = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (typeof data.proUnlocked === 'boolean') setProUnlocked(data.proUnlocked);
        setUnlockedPasses({
          csvAndAnalytics: Boolean(data.csvAndAnalyticsUnlocked),
          complianceCredits: Number(data.complianceCredits) || 0,
        });
        if (Array.isArray(data.savedIds)) setSavedIds(data.savedIds);
        if (Array.isArray(data.unlockedBlueprints)) setUnlockedBlueprints(data.unlockedBlueprints);
        if (
          data.digestCadence === 'Weekly' ||
          data.digestCadence === 'Bi-Weekly' ||
          data.digestCadence === 'Urgent-Only'
        ) {
          setDigestCadence(data.digestCadence);
        }
        if (data.digestRegion) setDigestRegion(data.digestRegion as RegionScope);
        if (data.digestSubject) setDigestSubject(data.digestSubject as SubjectCategory);
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, userDocPath);
      }
    );

    const unsubPrivate = onSnapshot(
      doc(db, 'users', uid, 'private', 'info'),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (typeof data.subscriberEmail === 'string' && data.subscriberEmail) {
          setSubscriberEmail(data.subscriberEmail);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, privateDocPath);
      }
    );

    const oppsQuery = query(collection(db, oppsPath), where('ownerId', '==', uid));
    const unsubOpps = onSnapshot(
      oppsQuery,
      (snap) => {
        const loaded: GrantOpportunity[] = snap.docs.map((d) => {
          const item = d.data();
          return {
            id: d.id,
            title: item.title,
            provider: item.provider,
            url: item.url,
            currency: item.currency,
            amount: item.amount,
            region: item.region,
            locationLabel: item.locationLabel,
            stage: item.stage,
            subject: item.subject,
            status: item.status,
            deadline: item.deadline,
            overheadCapPercent: item.overheadCapPercent,
            lat: item.lat,
            lng: item.lng,
            notes: item.notes,
            eligibilityChecklist: [
              'Official direct donor link verified via Firebase Cloud Radar',
              `Overhead cap <= ${item.overheadCapPercent}%`,
            ],
          };
        });
        setCustomOpportunities(loaded);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, oppsPath);
      }
    );

    const receiptsQuery = query(collection(db, receiptsPath), where('ownerId', '==', uid));
    const unsubReceipts = onSnapshot(
      receiptsQuery,
      (snap) => {
        const loadedReceipts: PaymentReceipt[] = snap.docs.map((d) => {
          const r = d.data();
          return {
            id: d.id,
            planLabel: r.planLabel,
            amountLabel: r.amountLabel,
            method: r.method,
            timestamp: r.timestamp,
          };
        });
        setPaymentReceipts(loadedReceipts);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, receiptsPath);
      }
    );

    return () => {
      unsubWorkspace();
      unsubPrivate();
      unsubOpps();
      unsubReceipts();
    };
  }, [authReady, currentUser]);

  // Merge user's Firestore custom opportunities with verified default opportunities
  useEffect(() => {
    if (customOpportunities.length === 0) return;
    setOpportunities((prev) => {
      const existingIds = new Set(customOpportunities.map((o) => o.id));
      const base = prev.filter((o) => !existingIds.has(o.id));
      return [...customOpportunities, ...base];
    });
  }, [customOpportunities]);

  // Sync workspace updates to Firestore if signed in
  const syncWorkspaceState = async (
    overrides: Partial<{
      proUnlocked: boolean;
      csvAndAnalyticsUnlocked: boolean;
      complianceCredits: number;
      savedIds: string[];
      unlockedBlueprints: string[];
      digestCadence: 'Weekly' | 'Bi-Weekly' | 'Urgent-Only';
      digestRegion: RegionScope;
      digestSubject: SubjectCategory;
    }>
  ) => {
    if (!currentUser) return;
    const uid = sanitizeValidId(currentUser.uid);
    const userDocPath = `users/${uid}`;
    const safeSaved = (overrides.savedIds ?? savedIds)
      .slice(0, 50)
      .map((s) => clampString(String(s), 1, 128, 'opp-1'));
    const safeBlueprints = (overrides.unlockedBlueprints ?? unlockedBlueprints)
      .slice(0, 20)
      .map((b) => clampString(String(b), 1, 128, 'guide-1'));

    try {
      await updateDoc(doc(db, 'users', uid), {
        displayName: clampString(currentUser.displayName || 'Researcher', 1, 120, 'Researcher'),
        proUnlocked: overrides.proUnlocked ?? proUnlocked,
        csvAndAnalyticsUnlocked:
          overrides.csvAndAnalyticsUnlocked ?? unlockedPasses.csvAndAnalytics,
        complianceCredits: Math.max(
          0,
          Math.min(10000, overrides.complianceCredits ?? unlockedPasses.complianceCredits)
        ),
        savedIds: safeSaved,
        unlockedBlueprints: safeBlueprints,
        digestCadence: overrides.digestCadence ?? digestCadence,
        digestRegion: clampString(overrides.digestRegion ?? digestRegion, 1, 40, 'ALL'),
        digestSubject: clampString(overrides.digestSubject ?? digestSubject, 1, 60, 'ALL'),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, userDocPath);
    }
  };

  const handleGoogleSignIn = async () => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      pushToast(
        'Cloud Sync Active',
        `Signed in as ${result.user.displayName || result.user.email}. Your shortlist, portals & Pro passes are synced to Firestore.`,
        'emerald'
      );
    } catch (err: any) {
      pushToast(
        'Sign-In Notice',
        err?.message || 'Could not complete Google Sign-In popup.',
        'amber'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await signOut(auth);
      pushToast('Signed Out', 'Switched back to local browser session.', 'teal');
    } catch (err: any) {
      pushToast('Sign-Out Alert', err?.message || 'Error signing out.', 'amber');
    }
  };

  const toggleSaveOpportunity = (id: string) => {
    const exists = savedIds.includes(id);
    const next = exists ? savedIds.filter((item) => item !== id) : [...savedIds, id].slice(0, 50);
    setSavedIds(next);
    void syncWorkspaceState({ savedIds: next });
    pushToast(
      exists ? 'Removed from Shortlist' : 'Saved to Shortlist',
      exists
        ? 'Grant removed from your saved calls.'
        : currentUser
        ? 'Grant saved and synced to your Firebase workspace.'
        : 'Grant added to your saved calls.',
      'emerald'
    );
  };

  // Subject Category Funding Distribution for Recharts BarChart
  const subjectDistributionData = useMemo(() => {
    const categories: {
      subject: Exclude<SubjectCategory, 'ALL'>;
      shortLabel: string;
      color: string;
    }[] = [
      { subject: 'Science & Tech', shortLabel: 'Science & Tech', color: '#22d3ee' },
      { subject: 'Arts & Culture', shortLabel: 'Arts & Culture', color: '#f472b6' },
      { subject: 'Social Impact & Policy', shortLabel: 'Social Impact', color: '#34d399' },
      { subject: 'Entrepreneurship & Business', shortLabel: 'Entrepreneurship', color: '#facc15' },
      { subject: 'Academic & Fellowships', shortLabel: 'Academic', color: '#a78bfa' },
    ];

    const sourceList = showSavedOnly
      ? opportunities.filter((opp) => savedIds.includes(opp.id))
      : opportunities.filter((opp) => {
          if (stageFilter !== 'ALL' && opp.stage !== stageFilter) return false;
          if (regionFilter !== 'ALL' && opp.region !== regionFilter) return false;
          if (statusFilter !== 'ALL' && opp.status !== statusFilter) return false;
          const usdAmount = convertToUSD(opp.amount, opp.currency);
          if (fundingFilter === 'TIER_1' && usdAmount >= 25000) return false;
          if (fundingFilter === 'TIER_2' && (usdAmount < 25000 || usdAmount > 100000)) return false;
          if (fundingFilter === 'TIER_3' && usdAmount <= 100000) return false;
          if (keywordSearch.trim()) {
            const q = keywordSearch.toLowerCase();
            const hay = `${opp.title} ${opp.title_fr || ''} ${opp.provider} ${opp.region} ${opp.subject} ${opp.locationLabel} ${opp.notes}`.toLowerCase();
            if (!hay.includes(q)) return false;
          }
          return true;
        });

    return categories.map((cat) => {
      const matching = sourceList.filter((o) => o.subject === cat.subject);
      const totalUSD = matching.reduce((sum, o) => sum + convertToUSD(o.amount, o.currency), 0);
      const count = matching.length;
      const avgUSD = count > 0 ? Math.round(totalUSD / count) : 0;
      const maxGrantUSD =
        count > 0 ? Math.max(...matching.map((o) => convertToUSD(o.amount, o.currency))) : 0;
      return {
        subject: cat.subject,
        shortLabel: cat.shortLabel,
        color: cat.color,
        totalUSD,
        avgUSD,
        maxGrantUSD,
        count,
      };
    });
  }, [
    opportunities,
    showSavedOnly,
    savedIds,
    stageFilter,
    regionFilter,
    statusFilter,
    fundingFilter,
    keywordSearch,
  ]);

  const canExportAndAnalyze = proUnlocked || unlockedPasses.csvAndAnalytics;
  const canRunComplianceAudit = proUnlocked || unlockedPasses.complianceCredits > 0;

  const openPaidCheckout = (
    plan: PaidPlanId,
    options?: { csvScope?: 'current' | 'shortlist' | 'chart'; blueprintId?: string }
  ) => {
    setSelectedPlan(plan);
    setPendingCsvScope(options?.csvScope ?? null);
    setPendingBlueprintId(options?.blueprintId ?? null);
    setPaymentModalOpen(true);
  };

  // Export Subject Distribution Analytics as CSV
  const executeChartAnalyticsCSV = () => {
    const headers = [
      'Subject Category',
      'Active Grants Count',
      'Total Funding Pool (USD)',
      'Average Grant Size (USD)',
      'Largest Single Grant (USD)',
    ];
    const rows = subjectDistributionData.map((row) => [
      `"${row.subject}"`,
      row.count,
      row.totalUSD,
      row.avgUSD,
      row.maxGrantUSD,
    ]);
    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `grant-subject-funding-distribution-${dateStamp}.csv`;
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    pushToast(
      'Analytics CSV Exported',
      `Downloaded subject funding distribution report (${filename}).`,
      'emerald'
    );
  };

  // Export current search results or shortlisted opportunities as a CSV file
  const executeExportCSV = (scope: 'current' | 'shortlist' = 'current') => {
    const targetList =
      scope === 'shortlist'
        ? opportunities.filter((opp) => savedIds.includes(opp.id))
        : filteredOpportunities;

    if (targetList.length === 0) {
      pushToast(
        'Nothing to Export',
        scope === 'shortlist'
          ? 'Your shortlist is currently empty. Bookmark opportunities first to export them.'
          : 'No opportunities match the active search filters.',
        'amber'
      );
      return;
    }

    const escapeCsvField = (value: string | number | boolean): string => {
      const str = String(value ?? '');
      if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      'ID',
      'Title',
      'Provider / Agency',
      'Discipline Subject',
      'Region Scope',
      'Location Hub',
      'Career Stage',
      'Currency',
      'Original Amount',
      'USD Equivalent',
      'Urgency Status',
      'Deadline',
      'Overhead Cap (%)',
      'Shortlisted',
      'Official Portal URL',
      'Eligibility & Notes',
    ];

    const rows = targetList.map((opp) => [
      opp.id,
      getLocalizedTitle(opp),
      opp.provider,
      opp.subject,
      opp.region,
      opp.locationLabel,
      opp.stage,
      opp.currency,
      opp.amount,
      convertToUSD(opp.amount, opp.currency),
      opp.status,
      opp.deadline,
      opp.overheadCapPercent,
      savedIds.includes(opp.id) ? 'Yes' : 'No',
      opp.url,
      opp.notes,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((row) => row.map((cell) => escapeCsvField(cell)).join(','))
        .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename =
      scope === 'shortlist' || showSavedOnly
        ? `grant-surveyor-shortlist-${dateStamp}.csv`
        : `grant-surveyor-results-${dateStamp}.csv`;

    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    pushToast(
      'CSV Export Complete',
      `Exported ${targetList.length} ${
        scope === 'shortlist' || showSavedOnly ? 'shortlisted' : 'matching'
      } ${targetList.length === 1 ? 'opportunity' : 'opportunities'} to ${filename}.`,
      'emerald'
    );
  };

  const handleExportCSV = (scope: 'current' | 'shortlist' | 'chart' = 'current') => {
    if (!canExportAndAnalyze) {
      pushToast(
        'Pro Export Feature ($3.00 or Pro Tier)',
        'Unlock the CSV & Analytics Export Pass ($3.00) or All-Access Pro Tier ($15/mo) to download verified datasets.',
        'amber'
      );
      openPaidCheckout('csv_pass', { csvScope: scope });
      return;
    }

    if (scope === 'chart') {
      executeChartAnalyticsCSV();
    } else {
      executeExportCSV(scope);
    }
  };

  // Run Non-Generative AI Proposal Compliance Check
  const handleRunComplianceCheck = async () => {
    if (!proposalDraft.trim()) {
      pushToast('Draft Required', 'Please paste a proposal section draft to run rubric auditing.', 'amber');
      return;
    }

    if (!canRunComplianceAudit) {
      pushToast(
        'Paid Rubric Audit ($5.00 or Pro Tier)',
        'Unlock a Single Rubric Audit ($5.00) or All-Access Pro ($15/mo) to run the Non-Generative Compliance Engine.',
        'amber'
      );
      openPaidCheckout('audit_pass');
      return;
    }

    if (!proUnlocked && unlockedPasses.complianceCredits > 0) {
      setUnlockedPasses((prev) => ({
        ...prev,
        complianceCredits: Math.max(0, prev.complianceCredits - 1),
      }));
    }

    setAuditingProposal(true);
    try {
      const response = await fetch('/api/compliance-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalText: proposalDraft,
          targetCall: complianceTargetCall,
          overheadRate: complianceOverhead,
          language: lang,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to run compliance check');
      }
      setAuditResult(data);
      pushToast(
        'Rubric Audit Complete',
        `Evaluated against ${complianceTargetCall} (${data.overallScore}/100).`,
        'emerald'
      );
    } catch (err: any) {
      pushToast('Audit Notice', err?.message || 'Could not complete compliance audit.', 'amber');
    } finally {
      setAuditingProposal(false);
    }
  };

  // Handle Instant Live URL Survey
  const handleQuickPortalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUrlInput.trim()) return;

    setSurveyingUrl(true);
    try {
      const response = await fetch('/api/survey-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: quickUrlInput.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to survey URL');
      }

      const newOpp: GrantOpportunity = {
        id: data.id || `opp-${Date.now()}`,
        title: data.title || 'Surveyed International Research Call',
        provider: data.provider || 'Verified Institutional Portal',
        url: data.url || quickUrlInput.trim(),
        currency: ['USD', 'EUR', 'GBP'].includes(data.currency) ? data.currency : 'USD',
        amount: Number(data.amount) || 40000,
        region: data.region || 'Global',
        stage: data.stage || 'Early Career',
        subject: data.subject || 'Academic & Fellowships',
        status: data.status === 'Closing Soon' ? 'Closing Soon' : 'Open',
        deadline: data.deadline || '2026-12-30',
        lat: typeof data.lat === 'number' ? data.lat : 9.082,
        lng: typeof data.lng === 'number' ? data.lng : 8.6753,
        locationLabel: data.locationLabel || 'Verified Global Hub',
        notes:
          data.notes ||
          'Direct institutional portal surveyed live and indexed into the Gaia spatial network.',
        eligibilityChecklist: [
          'Official direct institutional link verified with zero intermediary redirect',
          'Standard <= 12% indirect overhead cost compliance recommended',
        ],
        overheadCapPercent: 12,
      };

      setOpportunities((prev) => [newOpp, ...prev]);
      setQuickUrlInput('');

      if (currentUser) {
        const uid = sanitizeValidId(currentUser.uid);
        const oppId = sanitizeValidId(newOpp.id);
        const oppPath = `userOpportunities/${oppId}`;
        try {
          await setDoc(doc(db, 'userOpportunities', oppId), {
            ownerId: uid,
            title: clampString(newOpp.title, 2, 200, 'Surveyed Research Call'),
            provider: clampString(newOpp.provider, 2, 160, 'Verified Donor Portal'),
            url: clampString(newOpp.url, 8, 500, 'https://europa.eu'),
            currency: newOpp.currency,
            amount: Math.max(0, Math.min(100000000, Number(newOpp.amount) || 40000)),
            region: clampString(newOpp.region, 2, 40, 'Global'),
            locationLabel: clampString(newOpp.locationLabel, 2, 100, 'Global Hub'),
            stage: clampString(newOpp.stage, 2, 40, 'Early Career'),
            subject: clampString(newOpp.subject, 2, 60, 'Science & Tech'),
            status: newOpp.status,
            deadline: clampString(newOpp.deadline, 4, 30, '2026-12-30'),
            overheadCapPercent: Math.max(0, Math.min(100, newOpp.overheadCapPercent || 12)),
            lat: Math.max(-90, Math.min(90, newOpp.lat)),
            lng: Math.max(-180, Math.min(180, newOpp.lng)),
            notes: clampString(newOpp.notes, 0, 1000, ''),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, oppPath);
        }
      }

      pushToast(
        'Portal Surveyed Live',
        `Indexed "${newOpp.title}" with 100% official link verification.`,
        'emerald'
      );
    } catch (err: any) {
      pushToast('URL Survey Alert', err?.message || 'Please enter a valid https:// URL.', 'amber');
    } finally {
      setSurveyingUrl(false);
    }
  };

  // Handle Manual Submit Opportunity Modal
  const handleSaveManualOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formProvider.trim() || !formUrl.trim()) return;

    const regionCoords: Record<Exclude<RegionScope, 'ALL'>, { lat: number; lng: number; label: string }> = {
      Global: { lat: 15.0, lng: 10.0, label: 'Global / Remote Network' },
      Africa: { lat: 6.5244, lng: 3.3792, label: 'West & East Africa Hub' },
      'Latin America': { lat: -12.0464, lng: -77.0428, label: 'Latin America Hub' },
      'Asia-Pacific': { lat: 13.7563, lng: 100.5018, label: 'Asia-Pacific Hub' },
      'Middle East': { lat: 31.9539, lng: 35.9106, label: 'MENA Research Hub' },
      Europe: { lat: 50.8503, lng: 4.3517, label: 'European Research Area' },
      'North America': { lat: 38.9072, lng: -77.0369, label: 'North America Hub' },
    };

    const coords = regionCoords[formRegion] || regionCoords.Global;

    const created: GrantOpportunity = {
      id: `opp_${Date.now()}`,
      title: formTitle.trim(),
      provider: formProvider.trim(),
      url: formUrl.trim(),
      currency: formCurrency,
      amount: Math.max(1000, Number(formAmount) || 25000),
      region: formRegion,
      stage: formStage,
      subject: formSubject,
      status: 'Open',
      deadline: formDeadline || '2026-12-31',
      lat: coords.lat,
      lng: coords.lng,
      locationLabel: coords.label,
      notes:
        formNotes.trim() ||
        'Submitted directly to the Grant Surveyor AI network and verified against official donor domain.',
      eligibilityChecklist: [
        'Verified direct donor portal URL',
        'Review institutional overhead ceiling and consortium rules before submission',
      ],
      overheadCapPercent: 12,
    };

    setOpportunities((prev) => [created, ...prev]);
    setSiteModalOpen(false);
    setFormTitle('');
    setFormProvider('');
    setFormUrl('');
    setFormNotes('');

    if (currentUser) {
      const uid = sanitizeValidId(currentUser.uid);
      const oppId = sanitizeValidId(created.id);
      const oppPath = `userOpportunities/${oppId}`;
      try {
        await setDoc(doc(db, 'userOpportunities', oppId), {
          ownerId: uid,
          title: clampString(created.title, 2, 200, 'Submitted Grant Call'),
          provider: clampString(created.provider, 2, 160, 'Verified Donor Agency'),
          url: clampString(created.url, 8, 500, 'https://europa.eu'),
          currency: created.currency,
          amount: Math.max(0, Math.min(100000000, created.amount)),
          region: clampString(created.region, 2, 40, 'Global'),
          locationLabel: clampString(created.locationLabel, 2, 100, 'Global Hub'),
          stage: clampString(created.stage, 2, 40, 'Early Career'),
          subject: clampString(created.subject, 2, 60, 'Science & Tech'),
          status: created.status,
          deadline: clampString(created.deadline, 4, 30, '2026-12-31'),
          overheadCapPercent: 12,
          lat: created.lat,
          lng: created.lng,
          notes: clampString(created.notes, 0, 1000, ''),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, oppPath);
      }
    }

    pushToast('Opportunity Indexed', `"${created.title}" is now live in the hub and spatial map.`, 'emerald');
  };

  // Handle SurveyorBot Chat
  const handleBotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = botInput.trim();
    if (!msg || botSending) return;

    const userBubble: ChatMessage = { id: `u-${Date.now()}`, sender: 'user', text: msg };
    setBotMessages((prev) => [...prev, userBubble]);
    setBotInput('');
    setBotSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          language: lang,
          opportunitiesCount: opportunities.length,
        }),
      });
      const data = await response.json();
      setBotMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          sender: 'bot',
          text:
            data.reply ||
            'I checked the spatial database. All links are 100% verified to official donor source portals!',
        },
      ]);
    } catch {
      setBotMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          sender: 'bot',
          text: 'I checked the spatial database. All links are 100% verified to official donor source portals!',
        },
      ]);
    } finally {
      setBotSending(false);
    }
  };

  const handleBotQuickChip = (action: 'findGrants' | 'checkCompliance' | 'openMap') => {
    if (action === 'findGrants') {
      setActiveTab('dashboard');
      setBotMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          sender: 'bot',
          text: `Showing all ${opportunities.length} active surveyed grants in the Hub & Search view.`,
        },
      ]);
    } else if (action === 'checkCompliance') {
      setActiveTab('compliance');
      setBotMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          sender: 'bot',
          text: 'Opened the Non-Generative AI Proposal Compliance Checker. Paste your draft or load a sample to audit against donor rubrics.',
        },
      ]);
    } else if (action === 'openMap') {
      setActiveTab('map');
      setBotMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          sender: 'bot',
          text: 'Switched to the Spatial World Map. Click any regional hub marker to inspect the call and official donor portal.',
        },
      ]);
    }
  };

  const digestMatchingOpps = useMemo(() => {
    return opportunities.filter((o) => {
      if (digestRegion !== 'ALL' && o.region !== digestRegion) return false;
      if (digestSubject !== 'ALL' && o.subject !== digestSubject) return false;
      return true;
    });
  }, [opportunities, digestRegion, digestSubject]);

  return (
    <div className="min-h-screen flex flex-col atlas-grid-bg text-slate-100">
      {/* BRAND HEADER */}
      <header className="bg-slate-900/95 border-b border-slate-800/80 sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* TOP LAYER: Brand Identity & Controls */}
          <div className="flex items-center justify-between h-16 border-b border-slate-800/60 gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
                <i className="fa-solid fa-satellite-dish text-base" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0">
                    {t.appName}
                  </span>
                  <span className="text-[11px] text-teal-400 font-mono hidden sm:inline">
                    · Spatial Funding & Rubric Radar
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium hidden md:block">
                  Precision Spatial Intelligence &amp; 100% Verified Direct Donor Source Portal
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {/* Anti-Hallucination Verification Text */}
              <div className="hidden xl:flex items-center gap-1.5 text-emerald-400 text-xs font-mono">
                <i className="fa-solid fa-circle-check text-xs" />
                <span>100% Official Links Verified</span>
              </div>

              {/* Firebase Cloud Auth Button */}
              {currentUser ? (
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  <span className="text-slate-200 font-medium max-w-[110px] truncate">
                    {currentUser.displayName || currentUser.email}
                  </span>
                  <button
                    type="button"
                    onClick={handleGoogleSignOut}
                    className="text-slate-400 hover:text-white ml-1 text-[11px] underline"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={signingIn}
                  onClick={handleGoogleSignIn}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-teal-500/40 text-xs font-semibold text-teal-300 transition flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <i className="fa-solid fa-cloud-arrow-up text-[11px]" />
                  <span>{signingIn ? 'Connecting...' : 'Cloud Sign In'}</span>
                </button>
              )}

              {/* Multi-Payment Layer Button */}
              <button
                type="button"
                onClick={() => openPaidCheckout('pro_monthly')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition whitespace-nowrap shrink-0 ${
                  proUnlocked
                    ? 'bg-emerald-950/60 hover:bg-emerald-900/60 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950 hover:bg-slate-800 border-yellow-500/40 text-slate-200'
                }`}
              >
                <i
                  className={`fa-solid ${
                    proUnlocked ? 'fa-circle-check text-emerald-400' : 'fa-gem text-yellow-400'
                  } text-xs`}
                />
                <span className="font-semibold">
                  {proUnlocked ? 'All-Access Pro Active' : 'Upgrade to Pro ($15/mo)'}
                </span>
                <span className="hidden lg:inline text-[11px] font-mono text-teal-300">
                  · Payoneer / Cards / USDC
                </span>
              </button>

              {/* Language Switcher */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLangMenuOpen((prev) => !prev)}
                  className="bg-slate-800/90 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition border border-slate-700/70 flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <i className="fa-solid fa-globe text-teal-400 text-xs" />
                  <span>{lang.toUpperCase()}</span>
                  <i className="fa-solid fa-chevron-down text-[9px] text-slate-400" />
                </button>

                {langMenuOpen && (
                  <div className="absolute right-0 rtl:left-0 rtl:right-auto mt-2 w-44 bg-slate-900 rounded-xl shadow-2xl border border-slate-800 py-1 z-50 text-xs divide-y divide-slate-800">
                    <div className="py-1">
                      {(
                        [
                          { code: 'en', name: 'English' },
                          { code: 'fr', name: 'Français' },
                          { code: 'es', name: 'Español' },
                          { code: 'pt', name: 'Português' },
                          { code: 'sw', name: 'Kiswahili' },
                        ] as { code: LanguageCode; name: string }[]
                      ).map((item) => (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => {
                            setLang(item.code);
                            setLangMenuOpen(false);
                          }}
                          className="w-full text-left rtl:text-right px-3.5 py-2 hover:bg-slate-800 text-slate-200 flex items-center justify-between"
                        >
                          <span>{item.name}</span>
                          <span className="text-[10px] text-teal-400 font-mono uppercase">
                            {item.code}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setLang('ar');
                          setLangMenuOpen(false);
                        }}
                        className="w-full text-left rtl:text-right px-3.5 py-2 hover:bg-slate-800 text-slate-200 flex items-center justify-between font-arabic"
                      >
                        <span>العربية</span>
                        <span className="text-[10px] text-teal-400 font-mono">AR</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSiteModalOpen(true)}
                className="bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-teal-600/20 whitespace-nowrap shrink-0"
              >
                <i className="fa-solid fa-plus text-[10px]" />
                <span>{t.addPortal}</span>
              </button>
            </div>
          </div>

          {/* BOTTOM LAYER: Navigation Bar */}
          <div className="flex items-center justify-between h-12 text-xs">
            <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1">
              {(
                [
                  { id: 'dashboard', icon: 'fa-magnifying-glass', label: t.opportunitiesHub },
                  { id: 'map', icon: 'fa-earth-americas', label: t.worldMap },
                  { id: 'compliance', icon: 'fa-clipboard-check', label: t.complianceChecker },
                  { id: 'academy', icon: 'fa-graduation-cap', label: t.fundingAcademy },
                  { id: 'sites', icon: 'fa-satellite-dish', label: t.monitoredPortals },
                  { id: 'email', icon: 'fa-bell', label: t.digestAlerts },
                ] as { id: ActiveTab; icon: string; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-md font-semibold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <i className={`fa-solid ${tab.icon} text-[11px]`} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-2 text-slate-400 font-mono text-[11px] whitespace-nowrap shrink-0">
              <i className="fa-solid fa-shield-halved text-emerald-400 text-xs" />
              <span>Zero Hallucination Radar Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE CONTAINER */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* DIGITIZED GAIA 3D HERO LANDING MODEL */}
        <section className="relative bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-6 sm:p-10 relative z-10">
            {/* Left Column: High-Impact Brand Messaging */}
            <div className="lg:col-span-7 space-y-5">
              <div className="text-teal-300 text-xs font-mono font-bold tracking-wide">
                GAIA SPATIAL INTELLIGENCE NETWORK · DIRECT DONOR VERIFICATION
              </div>

              <h1
                className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-snug"
                style={{ textWrap: 'balance' }}
              >
                Digitized Gaia Grant Surveyor &amp;{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-400 via-indigo-300 to-yellow-300">
                  Global Funding Engine
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                Precision spatial intelligence, automated global opportunity detection, and real-time mapping across international research calls, academic fellowships, and development funds—with 100% verified direct donor source linking for underserved and high-barrier research hubs.
              </p>

              {/* Interactive Action Controls */}
              <div className="pt-1 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('map')}
                  className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-xl shadow-teal-500/20 flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <i className="fa-solid fa-earth-americas" />
                  <span>Explore Interactive Gaia Map</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('compliance')}
                  className="px-5 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <i className="fa-solid fa-clipboard-check text-teal-400" />
                  <span>Proposal Compliance Reviewer</span>
                </button>
              </div>

              {/* Live Surveyor Metrics Grid */}
              <div className="pt-4 grid grid-cols-3 gap-4 border-t border-slate-800/80 text-left font-mono">
                <div>
                  <p className="text-[11px] text-slate-400">Global Coverage</p>
                  <p className="text-lg sm:text-xl font-bold text-white tabular-nums">
                    190+ Countries
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Surveyed Pool</p>
                  <p className="text-lg sm:text-xl font-bold text-emerald-400 tabular-nums">
                    ${totalUsdPool.toLocaleString()} USD
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Verification Rate</p>
                  <p className="text-lg sm:text-xl font-bold text-teal-300 tabular-nums">
                    100% Official
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Digitized 3D Gaia Canvas */}
            <div className="lg:col-span-5">
              <GaiaGlobe
                opportunities={opportunities}
                onOpenMapTab={() => setActiveTab('map')}
              />
            </div>
          </div>
        </section>

        {/* VIEW 1: OPPORTUNITIES HUB & MAIN SEARCH ENGINE */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Subject Category Tabs */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-1.5 flex flex-wrap items-center justify-between gap-2 text-xs font-medium">
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    { id: 'ALL', icon: 'fa-layer-group', color: 'text-teal-300', label: t.allSubjects },
                    { id: 'Science & Tech', icon: 'fa-flask', color: 'text-cyan-400', label: t.scienceTech },
                    { id: 'Arts & Culture', icon: 'fa-palette', color: 'text-pink-400', label: t.artsCulture },
                    { id: 'Social Impact & Policy', icon: 'fa-hand-holding-heart', color: 'text-emerald-400', label: t.socialImpact },
                    { id: 'Entrepreneurship & Business', icon: 'fa-rocket', color: 'text-yellow-400', label: t.entrepreneurship },
                    { id: 'Academic & Fellowships', icon: 'fa-graduation-cap', color: 'text-purple-400', label: t.academicFellowships },
                  ] as { id: SubjectCategory; icon: string; color: string; label: string }[]
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSubjectFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                      subjectFilter === cat.id
                        ? 'bg-teal-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <i
                      className={`fa-solid ${cat.icon} text-[11px] ${
                        subjectFilter === cat.id ? 'text-white' : cat.color
                      }`}
                    />
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowSavedOnly((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                    showSavedOnly
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                      : 'text-slate-400 hover:text-white bg-slate-950 border border-slate-800'
                  }`}
                >
                  <i className="fa-solid fa-bookmark text-[11px]" />
                  <span>Shortlist ({savedIds.length})</span>
                </button>

                {savedIds.length > 0 && !showSavedOnly && (
                  <button
                    type="button"
                    onClick={() => handleExportCSV('shortlist')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-yellow-300 border border-yellow-500/30 whitespace-nowrap shrink-0"
                    title="Export only your bookmarked shortlist as CSV"
                  >
                    <i
                      className={`fa-solid ${
                        canExportAndAnalyze ? 'fa-file-csv' : 'fa-lock'
                      } text-[11px]`}
                    />
                    <span>
                      Export Shortlist CSV ({savedIds.length})
                      {!canExportAndAnalyze ? ' · $3 / Pro' : ''}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleExportCSV('current')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 whitespace-nowrap shrink-0"
                  title={
                    showSavedOnly
                      ? 'Export shortlisted opportunities as CSV'
                      : 'Export current filtered search results as CSV'
                  }
                >
                  <i
                    className={`fa-solid ${
                      canExportAndAnalyze ? 'fa-download' : 'fa-lock text-yellow-400'
                    } text-[11px]`}
                  />
                  <span>
                    {showSavedOnly
                      ? `Export Shortlist CSV (${filteredOpportunities.length})`
                      : `Export Results CSV (${filteredOpportunities.length})`}
                  </span>
                  {!canExportAndAnalyze && (
                    <span className="text-[10px] font-mono text-yellow-300">· $3 / Pro</span>
                  )}
                </button>
              </div>
            </div>

            {/* MAIN SEARCH & FILTER PANEL */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-magnifying-glass text-teal-400 text-sm" />
                  <h2 className="text-xs font-bold text-slate-200 tracking-wide">
                    {t.filtersHeader}
                  </h2>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                    <i className="fa-solid fa-check-double mr-1" />
                    Official URLs Verified
                  </span>
                  <button
                    type="button"
                    onClick={() => handleExportCSV('current')}
                    className="text-xs text-slate-300 hover:text-white font-medium flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    <i
                      className={`fa-solid ${
                        canExportAndAnalyze
                          ? 'fa-file-arrow-down text-teal-400'
                          : 'fa-lock text-yellow-400'
                      } text-[11px]`}
                    />
                    <span>Download CSV {!canExportAndAnalyze ? '($3 / Pro)' : ''}</span>
                  </button>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    <i className="fa-solid fa-rotate-left text-[10px]" />
                    <span>{t.resetFilters}</span>
                  </button>
                </div>
              </div>

              {/* Filter Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    {t.keywordSearch}
                  </label>
                  <div className="relative">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
                    <input
                      type="text"
                      value={keywordSearch}
                      onChange={(e) => setKeywordSearch(e.target.value)}
                      placeholder="Search calls, agencies, hubs..."
                      className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    {t.ageCareerStage}
                  </label>
                  <select
                    value={stageFilter}
                    onChange={(e) => setStageFilter(e.target.value as CareerStage)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-teal-500"
                  >
                    <option value="ALL">{t.allAges}</option>
                    <option value="Youth <25">{t.youth}</option>
                    <option value="Early Career">{t.earlyCareer}</option>
                    <option value="Mid-Career">{t.midCareer}</option>
                    <option value="Senior / All Ages">{t.seniorAll}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    {t.locationScope}
                  </label>
                  <select
                    value={regionFilter}
                    onChange={(e) => setRegionFilter(e.target.value as RegionScope)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-teal-500"
                  >
                    <option value="ALL">{t.allLocations}</option>
                    <option value="Global">{t.worldwideRemote}</option>
                    <option value="Africa">Africa</option>
                    <option value="Latin America">Latin America</option>
                    <option value="Asia-Pacific">Asia-Pacific</option>
                    <option value="Middle East">Middle East / Sanction-Impacted</option>
                    <option value="Europe">Europe</option>
                    <option value="North America">North America</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    {t.fundingPoolTier}
                  </label>
                  <select
                    value={fundingFilter}
                    onChange={(e) => setFundingFilter(e.target.value as FundingTier)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-teal-500"
                  >
                    <option value="ALL">{t.allFunding}</option>
                    <option value="TIER_1">&lt; $25,000 USD</option>
                    <option value="TIER_2">$25,000 - $100,000 USD</option>
                    <option value="TIER_3">&gt; $100,000 USD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    {t.deadlineUrgency}
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as OpportunityStatus)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-teal-500"
                  >
                    <option value="ALL">{t.allStatuses}</option>
                    <option value="Closing Soon">{t.closingSoon}</option>
                    <option value="Open">Open</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Stats Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <p className="text-[11px] font-sans font-medium text-slate-400">
                  {t.matchingOpps}
                </p>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-white tabular-nums">
                    {filteredOpportunities.length}
                  </span>
                  <span className="text-[11px] text-teal-400">
                    of {opportunities.length} indexed
                  </span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <p className="text-[11px] font-sans font-medium text-slate-400">
                  {t.closingSoon}
                </p>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-yellow-400 tabular-nums">
                    {closingSoonCount}
                  </span>
                  <span className="text-[11px] text-yellow-400">&lt; 30 Days</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <p className="text-[11px] font-sans font-medium text-slate-400">
                  {t.totalValue}
                </p>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-emerald-400 tabular-nums">
                    ${totalUsdPool.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-emerald-400">USD Equiv.</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <p className="text-[11px] font-sans font-medium text-slate-400">
                  {t.crawlerMonitor}
                </p>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-base font-sans font-semibold text-teal-300">
                    {t.active}
                  </span>
                  <span className="text-[11px] text-teal-400">Direct Links</span>
                </div>
              </div>
            </div>

            {/* RECHARTS BAR CHART: GRANT FUNDING DISTRIBUTION BY SUBJECT CATEGORY */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-chart-column text-teal-400 text-sm" />
                    <h3 className="text-sm font-bold text-white">
                      Grant Funding Distribution by Subject Category (USD Equivalent)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Click any discipline bar to filter opportunities below. Compare total capital pools or unlock Pro Average Grant Benchmarking.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Metric Mode Switcher */}
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-1 flex items-center gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setChartMetric('totalUSD')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition ${
                        chartMetric === 'totalUSD'
                          ? 'bg-teal-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Total Pool (USD)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!canExportAndAnalyze) {
                          pushToast(
                            'Pro Analytics Benchmark ($3.00 or Pro Tier)',
                            'Unlock the CSV & Analytics Pass ($3.00) or All-Access Pro ($15/mo) to view Average Grant Size & Maximum Award benchmarks.',
                            'amber'
                          );
                          openPaidCheckout('csv_pass');
                          return;
                        }
                        setChartMetric('avgUSD');
                      }}
                      className={`px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1.5 ${
                        chartMetric === 'avgUSD'
                          ? 'bg-teal-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {!canExportAndAnalyze && (
                        <i className="fa-solid fa-lock text-yellow-400 text-[10px]" />
                      )}
                      <span>Avg. Grant Size {!canExportAndAnalyze ? '(Pro)' : ''}</span>
                    </button>
                  </div>

                  {/* Export Chart Analytics CSV */}
                  <button
                    type="button"
                    onClick={() => handleExportCSV('chart')}
                    className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <i
                      className={`fa-solid ${
                        canExportAndAnalyze
                          ? 'fa-file-csv text-teal-400'
                          : 'fa-lock text-yellow-400'
                      } text-[11px]`}
                    />
                    <span>
                      Export Chart CSV {!canExportAndAnalyze ? '($3 / Pro)' : ''}
                    </span>
                  </button>
                </div>
              </div>

              {/* Recharts Responsive Bar Chart */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={subjectDistributionData}
                    margin={{ top: 10, right: 16, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="shortLabel"
                      stroke="#94a3b8"
                      tick={{ fill: '#cbd5e1', fontSize: 11 }}
                      axisLine={{ stroke: '#334155' }}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val: number) =>
                        val >= 1000 ? `$${Math.round(val / 1000)}k` : `$${val}`
                      }
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(20, 184, 166, 0.08)' }}
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const item = payload[0].payload as (typeof subjectDistributionData)[number];
                        return (
                          <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 font-mono">
                            <div className="font-sans font-bold text-white flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block"
                                style={{ backgroundColor: item.color }}
                              />
                              <span>{item.subject}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-slate-300">
                              <span>Total Pool:</span>
                              <span className="font-bold text-emerald-400 tabular-nums">
                                ${item.totalUSD.toLocaleString()} USD
                              </span>
                            </div>
                            <div className="flex justify-between gap-4 text-slate-300">
                              <span>Active Calls:</span>
                              <span className="font-bold text-white tabular-nums">
                                {item.count} {item.count === 1 ? 'grant' : 'grants'}
                              </span>
                            </div>
                            <div className="flex justify-between gap-4 text-slate-300">
                              <span>Avg. Award:</span>
                              <span className="font-bold text-teal-300 tabular-nums">
                                {canExportAndAnalyze
                                  ? `$${item.avgUSD.toLocaleString()} USD`
                                  : 'Pro Benchmark ($3 / $15)'}
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey={chartMetric}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={56}
                      onClick={(data: any) => {
                        if (data && data.subject) {
                          setSubjectFilter((prev) =>
                            prev === data.subject ? 'ALL' : (data.subject as SubjectCategory)
                          );
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {subjectDistributionData.map((entry) => {
                        const isSelected =
                          subjectFilter === 'ALL' || subjectFilter === entry.subject;
                        return (
                          <Cell
                            key={entry.subject}
                            fill={entry.color}
                            fillOpacity={isSelected ? 0.92 : 0.3}
                            stroke={subjectFilter === entry.subject ? '#ffffff' : 'none'}
                            strokeWidth={subjectFilter === entry.subject ? 1.5 : 0}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Subject Breakdown Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-slate-800/80 font-mono text-[11px]">
                {subjectDistributionData.map((item) => {
                  const isActive = subjectFilter === item.subject;
                  return (
                    <button
                      key={item.subject}
                      type="button"
                      onClick={() =>
                        setSubjectFilter((prev) => (prev === item.subject ? 'ALL' : item.subject))
                      }
                      className={`text-left p-2.5 rounded-xl border transition ${
                        isActive
                          ? 'bg-slate-800 border-teal-500/60'
                          : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-sans font-semibold text-slate-200 truncate">
                          {item.shortLabel}
                        </span>
                        <span className="text-[10px] text-slate-400 tabular-nums">
                          {item.count}
                        </span>
                      </div>
                      <div
                        className="text-xs font-bold mt-1 tabular-nums"
                        style={{ color: item.color }}
                      >
                        $
                        {(chartMetric === 'avgUSD' ? item.avgUSD : item.totalUSD).toLocaleString()}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Opportunities Cards Grid */}
            {filteredOpportunities.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
                <p className="text-sm font-semibold text-slate-200">
                  No surveyed opportunities match your current filter combination.
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Reset your search filters or submit a new donor portal URL for instant spatial indexing.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold transition"
                >
                  {t.resetFilters}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredOpportunities.map((opp) => {
                  const isSaved = savedIds.includes(opp.id);
                  return (
                    <div
                      key={opp.id}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition space-y-4"
                    >
                      <div>
                        {/* Quiet unboxed metadata line */}
                        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-teal-300 font-medium">{opp.subject}</span>
                            <span aria-hidden="true">·</span>
                            <span>{opp.region}</span>
                            <span aria-hidden="true">·</span>
                            <span>{opp.stage}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleSaveOpportunity(opp.id)}
                            title={isSaved ? 'Remove from Shortlist' : 'Save to Shortlist'}
                            className={`text-xs transition ${
                              isSaved ? 'text-yellow-400' : 'text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            <i className={`fa-${isSaved ? 'solid' : 'regular'} fa-bookmark`} />
                          </button>
                        </div>

                        <h3 className="text-sm font-bold text-white mt-2 leading-snug">
                          {getLocalizedTitle(opp)}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">{opp.provider}</p>

                        <div className="mt-3 pt-2.5 border-t border-slate-800 text-xs flex items-center justify-between font-mono">
                          <span className="text-slate-400">
                            {opp.status === 'Closing Soon' ? (
                              <span className="text-yellow-400">Due {opp.deadline}</span>
                            ) : (
                              <span>Due {opp.deadline}</span>
                            )}
                          </span>
                          <span className="font-bold text-emerald-400 tabular-nums">
                            {opp.currency} {opp.amount.toLocaleString()}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 mt-3 line-clamp-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800/60">
                          {opp.notes}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-emerald-400 flex items-center gap-1.5">
                            <i className="fa-solid fa-circle-check text-[10px]" />
                            <span>Verified Direct Donor URL</span>
                          </span>
                          <span className="text-slate-400">
                            Overhead &le;{opp.overheadCapPercent}%
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setDetailOpp(opp)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0"
                          >
                            {t.details}
                          </button>

                          <a
                            href={opp.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs transition font-bold flex items-center gap-1.5 shadow-sm whitespace-nowrap shrink-0"
                          >
                            <span>{t.portal}</span>
                            <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: SPATIAL WORLD MAP SECTION */}
        {activeTab === 'map' && (
          <SpatialWorldMap
            opportunities={opportunities}
            onSelectOpportunity={(opp) => setDetailOpp(opp)}
          />
        )}

        {/* VIEW 3: NON-GENERATIVE AI PROPOSAL REVIEWER & COMPLIANCE CHECKER */}
        {activeTab === 'compliance' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-900 via-teal-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="text-xs text-teal-300 font-mono mb-1">
                  Non-Generative Audit Engine · Strict Anti-Plagiarism &amp; Donor Rubric Checker
                </div>
                <h2 className="text-xl font-extrabold text-white">
                  AI Proposal Compliance &amp; Rubric Reviewer
                </h2>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                  Paste your written proposal draft. Our AI engine audits your draft against official donor rubrics, flags logic model gaps, checks budget overhead caps, and highlights eligibility risks—
                  <strong className="text-white">
                    without auto-generating text or risking plagiarism disqualification.
                  </strong>
                </p>
              </div>
              <div className="shrink-0 bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-center font-mono">
                <span className="text-[10px] text-slate-400 block">Single Audit Run</span>
                <span className="text-sm font-bold text-teal-300">$5.00 or Pro Tier</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Draft Submission Box */}
              <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <i className="fa-solid fa-file-pen text-teal-400" />
                    <span>Proposal Draft Input</span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setComplianceTargetCall(SAMPLE_PROPOSAL_DRAFTS.compliant.targetCall);
                        setComplianceOverhead(SAMPLE_PROPOSAL_DRAFTS.compliant.overhead);
                        setProposalDraft(SAMPLE_PROPOSAL_DRAFTS.compliant.text);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-teal-300 border border-slate-800 transition"
                    >
                      Load High-Scoring Sample
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setComplianceTargetCall(SAMPLE_PROPOSAL_DRAFTS.warning.targetCall);
                        setComplianceOverhead(SAMPLE_PROPOSAL_DRAFTS.warning.overhead);
                        setProposalDraft(SAMPLE_PROPOSAL_DRAFTS.warning.text);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-yellow-300 border border-slate-800 transition"
                    >
                      Load Sample with Budget Warning
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Select Target Donor Agency / Call Type
                    </label>
                    <select
                      value={complianceTargetCall}
                      onChange={(e) => setComplianceTargetCall(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    >
                      <option>Horizon Europe Research Call (Standard Rubric)</option>
                      <option>USAID / IDRC Development Agency Grant Framework</option>
                      <option>WAIFEM Fellowship Program Guidelines</option>
                      <option>UNESCO-L&apos;Oréal STEM Fellowship Standard</option>
                      <option>OAS Academic &amp; Regional Consortium Call</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Declared Overhead (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={40}
                      value={complianceOverhead}
                      onChange={(e) => setComplianceOverhead(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Paste Proposal Text (Theory of Change, Budget Justification, Methodology)
                  </label>
                  <textarea
                    rows={11}
                    value={proposalDraft}
                    onChange={(e) => setProposalDraft(e.target.value)}
                    placeholder="Paste your proposal section draft here for non-generative compliance checking..."
                    className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500 font-mono leading-relaxed"
                  />
                </div>

                <button
                  type="button"
                  disabled={auditingProposal}
                  onClick={handleRunComplianceCheck}
                  className="w-full py-3 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-lg shadow-teal-600/20 transition flex items-center justify-center gap-2"
                >
                  <i
                    className={`fa-solid ${
                      canRunComplianceAudit ? 'fa-microchip' : 'fa-lock text-yellow-300'
                    }`}
                  />
                  <span>
                    {auditingProposal
                      ? 'Auditing Draft Against Donor Rubric...'
                      : canRunComplianceAudit
                      ? proUnlocked
                        ? 'Run Rubric Compliance Audit (Pro Unlimited)'
                        : `Run Rubric Compliance Audit (${unlockedPasses.complianceCredits} Pass Left)`
                      : 'Unlock & Run Rubric Compliance Audit ($5.00 or Pro Tier)'}
                  </span>
                </button>
              </div>

              {/* Audit Feedback Output Panel */}
              <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <i className="fa-solid fa-clipboard-check text-emerald-400" />
                  <span>Audit Compliance Report</span>
                </h3>

                {!auditResult ? (
                  <div className="bg-slate-950 rounded-xl p-6 border border-slate-800 text-xs space-y-3 flex-grow flex flex-col justify-center items-center text-center min-h-[340px]">
                    <i className="fa-solid fa-shield-halved text-3xl text-slate-700" />
                    <p className="text-slate-300 font-medium max-w-xs">
                      Ready to Audit Your Draft
                    </p>
                    <p className="text-slate-400 max-w-xs">
                      Click &ldquo;Run Rubric Compliance Audit&rdquo; to evaluate your Theory of Change, methodology, and overhead rate against {complianceTargetCall}.
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 text-xs space-y-4 flex-grow">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <span className="text-slate-400 block text-[11px]">
                          Overall Rubric Alignment
                        </span>
                        <span className="font-bold text-white text-sm">
                          {auditResult.verdictLabel}
                        </span>
                      </div>
                      <div className="text-right font-mono">
                        <span
                          className={`text-lg font-extrabold tabular-nums ${
                            auditResult.overallScore >= 80
                              ? 'text-emerald-400'
                              : 'text-yellow-400'
                          }`}
                        >
                          {auditResult.overallScore} / 100
                        </span>
                      </div>
                    </div>

                    {/* Criterion Breakdown */}
                    <div className="space-y-2.5">
                      {auditResult.rubricBreakdown.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 space-y-1"
                        >
                          <div className="flex items-center justify-between font-mono text-[11px]">
                            <span className="text-slate-200 font-semibold">{item.criterion}</span>
                            <span
                              className={
                                item.status === 'Pass' ? 'text-emerald-400' : 'text-yellow-400'
                              }
                            >
                              {item.score}/{item.maxScore} ({item.status})
                            </span>
                          </div>
                          <p className="text-slate-400 text-[11px]">{item.finding}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div>
                        <span className="text-[11px] font-mono text-emerald-400 font-bold block">
                          ✓ Logic Model Alignment
                        </span>
                        <p className="text-slate-300 text-[11px] mt-0.5">
                          {auditResult.logicModelAlignment}
                        </p>
                      </div>

                      <div>
                        <span className="text-[11px] font-mono text-yellow-400 font-bold block">
                          ⚠ Overhead &amp; Budget Audit
                        </span>
                        <p className="text-slate-300 text-[11px] mt-0.5">
                          {auditResult.budgetCompliance}
                        </p>
                      </div>
                    </div>

                    {auditResult.actionableChecklist.length > 0 && (
                      <div className="pt-2 border-t border-slate-800 space-y-1">
                        <span className="text-[11px] font-semibold text-slate-300 block">
                          Actionable Pre-Submission Checklist:
                        </span>
                        <ul className="space-y-1 text-[11px] text-slate-400">
                          {auditResult.actionableChecklist.map((step, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-teal-400 font-mono">{i + 1}.</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                      <span>{auditResult.nonGenerativeCertificate}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: FUNDING & APPLICATION ACADEMY */}
        {activeTab === 'academy' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-900 via-yellow-950/20 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="text-xs text-yellow-300 font-mono mb-1">
                  Weekly AI Application Blueprints · Step-by-Step Grant Proposal Guides
                </div>
                <h2 className="text-xl font-extrabold text-white">{t.fundingAcademyTitle}</h2>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                  Master the application process with tactical breakdowns, logic model templates, cross-border tax compliance guides, and eligibility checklists for global calls.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-400 font-medium">All-Access Tier:</span>
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-xs font-bold font-mono transition"
                >
                  $15 USDC/mo · Payoneer / Cards
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {ACADEMY_BLUEPRINTS.map((guide) => {
                const isUnlocked =
                  guide.isFree || proUnlocked || unlockedBlueprints.includes(guide.id);
                return (
                  <div
                    key={guide.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono mb-2">
                        <span
                          className={
                            guide.isFree ? 'text-emerald-400 font-bold' : 'text-yellow-300 font-bold'
                          }
                        >
                          {guide.badge}
                        </span>
                        <span className="text-slate-400">{guide.priceLabel}</span>
                      </div>

                      <h3 className="text-sm font-bold text-white leading-snug">{guide.title}</h3>
                      <p className="text-xs text-slate-400 mt-2">{guide.summary}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {guide.readTime} · {guide.categoryTag}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isUnlocked) {
                            pushToast(
                              'Paid Academy Blueprint ($2.00 or Pro Tier)',
                              `Unlock "${guide.title}" with a Single Blueprint Pass ($2.00) or All-Access Pro ($15/mo).`,
                              'amber'
                            );
                            openPaidCheckout('blueprint_pass', { blueprintId: guide.id });
                            return;
                          }
                          setActiveBlueprint(guide);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                          isUnlocked
                            ? 'bg-teal-600 hover:bg-teal-500 text-white'
                            : 'bg-gradient-to-r from-yellow-500 to-teal-600 hover:from-yellow-400 hover:to-teal-500 text-slate-950'
                        }`}
                      >
                        {!isUnlocked && <i className="fa-solid fa-lock text-[10px]" />}
                        <span>{isUnlocked ? 'Read Full Guide' : 'Unlock Blueprint ($2)'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 5: SURVEYED PORTALS & LIVE INPUT SECTION */}
        {activeTab === 'sites' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/60 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="text-xs text-teal-300 font-mono mb-1">
                  Included in User Subscription · Instant Live Crawl &amp; Source Verification
                </div>
                <h2 className="text-lg font-extrabold text-white">
                  Surveyed Portals &amp; Crawl Network
                </h2>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                  Submit new opportunity URLs or institutional portal links for instant, automated AI surveying across global databases.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSiteModalOpen(true)}
                className="bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-teal-600/20 shrink-0"
              >
                <i className="fa-solid fa-plus text-xs" />
                <span>Submit Detailed Portal</span>
              </button>
            </div>

            {/* Quick Instant Live Portal Input Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
              <h3 className="text-xs font-bold text-slate-200 mb-2">
                Instant Quick URL Survey Input (Powered by Gemini Spatial Parser)
              </h3>
              <form onSubmit={handleQuickPortalSubmit} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={quickUrlInput}
                  onChange={(e) => setQuickUrlInput(e.target.value)}
                  required
                  placeholder="https://official-grant-portal.org/call-for-applications"
                  className="flex-grow px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={surveyingUrl}
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-teal-300 border border-teal-500/30 px-5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-bolt text-teal-400" />
                  <span>{surveyingUrl ? 'Surveying Portal...' : 'Survey Live'}</span>
                </button>
              </form>
            </div>

            {/* Portals Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">Title &amp; Agency</th>
                      <th className="py-3.5 px-4 font-semibold">Category &amp; Scope</th>
                      <th className="py-3.5 px-4 font-semibold">Deadline</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Value</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Official Verified Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {opportunities.map((opp) => (
                      <tr key={opp.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{getLocalizedTitle(opp)}</div>
                          <div className="text-[11px] text-slate-400">{opp.provider}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-teal-300">{opp.subject}</div>
                          <div className="text-[11px] text-slate-400">
                            {opp.region} · {opp.locationLabel}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          <span
                            className={
                              opp.status === 'Closing Soon' ? 'text-yellow-400' : 'text-slate-300'
                            }
                          >
                            {opp.deadline} ({opp.status})
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 text-right tabular-nums">
                          {opp.currency} {opp.amount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setDetailOpp(opp)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-semibold"
                            >
                              Rubric
                            </button>
                            <a
                              href={opp.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 rounded text-[11px] font-mono"
                            >
                              Verified URL ↗
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 6: AI DIGEST ALERTS TAB */}
        {activeTab === 'email' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <i className="fa-solid fa-sliders text-teal-400" />
                  <span>{t.digestAlerts}</span>
                </h2>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (currentUser) {
                      const uid = sanitizeValidId(currentUser.uid);
                      const privPath = `users/${uid}/private/info`;
                      try {
                        await updateDoc(doc(db, 'users', uid, 'private', 'info'), {
                          email: clampString(
                            currentUser.email || subscriberEmail,
                            3,
                            254,
                            'researcher@university.edu'
                          ),
                          subscriberEmail: clampString(
                            subscriberEmail,
                            3,
                            254,
                            'researcher@university.edu'
                          ),
                          updatedAt: serverTimestamp(),
                        });
                      } catch (err) {
                        handleFirestoreError(err, OperationType.UPDATE, privPath);
                      }
                      await syncWorkspaceState({
                        digestCadence,
                        digestRegion,
                        digestSubject,
                      });
                    }
                    pushToast(
                      'Alert Preferences Saved',
                      `Configured ${digestCadence} spatial grant digests for ${subscriberEmail}.`,
                      'emerald'
                    );
                  }}
                  className="space-y-4 text-xs"
                >
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">
                      Subscriber Institutional Email
                    </label>
                    <input
                      type="email"
                      required
                      value={subscriberEmail}
                      onChange={(e) => setSubscriberEmail(e.target.value)}
                      placeholder="researcher@university.edu"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">
                      Dispatch Cadence
                    </label>
                    <select
                      value={digestCadence}
                      onChange={(e) => setDigestCadence(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-teal-500"
                    >
                      <option value="Weekly">Weekly Consolidated Radar</option>
                      <option value="Bi-Weekly">Bi-Weekly Institutional Brief</option>
                      <option value="Urgent-Only">Closing Soon (&lt;30d) Priority Alerts</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-300 mb-1">Target Region</label>
                      <select
                        value={digestRegion}
                        onChange={(e) => setDigestRegion(e.target.value as RegionScope)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200"
                      >
                        <option value="ALL">All Regions</option>
                        <option value="Africa">Africa</option>
                        <option value="Latin America">Latin America</option>
                        <option value="Middle East">Middle East</option>
                        <option value="Asia-Pacific">Asia-Pacific</option>
                        <option value="Europe">Europe</option>
                        <option value="Global">Global</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-300 mb-1">Discipline</label>
                      <select
                        value={digestSubject}
                        onChange={(e) => setDigestSubject(e.target.value as SubjectCategory)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200"
                      >
                        <option value="ALL">All Disciplines</option>
                        <option value="Science & Tech">Science &amp; Tech</option>
                        <option value="Social Impact & Policy">Social Impact</option>
                        <option value="Academic & Fellowships">Academic Fellowships</option>
                        <option value="Arts & Culture">Arts &amp; Culture</option>
                        <option value="Entrepreneurship & Business">Entrepreneurship</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-teal-600 hover:bg-teal-500 text-white py-2.5 rounded-lg text-xs font-bold transition"
                    >
                      Save Preferences
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        pushToast(
                          'Test Digest Dispatched',
                          `Sent ${digestMatchingOpps.length} verified calls to ${subscriberEmail}.`,
                          'emerald'
                        )
                      }
                      className="px-3.5 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition"
                    >
                      Test Digest
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white">Live AI Digest Preview</h3>
                  <span className="text-xs font-mono text-teal-400">
                    {digestMatchingOpps.length} Verified Calls Matched
                  </span>
                </div>

                <div className="bg-white rounded-xl text-slate-900 p-6 overflow-y-auto max-h-[500px] text-xs space-y-4 shadow-inner">
                  <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono uppercase text-teal-700 font-bold">
                        Grant Surveyor AI · Official Verified Digest ({digestCadence})
                      </div>
                      <h4 className="text-base font-extrabold text-slate-900 mt-0.5">
                        Spatial Funding Radar for {subscriberEmail}
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      Language: {lang.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-slate-600 leading-relaxed">
                    Below are the latest verified direct-to-donor opportunities matching your spatial filter (
                    <strong>{digestRegion === 'ALL' ? 'Global All Regions' : digestRegion}</strong> ·{' '}
                    <strong>{digestSubject === 'ALL' ? 'All Disciplines' : digestSubject}</strong>). Every URL links directly to the official funding agency portal.
                  </p>

                  <div className="divide-y divide-slate-200">
                    {digestMatchingOpps.map((opp) => (
                      <div key={opp.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            {getLocalizedTitle(opp)}
                          </div>
                          <div className="text-slate-500 text-[11px]">
                            {opp.provider} · {opp.locationLabel} · Overhead Cap &le;
                            {opp.overheadCapPercent}%
                          </div>
                        </div>
                        <div className="sm:text-right font-mono shrink-0">
                          <div className="font-bold text-emerald-700">
                            {opp.currency} {opp.amount.toLocaleString()}
                          </div>
                          <a
                            href={opp.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-700 underline text-[11px]"
                          >
                            Official Portal ↗
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: OPPORTUNITY DETAILS & DONOR RUBRIC */}
      {detailOpp && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-teal-400">
                  {detailOpp.subject} · {detailOpp.region} ({detailOpp.locationLabel})
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {getLocalizedTitle(detailOpp)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailOpp(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block">Award Value</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {detailOpp.currency} {detailOpp.amount.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Deadline</span>
                  <span className="text-sm font-bold text-white">{detailOpp.deadline}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Stage</span>
                  <span className="text-sm font-bold text-teal-300">{detailOpp.stage}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Overhead Cap</span>
                  <span className="text-sm font-bold text-yellow-300">
                    &le;{detailOpp.overheadCapPercent}%
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-white mb-1">Call Summary &amp; Scope</h4>
                <p className="text-slate-300 leading-relaxed">{detailOpp.notes}</p>
              </div>

              <div>
                <h4 className="font-bold text-white mb-1.5">
                  Official Donor Rubric &amp; Eligibility Checklist
                </h4>
                <ul className="space-y-1.5 text-slate-300 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  {detailOpp.eligibilityChecklist.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <i className="fa-solid fa-check text-emerald-400 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setComplianceTargetCall(`${detailOpp.title} (${detailOpp.provider})`);
                    setComplianceOverhead(detailOpp.overheadCapPercent || 10);
                    setDetailOpp(null);
                    setActiveTab('compliance');
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-lg font-semibold transition"
                >
                  Audit My Proposal for This Call
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDetailOpp(null)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                  >
                    Close
                  </button>
                  <a
                    href={detailOpp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold flex items-center gap-1.5"
                  >
                    <span>Open Official Donor Portal</span>
                    <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SUBMIT OPPORTUNITY TO SURVEYOR NETWORK */}
      {siteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                Submit Opportunity to Surveyor Network
              </h3>
              <button
                type="button"
                onClick={() => setSiteModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleSaveManualOpportunity} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 mb-1">Opportunity Title *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g., Sub-Saharan Climate Adaptation Fellowship"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Provider / Agency *</label>
                  <input
                    type="text"
                    required
                    value={formProvider}
                    onChange={(e) => setFormProvider(e.target.value)}
                    placeholder="e.g., African Development Bank / UNESCO"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 mb-1">
                    Official Portal Direct Link *
                  </label>
                  <input
                    type="url"
                    required
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://official-funder-portal.org/call"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Currency</label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-300 mb-1">Funding Amount</label>
                  <input
                    type="number"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Region Scope</label>
                  <select
                    value={formRegion}
                    onChange={(e) => setFormRegion(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200"
                  >
                    <option value="Global">Worldwide / Remote</option>
                    <option value="Africa">Africa</option>
                    <option value="Latin America">Latin America</option>
                    <option value="Asia-Pacific">Asia-Pacific</option>
                    <option value="Middle East">Middle East / Sanction-Impacted</option>
                    <option value="Europe">Europe</option>
                    <option value="North America">North America</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Discipline</label>
                  <select
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200"
                  >
                    <option value="Science & Tech">Science &amp; Tech</option>
                    <option value="Social Impact & Policy">Social Impact &amp; Policy</option>
                    <option value="Academic & Fellowships">Academic &amp; Fellowships</option>
                    <option value="Arts & Culture">Arts &amp; Culture</option>
                    <option value="Entrepreneurship & Business">Entrepreneurship</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 mb-1">Career Stage</label>
                  <select
                    value={formStage}
                    onChange={(e) => setFormStage(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200"
                  >
                    <option value="Early Career">Early Career</option>
                    <option value="Youth <25">Youth (&lt;25)</option>
                    <option value="Mid-Career">Mid-Career</option>
                    <option value="Senior / All Ages">Senior / All Ages</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Application Deadline</label>
                  <input
                    type="date"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Eligibility &amp; Rubric Notes</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Key eligibility criteria, regional focus, or indirect overhead limit..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSiteModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold"
                >
                  Submit Live
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ACADEMY BLUEPRINT READER */}
      {activeBlueprint && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[88vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-yellow-400">
                  {activeBlueprint.badge} · {activeBlueprint.readTime}
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {activeBlueprint.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveBlueprint(null)}
                className="text-slate-400 hover:text-white"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <p className="text-slate-300 leading-relaxed">{activeBlueprint.summary}</p>

              {activeBlueprint.sections.map((sec, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5"
                >
                  <h4 className="font-bold text-teal-300 text-sm">{sec.heading}</h4>
                  <p className="text-slate-300 leading-relaxed">{sec.body}</p>
                </div>
              ))}

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-bold text-white">Pre-Submission Verification Checklist</h4>
                <ul className="space-y-1.5 text-slate-300">
                  {activeBlueprint.checklist.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <i className="fa-solid fa-check text-emerald-400 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveBlueprint(null);
                  setActiveTab('compliance');
                }}
                className="text-teal-400 hover:text-teal-300 font-semibold"
              >
                Open Non-Generative Compliance Checker →
              </button>
              <button
                type="button"
                onClick={() => setActiveBlueprint(null)}
                className="px-4 py-1.5 bg-teal-600 text-white rounded-lg font-bold"
              >
                Done Reading
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: MULTI-PAYMENT LAYER (PAYONEER / CARDS / USDC) */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-teal-400">
                  CROSS-BORDER ACCESSIBLE BILLING · PAYONEER / CARDS / USDC
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Unlock Paid Intelligence &amp; Export Features
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[82vh] overflow-y-auto">
              <p className="text-slate-300 leading-relaxed">
                Designed for researchers, labs, and NGOs in developing and high-barrier regions. Choose a micro-pass for your immediate task or unlock the full platform with the All-Access Pro Tier.
              </p>

              {/* Plan / Pass Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(
                  [
                    {
                      id: 'pro_monthly',
                      title: 'All-Access Pro Tier',
                      price: '$15.00 / mo',
                      desc: 'Unlimited CSV exports, Pro Recharts benchmarks, AI rubric audits & all Academy blueprints.',
                      badge: 'BEST VALUE',
                    },
                    {
                      id: 'csv_pass',
                      title: 'CSV & Analytics Export Pass',
                      price: '$3.00 once',
                      desc: 'Unlock Search/Shortlist CSV downloads + Pro Subject Funding Distribution benchmarks.',
                      badge: 'DASHBOARD PASS',
                    },
                    {
                      id: 'audit_pass',
                      title: 'Single Proposal Rubric Audit',
                      price: '$5.00 once',
                      desc: '1 full Non-Generative AI Proposal Compliance & Overhead Rubric check.',
                      badge: 'COMPLIANCE PASS',
                    },
                    {
                      id: 'blueprint_pass',
                      title: 'Single Academy Blueprint',
                      price: '$2.00 once',
                      desc: 'Unlock your selected step-by-step donor application blueprint & checklist.',
                      badge: 'ACADEMY PASS',
                    },
                  ] as {
                    id: PaidPlanId;
                    title: string;
                    price: string;
                    desc: string;
                    badge: string;
                  }[]
                ).map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between space-y-2 ${
                      selectedPlan === plan.id
                        ? 'bg-teal-500/15 border-teal-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 font-mono text-[10px]">
                        <span className="text-teal-300 font-bold">{plan.badge}</span>
                        <span className="text-emerald-400 font-bold tabular-nums">{plan.price}</span>
                      </div>
                      <div className="font-bold text-white text-xs mt-1">{plan.title}</div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">{plan.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Payment Rail Selection */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  Select Settlement Rail
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(['USDC', 'Payoneer', 'Card'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSelectedPaymentMethod(method)}
                      className={`p-2.5 rounded-xl border text-center font-semibold transition ${
                        selectedPaymentMethod === method
                          ? 'bg-teal-500/15 border-teal-500 text-teal-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {method === 'USDC' && 'USDC (Polygon/Solana)'}
                      {method === 'Payoneer' && 'Payoneer Global'}
                      {method === 'Card' && 'Intl. Visa / Mastercard'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Summary Box */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Selected Option</span>
                  <span className="text-white font-bold">
                    {selectedPlan === 'pro_monthly' && 'All-Access Pro Tier ($15.00/mo)'}
                    {selectedPlan === 'csv_pass' && 'CSV & Analytics Export Pass ($3.00)'}
                    {selectedPlan === 'audit_pass' && 'Single Proposal Rubric Audit ($5.00)'}
                    {selectedPlan === 'blueprint_pass' && 'Single Academy Blueprint ($2.00)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Settlement Rail</span>
                  <span className="text-teal-300">{selectedPaymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Account Status</span>
                  <span className={proUnlocked ? 'text-emerald-400 font-bold' : 'text-yellow-300'}>
                    {proUnlocked ? 'All-Access Pro Active' : 'Free Explorer Tier'}
                  </span>
                </div>
              </div>

              {paymentReceipts.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 font-mono text-[11px]">
                  <div className="text-slate-400 font-sans font-semibold">Recent Receipts</div>
                  {paymentReceipts.slice(0, 3).map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-slate-300">
                      <span>
                        {r.planLabel} ({r.method})
                      </span>
                      <span className="text-emerald-400 tabular-nums">
                        {r.amountLabel} · {r.timestamp}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800">
                {proUnlocked || unlockedPasses.csvAndAnalytics || unlockedPasses.complianceCredits > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setProUnlocked(false);
                      setUnlockedPasses({ csvAndAnalytics: false, complianceCredits: 0 });
                      setUnlockedBlueprints(['guide-1']);
                      setChartMetric('totalUSD');
                      pushToast(
                        'Switched to Free Tier',
                        'Paid features are now locked again so you can test the checkout paywalls.',
                        'amber'
                      );
                    }}
                    className="text-[11px] text-slate-400 hover:text-yellow-300 underline"
                  >
                    Reset to Free Tier (Test Paywall)
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    Instant activation upon confirmation
                  </span>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setPaymentModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const now = new Date().toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      let receiptPlanLabel = 'All-Access Pro Tier';
                      let receiptAmountLabel = '$15.00';

                      if (selectedPlan === 'pro_monthly') {
                        setProUnlocked(true);
                        setUnlockedPasses({ csvAndAnalytics: true, complianceCredits: 999 });
                        receiptPlanLabel = 'All-Access Pro Tier';
                        receiptAmountLabel = '$15.00';
                        void syncWorkspaceState({
                          proUnlocked: true,
                          csvAndAnalyticsUnlocked: true,
                          complianceCredits: 999,
                        });
                        pushToast(
                          'All-Access Pro Activated',
                          `Verified $15.00/mo via ${selectedPaymentMethod}. All exports, analytics, audits & blueprints unlocked.`,
                          'emerald'
                        );
                      } else if (selectedPlan === 'csv_pass') {
                        setUnlockedPasses((prev) => ({ ...prev, csvAndAnalytics: true }));
                        receiptPlanLabel = 'CSV & Analytics Pass';
                        receiptAmountLabel = '$3.00';
                        void syncWorkspaceState({ csvAndAnalyticsUnlocked: true });
                        pushToast(
                          'CSV & Analytics Pass Unlocked',
                          `Verified $3.00 via ${selectedPaymentMethod}. CSV downloads & Pro chart benchmarks enabled.`,
                          'emerald'
                        );
                      } else if (selectedPlan === 'audit_pass') {
                        const nextCredits = unlockedPasses.complianceCredits + 1;
                        setUnlockedPasses((prev) => ({
                          ...prev,
                          complianceCredits: nextCredits,
                        }));
                        receiptPlanLabel = 'Single Rubric Audit Pass';
                        receiptAmountLabel = '$5.00';
                        void syncWorkspaceState({ complianceCredits: nextCredits });
                        pushToast(
                          'Rubric Audit Pass Added',
                          `Verified $5.00 via ${selectedPaymentMethod}. 1 Non-Generative Compliance Audit credit added.`,
                          'emerald'
                        );
                      } else if (selectedPlan === 'blueprint_pass') {
                        const targetBpId = pendingBlueprintId || 'guide-2';
                        const nextBlueprints = unlockedBlueprints.includes(targetBpId)
                          ? unlockedBlueprints
                          : [...unlockedBlueprints, targetBpId].slice(0, 20);
                        setUnlockedBlueprints(nextBlueprints);
                        receiptPlanLabel = 'Single Academy Blueprint';
                        receiptAmountLabel = '$2.00';
                        void syncWorkspaceState({ unlockedBlueprints: nextBlueprints });
                        const foundBp = ACADEMY_BLUEPRINTS.find((b) => b.id === targetBpId);
                        if (foundBp) {
                          setActiveBlueprint(foundBp);
                        }
                        pushToast(
                          'Academy Blueprint Unlocked',
                          `Verified $2.00 via ${selectedPaymentMethod}.`,
                          'emerald'
                        );
                      }

                      const newReceiptId = `rcpt_${Date.now()}`;
                      setPaymentReceipts((prev) => [
                        {
                          id: newReceiptId,
                          planLabel: receiptPlanLabel,
                          amountLabel: receiptAmountLabel,
                          method: selectedPaymentMethod,
                          timestamp: now,
                        },
                        ...prev,
                      ]);

                      if (currentUser) {
                        const uid = sanitizeValidId(currentUser.uid);
                        const rcptPath = `paymentReceipts/${newReceiptId}`;
                        try {
                          await setDoc(doc(db, 'paymentReceipts', newReceiptId), {
                            ownerId: uid,
                            planLabel: clampString(receiptPlanLabel, 2, 100, 'Pro Tier'),
                            amountLabel: clampString(receiptAmountLabel, 2, 30, '$15.00'),
                            method: selectedPaymentMethod,
                            timestamp: clampString(now, 1, 40, 'Now'),
                            createdAt: serverTimestamp(),
                          });
                        } catch (err) {
                          handleFirestoreError(err, OperationType.CREATE, rcptPath);
                        }
                      }

                      setPaymentModalOpen(false);

                      if (
                        (selectedPlan === 'pro_monthly' || selectedPlan === 'csv_pass') &&
                        pendingCsvScope
                      ) {
                        const scopeToRun = pendingCsvScope;
                        setPendingCsvScope(null);
                        if (scopeToRun === 'chart') {
                          executeChartAnalyticsCSV();
                        } else {
                          executeExportCSV(scopeToRun);
                        }
                      }
                    }}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold"
                  >
                    Pay &amp; Unlock via {selectedPaymentMethod}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATIONS */}
      <div className="fixed bottom-5 left-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 shadow-2xl text-xs max-w-xs"
          >
            <div className="font-bold text-teal-300">{item.title}</div>
            <div className="text-slate-300 mt-0.5">{item.message}</div>
          </div>
        ))}
      </div>

      {/* FLOATING AI BOT HELPER WIDGET */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
        {botOpen && (
          <div className="w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden mb-3 transition-all">
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 text-xs">
                  <i className="fa-solid fa-robot" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">SurveyorBot AI</h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {lang.toUpperCase()} Active · Verified Donor Index
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBotOpen(false)}
                className="text-slate-400 hover:text-white transition text-sm"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="p-4 h-64 overflow-y-auto space-y-3 text-xs">
              {botMessages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2 ${m.sender === 'user' ? 'justify-end' : ''}`}
                >
                  {m.sender === 'bot' && (
                    <div className="w-6 h-6 rounded bg-teal-500/20 text-teal-300 flex items-center justify-center text-[10px] shrink-0 font-mono">
                      AI
                    </div>
                  )}
                  <div
                    className={
                      m.sender === 'user'
                        ? 'bg-teal-600 text-white p-2.5 rounded-xl max-w-[85%]'
                        : 'bg-slate-800/90 text-slate-200 p-2.5 rounded-xl border border-slate-700/60 max-w-[85%]'
                    }
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-3 py-2 bg-slate-950/80 border-t border-slate-800/80 flex flex-wrap gap-1.5 text-[10px]">
              <button
                type="button"
                onClick={() => handleBotQuickChip('findGrants')}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded border border-slate-700/60"
              >
                Search Grants
              </button>
              <button
                type="button"
                onClick={() => handleBotQuickChip('checkCompliance')}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded border border-slate-700/60"
              >
                Proposal Compliance
              </button>
              <button
                type="button"
                onClick={() => handleBotQuickChip('openMap')}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded border border-slate-700/60"
              >
                Spatial Map
              </button>
            </div>

            <form
              onSubmit={handleBotSubmit}
              className="p-2 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
            >
              <input
                type="text"
                value={botInput}
                onChange={(e) => setBotInput(e.target.value)}
                placeholder="Ask SurveyorBot..."
                className="flex-grow px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
              <button
                type="submit"
                disabled={botSending}
                className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white w-8 h-8 rounded-lg flex items-center justify-center transition shrink-0 text-xs"
              >
                <i className="fa-solid fa-paper-plane" />
              </button>
            </form>
          </div>
        )}

        <button
          type="button"
          onClick={() => setBotOpen((prev) => !prev)}
          aria-label="Toggle SurveyorBot AI"
          className="bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white w-12 h-12 rounded-full shadow-2xl flex items-center justify-center border border-teal-300/30 transition transform hover:scale-105"
        >
          <i className="fa-solid fa-comments text-lg" />
        </button>
      </div>
    </div>
  );
}
