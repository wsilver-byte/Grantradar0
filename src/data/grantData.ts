export type LanguageCode = 'en' | 'fr' | 'es' | 'pt' | 'sw' | 'ar';

export type SubjectCategory =
  | 'ALL'
  | 'Science & Tech'
  | 'Arts & Culture'
  | 'Social Impact & Policy'
  | 'Entrepreneurship & Business'
  | 'Academic & Fellowships';

export type CareerStage = 'ALL' | 'Youth <25' | 'Early Career' | 'Mid-Career' | 'Senior / All Ages';

export type RegionScope =
  | 'ALL'
  | 'Global'
  | 'Africa'
  | 'Latin America'
  | 'Asia-Pacific'
  | 'Middle East'
  | 'Europe'
  | 'North America';

export type FundingTier = 'ALL' | 'TIER_1' | 'TIER_2' | 'TIER_3';

export type OpportunityStatus = 'ALL' | 'Closing Soon' | 'Open' | 'Expired';

export interface GrantOpportunity {
  id: string;
  title: string;
  title_fr?: string;
  title_es?: string;
  title_pt?: string;
  title_sw?: string;
  title_ar?: string;
  provider: string;
  url: string;
  currency: 'USD' | 'EUR' | 'GBP';
  amount: number;
  region: Exclude<RegionScope, 'ALL'>;
  stage: Exclude<CareerStage, 'ALL'>;
  subject: Exclude<SubjectCategory, 'ALL'>;
  status: Exclude<OpportunityStatus, 'ALL'>;
  deadline: string;
  lat: number;
  lng: number;
  locationLabel: string;
  notes: string;
  eligibilityChecklist: string[];
  overheadCapPercent: number;
}

export interface AcademyBlueprint {
  id: string;
  badge: string;
  isFree: boolean;
  priceLabel: string;
  readTime: string;
  categoryTag: string;
  title: string;
  summary: string;
  sections: {
    heading: string;
    body: string;
  }[];
  checklist: string[];
}

export const CURRENCY_TO_USD: Record<'USD' | 'EUR' | 'GBP', number> = {
  USD: 1,
  EUR: 1.09,
  GBP: 1.28,
};

export function convertToUSD(amount: number, currency: 'USD' | 'EUR' | 'GBP'): number {
  return Math.round(amount * (CURRENCY_TO_USD[currency] || 1));
}

export const TRANSLATIONS: Record<
  LanguageCode,
  {
    appName: string;
    opportunitiesHub: string;
    worldMap: string;
    complianceChecker: string;
    fundingAcademy: string;
    fundingAcademyTitle: string;
    monitoredPortals: string;
    digestAlerts: string;
    addPortal: string;
    allSubjects: string;
    scienceTech: string;
    artsCulture: string;
    socialImpact: string;
    entrepreneurship: string;
    academicFellowships: string;
    keywordSearch: string;
    ageCareerStage: string;
    allAges: string;
    youth: string;
    earlyCareer: string;
    midCareer: string;
    seniorAll: string;
    locationScope: string;
    allLocations: string;
    worldwideRemote: string;
    fundingPoolTier: string;
    allFunding: string;
    deadlineUrgency: string;
    allStatuses: string;
    closingSoon: string;
    resetFilters: string;
    matchingOpps: string;
    totalValue: string;
    crawlerMonitor: string;
    active: string;
    details: string;
    portal: string;
    filtersHeader: string;
    botWelcome: string;
  }
> = {
  en: {
    appName: 'Grant Surveyor AI',
    opportunitiesHub: 'Hub & Search',
    worldMap: 'Spatial World Map',
    complianceChecker: 'AI Compliance Checker',
    fundingAcademy: 'Funding Academy',
    fundingAcademyTitle: 'Funding & Application Academy',
    monitoredPortals: 'Surveyed Portals',
    digestAlerts: 'AI Digest Alerts',
    addPortal: 'Submit Portal',
    allSubjects: 'All Disciplines',
    scienceTech: 'Science & Tech',
    artsCulture: 'Arts & Culture',
    socialImpact: 'Social Impact',
    entrepreneurship: 'Entrepreneurship',
    academicFellowships: 'Academic & Fellowships',
    keywordSearch: 'Search Keywords',
    ageCareerStage: 'Stage',
    allAges: 'All Stages',
    youth: 'Youth (<25)',
    earlyCareer: 'Early Career',
    midCareer: 'Mid-Career',
    seniorAll: 'Senior / All',
    locationScope: 'Location Scope',
    allLocations: 'All Locations',
    worldwideRemote: 'Worldwide / Remote',
    fundingPoolTier: 'Funding Tier',
    allFunding: 'All Amounts',
    deadlineUrgency: 'Urgency',
    allStatuses: 'All Statuses',
    closingSoon: 'Closing Soon (< 30d)',
    resetFilters: 'Reset Filters',
    matchingOpps: 'Surveyed Opportunities',
    totalValue: 'Total Converted Pool',
    crawlerMonitor: 'Surveyor Radar',
    active: 'Active Radar',
    details: 'Details & Rubric',
    portal: 'Official Portal',
    filtersHeader: 'Precision Spatial Grant Search',
    botWelcome:
      'Hello! I am SurveyorBot AI. I can help you search verified grants, submit portals, or check your proposal drafts against donor rubrics!',
  },
  fr: {
    appName: 'Grant Surveyor AI',
    opportunitiesHub: 'Hub & Recherche',
    worldMap: 'Carte Spatiale',
    complianceChecker: 'Audit de Conformité IA',
    fundingAcademy: 'Académie des Bourses',
    fundingAcademyTitle: 'Académie de Financement et de Candidature',
    monitoredPortals: 'Portails Surveillés',
    digestAlerts: 'Alertes IA',
    addPortal: 'Soumettre Portail',
    allSubjects: 'Toutes Disciplines',
    scienceTech: 'Sciences & Tech',
    artsCulture: 'Arts & Culture',
    socialImpact: 'Impact Social',
    entrepreneurship: 'Entrepreneuriat',
    academicFellowships: 'Bourses & Recherche',
    keywordSearch: 'Mots-clés',
    ageCareerStage: 'Niveau',
    allAges: 'Tous Niveaux',
    youth: 'Jeunes (<25)',
    earlyCareer: 'Début de Carrière',
    midCareer: 'Mi-Carrière',
    seniorAll: 'Senior / Tous',
    locationScope: 'Zone Géographique',
    allLocations: 'Toutes Zones',
    worldwideRemote: 'Mondial / À distance',
    fundingPoolTier: 'Montant',
    allFunding: 'Tous Montants',
    deadlineUrgency: 'Urgence',
    allStatuses: 'Tous Statuts',
    closingSoon: 'Clôture Prochaine (< 30j)',
    resetFilters: 'Réinitialiser',
    matchingOpps: 'Subventions Identifiées',
    totalValue: 'Valeur Totale Convertie',
    crawlerMonitor: 'Radar Spatial',
    active: 'Radar Actif',
    details: 'Détails & Grille',
    portal: 'Portail Officiel',
    filtersHeader: 'Recherche Spatiale de Précision',
    botWelcome:
      "Bonjour! Je suis SurveyorBot AI. Avez-vous besoin d'aide pour trouver une bourse ou vérifier la conformité de votre proposition?",
  },
  es: {
    appName: 'Grant Surveyor AI',
    opportunitiesHub: 'Hub y Búsqueda',
    worldMap: 'Mapa Espacial',
    complianceChecker: 'Auditoría IA de Cumplimiento',
    fundingAcademy: 'Academia de Becas',
    fundingAcademyTitle: 'Academia de Financiamiento y Postulación',
    monitoredPortals: 'Portales Inspeccionados',
    digestAlerts: 'Alertas de IA',
    addPortal: 'Enviar Portal',
    allSubjects: 'Todas las Disciplinas',
    scienceTech: 'Ciencia y Tecnología',
    artsCulture: 'Arte y Cultura',
    socialImpact: 'Impacto Social',
    entrepreneurship: 'Emprendimiento',
    academicFellowships: 'Becas Académicas',
    keywordSearch: 'Buscar Palabras Clave',
    ageCareerStage: 'Etapa',
    allAges: 'Todas las Etapas',
    youth: 'Jóvenes (<25)',
    earlyCareer: 'Carrera Temprana',
    midCareer: 'Media Carrera',
    seniorAll: 'Senior / Todos',
    locationScope: 'Alcance Geográfico',
    allLocations: 'Todas las Ubicaciones',
    worldwideRemote: 'Mundial / Remoto',
    fundingPoolTier: 'Nivel de Fondos',
    allFunding: 'Todos los Montos',
    deadlineUrgency: 'Urgencia',
    allStatuses: 'Todos los Estados',
    closingSoon: 'Cierra Pronto (< 30d)',
    resetFilters: 'Restablecer Filtros',
    matchingOpps: 'Oportunidades Inspeccionadas',
    totalValue: 'Fondo Total Convertido',
    crawlerMonitor: 'Radar de Reconocimiento',
    active: 'Radar Activo',
    details: 'Detalles y Rúbrica',
    portal: 'Portal Oficial',
    filtersHeader: 'Búsqueda Espacial de Subvenciones',
    botWelcome:
      '¡Hola! Soy SurveyorBot AI. ¿Necesitas ayuda para buscar becas o revisar la conformidad de tu propuesta?',
  },
  pt: {
    appName: 'Grant Surveyor AI',
    opportunitiesHub: 'Hub e Pesquisa',
    worldMap: 'Mapa Espacial',
    complianceChecker: 'Auditor de Conformidade IA',
    fundingAcademy: 'Academia de Bolsas',
    fundingAcademyTitle: 'Academia de Financiamento e Candidatura',
    monitoredPortals: 'Portais Mapeados',
    digestAlerts: 'Alertas de IA',
    addPortal: 'Enviar Portal',
    allSubjects: 'Todas as Disciplinas',
    scienceTech: 'Ciência e Tecnologia',
    artsCulture: 'Arte e Cultura',
    socialImpact: 'Impacto Social',
    entrepreneurship: 'Empreendedorismo',
    academicFellowships: 'Bolsas de Estudo',
    keywordSearch: 'Pesquisar Palavras-chave',
    ageCareerStage: 'Estágio',
    allAges: 'Todos os Estágios',
    youth: 'Jovens (<25)',
    earlyCareer: 'Início de Carreira',
    midCareer: 'Meio de Carreira',
    seniorAll: 'Sênior / Todos',
    locationScope: 'Escopo Geográfico',
    allLocations: 'Todas as Regiões',
    worldwideRemote: 'Mundial / Remoto',
    fundingPoolTier: 'Nível de Financiamento',
    allFunding: 'Todos os Valores',
    deadlineUrgency: 'Urgência',
    allStatuses: 'Todos os Status',
    closingSoon: 'Encerrando Breve (< 30d)',
    resetFilters: 'Redefinir Filtros',
    matchingOpps: 'Oportunidades Mapeadas',
    totalValue: 'Fundo Total Convertido',
    crawlerMonitor: 'Radar de Mapeamento',
    active: 'Radar Ativo',
    details: 'Detalhes e Rubrica',
    portal: 'Portal Oficial',
    filtersHeader: 'Pesquisa Espacial de Precisão',
    botWelcome:
      'Olá! Sou o SurveyorBot AI. Precisa de ajuda para encontrar financiamento ou auditar sua proposta?',
  },
  sw: {
    appName: 'Grant Surveyor AI',
    opportunitiesHub: 'Kituo na Utafutaji',
    worldMap: 'Ramani ya Kijiografia',
    complianceChecker: 'Kikagua Uzingatiaji AI',
    fundingAcademy: 'Chuo cha Ufadhili',
    fundingAcademyTitle: 'Chuo cha Ufadhili na Maombi ya Ruzuku',
    monitoredPortals: 'Tovuti Zilizokaguliwa',
    digestAlerts: 'Arifa za AI',
    addPortal: 'Wasilisha Tovuti',
    allSubjects: 'Masomo Yote',
    scienceTech: 'Sayansi na Teknolojia',
    artsCulture: 'Sanaa na Utamaduni',
    socialImpact: 'Athari kwa Jamii',
    entrepreneurship: 'Ujasiriamali',
    academicFellowships: 'Ufadhili wa Masomo',
    keywordSearch: 'Tafuta Maneno Muhimu',
    ageCareerStage: 'Kiwango cha Kazi',
    allAges: 'Viwango Vyote',
    youth: 'Vijana (<25)',
    earlyCareer: 'Kazi ya Mapema',
    midCareer: 'Kazi ya Kati',
    seniorAll: 'Wakuu / Wote',
    locationScope: 'Eneo la Kijiografia',
    allLocations: 'Maeneo Yote',
    worldwideRemote: 'Ulimwenguni / Mtandaoni',
    fundingPoolTier: 'Kiwango cha Fedha',
    allFunding: 'Viwango Vyote',
    deadlineUrgency: 'Muda wa Mwisho',
    allStatuses: 'Hali Zote',
    closingSoon: 'Inaisha Hivi Karibuni (<30d)',
    resetFilters: 'Weka Upya Vichungi',
    matchingOpps: 'Fursa Zilizopatikana',
    totalValue: 'Jumla ya Mfuko (USD)',
    crawlerMonitor: 'Rada ya Utafiti',
    active: 'Rada Iko Hewani',
    details: 'Maelezo na Vigezo',
    portal: 'Tovuti Rasmi',
    filtersHeader: 'Utafutaji wa Ruzuku wa Kijiografia',
    botWelcome:
      'Jambo! Mimi ni SurveyorBot AI. Unahitaji msaada kupata ufadhili au kukagua pendekezo lako?',
  },
  ar: {
    appName: 'مسّاح المنح بالذكاء الاصطناعي',
    opportunitiesHub: 'المركز والبحث',
    worldMap: 'الخريطة الجغرافية',
    complianceChecker: 'مدقق الامتثال بالذكاء الاصطناعي',
    fundingAcademy: 'أكاديمية التمويل',
    fundingAcademyTitle: 'أكاديمية التمويل وتقديم طلبات المنح',
    monitoredPortals: 'البوابات الممسوحة',
    digestAlerts: 'تنبيهات الذكاء الاصطناعي',
    addPortal: 'إضافة بوابة',
    allSubjects: 'جميع المجالات',
    scienceTech: 'العلوم والتكنولوجيا',
    artsCulture: 'الفنون والثقافة',
    socialImpact: 'الأثر الاجتماعي',
    entrepreneurship: 'ريادة الأعمال',
    academicFellowships: 'الزمالات الأكاديمية',
    keywordSearch: 'كلمات البحث',
    ageCareerStage: 'المرحلة المهنية',
    allAges: 'جميع المراحل',
    youth: 'الشباب (<25)',
    earlyCareer: 'بداية المسار المهني',
    midCareer: 'منتصف المسار المهني',
    seniorAll: 'خبير / الجميع',
    locationScope: 'النطاق الجغرافي',
    allLocations: 'جميع المناطق',
    worldwideRemote: 'عالمي / عن بُعد',
    fundingPoolTier: 'مستوى التمويل',
    allFunding: 'جميع المبالغ',
    deadlineUrgency: 'حالة الموعد',
    allStatuses: 'جميع الحالات',
    closingSoon: 'تنتهي قريباً (<30 يوماً)',
    resetFilters: 'إعادة ضبط الفلاتر',
    matchingOpps: 'الفرص المكتشفة',
    totalValue: 'إجمالي التمويل المحول',
    crawlerMonitor: 'رادار المسح',
    active: 'الرادار نشط',
    details: 'التفاصيل والمعايير',
    portal: 'البوابة الرسمية',
    filtersHeader: 'محرك البحث الجغرافي الدقيق للمنح',
    botWelcome:
      'مرحباً! أنا SurveyorBot AI. هل تحتاج مساعدة في البحث عن المنح أو مراجعة تطابق مقترحك مع معايير المانحين؟',
  },
};

export const DEFAULT_OPPORTUNITIES: GrantOpportunity[] = [
  {
    id: 'opp-301',
    title: 'WAIFEM West African Economic & Research Fellowship',
    title_fr: "Bourse de Recherche Économique en Afrique de l'Ouest (WAIFEM)",
    title_es: 'Beca de Investigación Económica de África Occidental (WAIFEM)',
    title_pt: 'Bolsa de Pesquisa Econômica da África Ocidental (WAIFEM)',
    title_sw: 'Ufadhili wa Utafiti wa Kiuchumi Afrika Magharibi (WAIFEM)',
    title_ar: 'زمالة معهد غرب أفريقيا للإدارة المالية والاقتصادية (WAIFEM)',
    provider: 'West African Institute for Financial and Economic Management',
    url: 'https://waifem-cbp.org',
    currency: 'USD',
    amount: 25000,
    region: 'Africa',
    stage: 'Early Career',
    subject: 'Social Impact & Policy',
    status: 'Closing Soon',
    deadline: '2026-11-18',
    lat: 6.5244,
    lng: 3.3792,
    locationLabel: 'Lagos, Nigeria (ECOWAS Hub)',
    notes:
      'Open to researchers from West African developing nations focusing on monetary policy, debt sustainability, and public finance.',
    eligibilityChecklist: [
      'Citizen or resident of an ECOWAS / West African central bank member nation',
      'Master’s or PhD degree in Economics, Finance, or Public Policy',
      'Indirect institutional overhead capped at 10% of total fellowship award',
    ],
    overheadCapPercent: 10,
  },
  {
    id: 'opp-302',
    title: 'OAS Academic Scholarship Program for Latin America & Caribbean',
    title_fr: "Programme de Bourses Académiques de l'OEA",
    title_es: 'Programa de Becas Académicas de la OEA para América Latina',
    title_pt: 'Programa de Bolsas Acadêmicas da OEA para a América Latina',
    title_sw: 'Mpango wa Ufadhili wa Masomo wa OAS kwa Amerika Kusini',
    title_ar: 'برنامج المنح الأكاديمية لمنظمة الدول الأمريكية (OAS)',
    provider: 'Organization of American States (OAS)',
    url: 'https://www.oas.org/en/scholarships/',
    currency: 'USD',
    amount: 30000,
    region: 'Latin America',
    stage: 'Early Career',
    subject: 'Academic & Fellowships',
    status: 'Open',
    deadline: '2026-12-20',
    lat: 4.711,
    lng: -74.0721,
    locationLabel: 'Bogotá / Regional OAS Consortium',
    notes:
      'Graduate scholarships and research grants for OAS member state citizens in developing Latin American and Caribbean regions.',
    eligibilityChecklist: [
      'Citizen or permanent resident of an OAS Member State',
      'Unconditional admission letter to an accredited partner university',
      'Commitment to return to sponsoring country for at least 24 months post-study',
    ],
    overheadCapPercent: 0,
  },
  {
    id: 'opp-303',
    title: "UNESCO-L'Oréal Women in Science Sub-Saharan Africa Call",
    title_fr: "Prix UNESCO-L'Oréal Pour les Femmes et la Science",
    title_es: "Convocatoria UNESCO-L'Oréal Mujeres en la Ciencia África Subsahariana",
    title_pt: "Prêmio UNESCO-L'Oréal Para Mulheres na Ciência África Subsariana",
    title_sw: "Tuzo ya UNESCO-L'Oréal kwa Wanawake katika Sayansi Afrika",
    title_ar: 'منحة اليونسكو-لوريال للباحثات في العلوم في أفريقيا جنوب الصحراء',
    provider: 'UNESCO & Fondation L’Oréal',
    url: 'https://www.forwomeninscience.com',
    currency: 'EUR',
    amount: 15000,
    region: 'Africa',
    stage: 'Early Career',
    subject: 'Science & Tech',
    status: 'Closing Soon',
    deadline: '2026-11-12',
    lat: -1.2921,
    lng: 36.8219,
    locationLabel: 'Nairobi, Kenya (Sub-Saharan Hub)',
    notes:
      'Supports young female PhD and postdoctoral researchers in life sciences, AI, environmental science, and engineering across Sub-Saharan Africa.',
    eligibilityChecklist: [
      'Enrolled in a doctoral program or holding a post-doctoral position in Sub-Saharan Africa',
      'Conducting research at an accredited host laboratory in one of the 49 eligible countries',
      'Direct research equipment, field travel, and conference dissemination budget lines only',
    ],
    overheadCapPercent: 8,
  },
  {
    id: 'opp-304',
    title: 'Horizon Europe MSCA Global & Developing Nations Research Action',
    title_fr: 'Action de Recherche Horizon Europe MSCA Nations en Développement',
    title_es: 'Acción de Investigación Horizon Europe MSCA Naciones en Desarrollo',
    title_pt: 'Ação de Pesquisa Horizon Europe MSCA Nações em Desenvolvimento',
    title_sw: 'Mradi wa Utafiti wa Horizon Europe MSCA kwa Mataifa Yanayoendelea',
    title_ar: 'مبادرة أفق أوروبا (Horizon Europe MSCA) للتعاون البحثي الدولي',
    provider: 'European Commission — CORDIS Official Portal',
    url: 'https://cordis.europa.eu',
    currency: 'EUR',
    amount: 165000,
    region: 'Europe',
    stage: 'Mid-Career',
    subject: 'Science & Tech',
    status: 'Open',
    deadline: '2027-01-28',
    lat: 50.8503,
    lng: 4.3517,
    locationLabel: 'Brussels, Belgium (EU-Global Consortium)',
    notes:
      'Funds cross-border staff exchanges, climate adaptation modeling, and joint doctoral fellowships between European institutions and Global South research hubs.',
    eligibilityChecklist: [
      'Consortium of at least 3 independent legal entities in different countries',
      'Mandatory Open Science data management plan and gender equality plan',
      'Flat-rate indirect cost ceiling strictly enforced under Horizon Europe guidelines',
    ],
    overheadCapPercent: 12,
  },
  {
    id: 'opp-305',
    title: 'IDRC Climate Resilience & Food Sovereignty Research Grant',
    title_fr: 'Subvention du CRDI sur la Résilience Climatique et Alimentaire',
    title_es: 'Subvención del CIID sobre Resiliencia Climática y Soberanía Alimentaria',
    title_pt: 'Subvenção do IDRC para Resiliência Climática e Segurança Alimentar',
    title_sw: 'Ruzuku ya IDRC ya Ustahimilivu wa Tabianchi na Usalama wa Chakula',
    title_ar: 'منحة المركز الدولي لبحوث التنمية (IDRC) للمرونة المناخية والأمن الغذائي',
    provider: 'International Development Research Centre (IDRC)',
    url: 'https://idrc-crdi.ca/en/funding',
    currency: 'USD',
    amount: 120000,
    region: 'Global',
    stage: 'Senior / All Ages',
    subject: 'Social Impact & Policy',
    status: 'Open',
    deadline: '2026-12-10',
    lat: 14.7167,
    lng: -17.4677,
    locationLabel: 'Dakar / Amman / Montevideo Hubs',
    notes:
      'Targets applied research teams in LMICs developing drought-resilient agroecology, water governance, and community adaptation policies.',
    eligibilityChecklist: [
      'Lead applicant must be a legally registered research institution or NGO in an eligible LMIC',
      'Indirect institutional overhead may not exceed 12% of total direct project expenses',
      'Requires country clearance and local ethical review board approval',
    ],
    overheadCapPercent: 12,
  },
  {
    id: 'opp-306',
    title: 'Prince Claus Fund Cultural & Artistic Response Seed Awards',
    title_fr: 'Prix Semences du Fonds Prince Claus pour les Arts et la Culture',
    title_es: 'Premios Semilla del Fondo Príncipe Claus para Arte y Cultura',
    title_pt: 'Prêmios Semente do Fundo Príncipe Claus para Arte e Cultura',
    title_sw: 'Tuzo za Prince Claus Fund kwa Sanaa na Utamaduni',
    title_ar: 'منح صندوق الأمير كلاوس التأسيسية للفنون والثقافة في المناطق المتأثرة',
    provider: 'Prince Claus Fund',
    url: 'https://princeclausfund.org',
    currency: 'EUR',
    amount: 10000,
    region: 'Middle East',
    stage: 'Youth <25',
    subject: 'Arts & Culture',
    status: 'Closing Soon',
    deadline: '2026-11-22',
    lat: 31.9539,
    lng: 35.9106,
    locationLabel: 'Amman / Beirut / Sanction-Impacted Hubs',
    notes:
      'No-strings-attached seed awards for emerging artists and cultural practitioners working in conflict-affected and high-barrier regions.',
    eligibilityChecklist: [
      'Early-career artist or cultural practitioner within first 1–5 years of independent practice',
      'Living and working in an eligible country in Africa, Asia, Latin America, Caribbean, or Middle East',
      '100% direct artist grant with zero institutional overhead deductions required',
    ],
    overheadCapPercent: 5,
  },
  {
    id: 'opp-307',
    title: 'AfDB YouthADAPT Climate Entrepreneurship & AgTech Challenge',
    title_fr: "Défi YouthADAPT de la BAD pour l'Entrepreneuriat Climatique",
    title_es: 'Desafío YouthADAPT del BAfD para el Emprendimiento Climático',
    title_pt: 'Desafio YouthADAPT do BAD para o Empreendedorismo Climático',
    title_sw: 'Shindano la AfDB YouthADAPT la Ujasiriamali wa Tabianchi',
    title_ar: 'مبادرة بنك التنمية الأفريقي (YouthADAPT) لريادة الأعمال المناخية للشباب',
    provider: 'African Development Bank (AfDB) & GCA',
    url: 'https://www.afdb.org',
    currency: 'USD',
    amount: 95000,
    region: 'Africa',
    stage: 'Youth <25',
    subject: 'Entrepreneurship & Business',
    status: 'Open',
    deadline: '2026-12-05',
    lat: 5.36,
    lng: -4.0083,
    locationLabel: 'Abidjan, Côte d’Ivoire',
    notes:
      'Venture grant and 12-month accelerator for youth-led MSMEs deploying digital climate adaptation and clean-energy solutions across Africa.',
    eligibilityChecklist: [
      'Founder aged 18–35 with enterprise legally registered and operating in Africa',
      'Demonstrated post-revenue traction or validated field prototype in climate adaptation',
      'Milestone-based disbursement compatible with multi-currency corporate accounts',
    ],
    overheadCapPercent: 10,
  },
  {
    id: 'opp-308',
    title: 'TWAS-UNESCO Associateship & Research Grants in Basic Sciences',
    title_fr: 'Subventions de Recherche TWAS-UNESCO en Sciences Fondamentales',
    title_es: 'Subvenciones de Investigación TWAS-UNESCO en Ciencias Básicas',
    title_pt: 'Subsídios de Pesquisa TWAS-UNESCO em Ciências Básicas',
    title_sw: 'Ruzuku za Utafiti za TWAS-UNESCO katika Sayansi Msingi',
    title_ar: 'منح أكاديمية العالم للعلوم (TWAS-UNESCO) للبحوث في العلوم الأساسية',
    provider: 'The World Academy of Sciences (TWAS)',
    url: 'https://twas.org/opportunities',
    currency: 'USD',
    amount: 55000,
    region: 'Asia-Pacific',
    stage: 'Mid-Career',
    subject: 'Science & Tech',
    status: 'Open',
    deadline: '2027-01-14',
    lat: 23.8103,
    lng: 90.4125,
    locationLabel: 'Dhaka / Jakarta / Science-Lagging Countries',
    notes:
      'Provides specialized laboratory equipment, consumables, and master’s student stipends for principal investigators in science-and-technology-lagging countries.',
    eligibilityChecklist: [
      'Principal Investigator must hold a PhD and permanent position at a university in an eligible S&T-lagging country',
      'Funds dedicated strictly to scientific equipment, lab consumables, and scientific literature',
      'Zero institutional overhead deduction permitted on equipment procurement lines',
    ],
    overheadCapPercent: 8,
  },
  {
    id: 'opp-309',
    title: 'DAAD In-Country / In-Region Doctoral & Postdoc Fellowship',
    title_fr: 'Bourses Doctorales et Postdoctorales DAAD Sur Place / En Région',
    title_es: 'Becas Doctorales y Postdoctorales DAAD En el País / En la Región',
    title_pt: 'Bolsas de Doutorado e Pós-Doutorado DAAD No País / Na Região',
    title_sw: 'Ufadhili wa Uzamivu wa DAAD Ndani ya Nchi na Kanda',
    title_ar: 'زمالات الهيئة الألمانية للتبادل العلمي (DAAD) للدكتوراه وما بعد الدكتوراه',
    provider: 'German Academic Exchange Service (DAAD)',
    url: 'https://www.daad.de/en/',
    currency: 'EUR',
    amount: 42000,
    region: 'Middle East',
    stage: 'Early Career',
    subject: 'Academic & Fellowships',
    status: 'Open',
    deadline: '2026-12-28',
    lat: 30.0444,
    lng: 31.2357,
    locationLabel: 'Cairo / MENA / Sub-Saharan Network',
    notes:
      'Full tuition, monthly stipend, and research allowance for scholars pursuing postgraduate or doctoral studies at regional centers of excellence.',
    eligibilityChecklist: [
      'Last university degree completed within the past 6 years with above-average academic standing',
      'Direct application submitted simultaneously to host university and DAAD portal',
      'Includes short-term research stay allowance in Germany',
    ],
    overheadCapPercent: 10,
  },
];

export const ACADEMY_BLUEPRINTS: AcademyBlueprint[] = [
  {
    id: 'guide-1',
    badge: 'FREE SAMPLE',
    isFree: true,
    priceLabel: 'Updated Weekly',
    readTime: '8 min read',
    categoryTag: 'Theory of Change & Budget',
    title: 'Grant Writing 101: Drafting the Theory of Change & Budget Justification',
    summary:
      'A foundational guide on structuring high-impact grant proposals for international agencies, including logic model templates and overhead calculation guidelines.',
    sections: [
      {
        heading: '1. The 4-Tier Causal Logic Model',
        body: 'International donors (USAID, IDRC, Horizon Europe, WAIFEM) evaluate whether your activities directly produce verifiable outputs and long-term outcomes. Structure every Theory of Change as: Inputs → Activities → Measurable Outputs (0–12 months) → Systemic Outcomes (12–36 months). Never conflate an activity ("host 3 workshops") with an outcome ("25% adoption of drought-resistant seed varieties across 400 smallholder farms").',
      },
      {
        heading: '2. Defending Direct vs. Indirect Costs (The 12% Rule)',
        body: 'Over 60% of otherwise meritorious proposals from emerging research hubs are flagged during financial screening because applicants exceed institutional overhead ceilings. Most multilateral calls cap indirect costs (facilities, general administration, utilities) between 8% and 12% of direct project expenses. Itemize field computing, data collection tablets, and lab reagents under Direct Technical Equipment with vendor quotes.',
      },
      {
        heading: '3. Risk Matrix & Local Governance Verification',
        body: 'Include a 3-column Risk Register (Risk Event, Likelihood/Severity, Concrete Mitigation Protocol) addressing currency fluctuation, cross-border banking delays, and ethical clearance timelines.',
      },
    ],
    checklist: [
      'Every objective has a baseline numeric metric and a target completion date',
      'Indirect institutional overhead is explicitly calculated at <= 12% of direct costs',
      'Letters of commitment from regional implementation partners are signed and dated within 90 days',
      'Zero AI-generated filler prose: narrative uses concrete empirical citations from local pilot data',
    ],
  },
  {
    id: 'guide-2',
    badge: 'PRO WEEKLY BLUEPRINT',
    isFree: false,
    priceLabel: '$2.00 USDC or Pro',
    readTime: '14 min read',
    categoryTag: 'Rubric Audited',
    title: 'How to Win the Horizon Europe Sub-Saharan Research Grant',
    summary:
      'A line-by-line breakdown of compliance rules, consortium partner matching criteria, and rubric guidelines for proposal polishing.',
    sections: [
      {
        heading: '1. Scoring Above the 13.5 / 15.0 Threshold (Excellence, Impact, Implementation)',
        body: 'Horizon Europe evaluators score three weighted sections out of 5.0 each: Excellence (methodology, interdisciplinarity, open science practices), Impact (pathways to EU & Global South policy outcomes, scale and significance), and Quality/Efficiency of Implementation (work package decomposition, deliverable milestones, consortium complementarity).',
      },
      {
        heading: '2. Structuring Work Packages & Person-Months',
        body: 'Divide your project into 5–7 Work Packages (WPs). WP1 should cover Project Management & Ethics Governance (capped at 7–8% of total budget), WP2–WP5 cover core empirical research and field validation, and the final WP covers Dissemination, Exploitation & Policy Communication.',
      },
      {
        heading: '3. Open Science & FAIR Data Compliance',
        body: 'Proposals without a concrete Data Management Plan (DMP) following FAIR principles (Findable, Accessible, Interoperable, Reusable) lose 0.5 to 1.0 points in the Excellence criterion. Specify repositories (e.g., Zenodo, institutional open archives) and embargo timelines upfront.',
      },
    ],
    checklist: [
      'Minimum 3 independent legal entities from 3 eligible Member States / Associated or LMIC partner states',
      'Gender Equality Plan (GEP) self-declaration uploaded on the EU Funding & Tenders Portal',
      'Work Package table balances Person-Months equitably between European and African partner labs',
      'Deliverables and Milestones include verifiable means of verification (MoV)',
    ],
  },
  {
    id: 'guide-3',
    badge: 'PRO WEEKLY BLUEPRINT',
    isFree: false,
    priceLabel: '$2.00 USDC or Pro',
    readTime: '11 min read',
    categoryTag: 'Tax & Compliance',
    title: 'Navigating Cross-Border Tax & Compliance for WAIFEM Fellowships',
    summary:
      'Key legal and financial guidelines for researchers in developing West African markets receiving USD and EUR institutional funding transfers.',
    sections: [
      {
        heading: '1. Multi-Currency Grant Accounts & Intermediary Routing',
        body: 'When receiving USD or EUR fellowship tranches in ECOWAS and developing jurisdictions, always designate a dedicated domiciliary or institutional project sub-account with full SWIFT/IBAN correspondent banking details. Document whether the grant agreement allows Payoneer, multi-currency cards, or regulated stablecoin (USDC) settlement for independent individual fellows.',
      },
      {
        heading: '2. Withholding Tax Exemptions on Educational & Scientific Grants',
        body: 'Under most bilateral double-taxation treaties and regional educational charters, non-commercial academic fellowships and research stipends qualify for withholding tax exemption when accompanied by an official Donor Award Certificate and host university endorsement letter.',
      },
      {
        heading: '3. Quarterly Financial Acquittal & Audit Trail',
        body: 'Maintain timestamped digital receipts, boarding passes for field surveys, and central bank reference exchange rates for every local-currency expenditure.',
      },
    ],
    checklist: [
      'Official Award Letter linked to institutional or fellow foreign-currency account',
      'Exchange rate conversion log maintained using official central bank daily rates',
      'Tax exemption certificate filed with university bursar or local revenue authority',
      'Separate ledger lines for personal stipend vs. field data collection expenses',
    ],
  },
];

export const SAMPLE_PROPOSAL_DRAFTS: Record<string, { label: string; targetCall: string; overhead: number; text: string }> = {
  compliant: {
    label: 'Load High-Compliance Draft (Horizon / IDRC)',
    targetCall: 'Horizon Europe Research Call (Standard Rubric)',
    overhead: 10,
    text: `PROJECT TITLE: Spatial Agro-Hydrological Early Warning Network for Smallholder Resilience in the Volta Basin

1. THEORY OF CHANGE & MEASURABLE INDICATORS
Our baseline field survey across 14 rural districts indicates a 38% post-planting crop loss due to unpredicted mid-season dry spells.
- Activity 1.1: Deploy 45 low-cost solar soil-moisture telemetry nodes integrated with Sentinel-2 satellite indices across partner university extension sites in Ghana and Burkina Faso.
- Output Indicator (Month 12): Open-access spatial drought forecast bulletins delivered weekly in local languages to 3,200 registered smallholder cooperatives.
- Outcome Indicator (Month 24): Measurable 22% reduction in seed-loss expenditure and 18% yield stabilization verified through randomized control plot audits.

2. METHODOLOGY & ETHICAL GOVERNANCE
The consortium unites 3 accredited public universities and 2 regional meteorological agencies. All agronomic and household survey datasets follow FAIR Open Science standards and have received protocol clearance from the National Institutional Review Board (Ref #IRB-2026-409).

3. BUDGET JUSTIFICATION & OVERHEAD COMPLIANCE
Total Direct Costs: $135,000 USD (Field telemetry sensors: $48,000; Postdoctoral & graduate researcher stipends: $52,000; Community extension training & open-access publication: $35,000).
Institutional Indirect / Overhead Costs: $13,500 USD (10.0% of direct costs, strictly below the 12% donor rubric cap).`,
  },
  warning: {
    label: 'Load Draft with Budget & Rubric Warnings',
    targetCall: 'WAIFEM Fellowship Program Guidelines',
    overhead: 18,
    text: `PROPOSAL DRAFT: Regional Digital Finance & Informal Market Credit Study

We plan to study how mobile money affects small traders in West Africa. Our team will travel to several cities and interview market vendors about their borrowing habits and interest rates.

After collecting the interviews, we will write a policy paper and share it online so policymakers can understand the challenges faced by informal merchants.

Budget Summary:
- General project operations and research salaries: $18,000 USD
- University administrative overhead and office management charge: 18% ($3,240 USD)
- Miscellaneous contingency reserve: $3,760 USD`,
  },
};
