// Dictionary of clean, conversational translations for English and Hindi.
// Follows strict rules: Simple, friendly vocabulary, explanation of technical concepts, and friendly structure.

export const translations = {
  en: {
    // Header & Strip Info
    deckTitle: "Reviewer Mode:",
    deckDesc: "Use these easy buttons to see and test each dashboard instantly.",
    switchCrew: "Field Crew (Rajesh)",
    switchManager: "Supervisor (Amitabh)",
    switchAdmin: "Leadership (Siddharth)",
    appTitle: "SARATHI AI",
    appSub: "Workforce Copilot",
    appStandby: "SYSTEM WAITING • OFFLINE",
    logout: "Log Out of Session",
    activeDashboardLabel: "Dashboard Area",
    telemetryActive: "Plant Sensors: Running Well",
    telemetryDesc: "SMS-2 Steel Melting control systems are live. Gas levels are very safe (5ppm).",
    telemetrySync: "UTC CLOCK ONLINE",

    // Authentication Gate
    gatewayTitle: "Factory Safety Gate",
    gatewayDesc: "Log in here to check your safety training scores, read factory guides, and talk to your friendly training assistant.",
    labelFullName: "Your Full Name",
    labelDesignation: "What is your job?",
    labelDept: "Which department do you work in?",
    labelPrivilege: "Who are you?",
    optEmployee: "Field Crew Worker (Employee)",
    optManager: "Hearth Supervisor (Manager)",
    optAdmin: "Leadership (Admin)",
    labelUsername: "Your Username",
    labelPassword: "Password",
    btnCompile: "Sign In Safely",
    btnCreateProfile: "Register a New Employee Account",
    btnReturn: "Back to Login",

    // Dashboard Tabs Labels (Employee)
    tabIntel: "My Index Card",
    tabMatrix: "Skills Matrix",
    tabTests: "Safety Exams",
    tabPaths: "Learning Tracks",
    tabTrainer: "AI Tutor Chat",
    tabKnowledge: "Safety Guides",
    tabMentors: "Find a Mentor",
    tabGraph: "Skill Map Graph",

    // Tab Headers & Subtexts (Conversational & simplified English)
    intelTitle: "Your Safety & Skill Index",
    intelDesc: "This shows your current safety readiness score, completed tasks, and whether you are certified to operate today.",
    mySkillsTitle: "My Verified Skills List",
    mySkillsDesc: "These are your official skill levels. Higher levels mean you can take on more challenging factory tasks.",
    testsTitle: "Practice Quizzes & Safety Tests",
    testsDesc: "Complete these simple visual quizzes to prove you know what to do in hot zones. Passing unlocks your badges!",
    pathsTitle: "My Personalized Learning Tracks",
    pathsDesc: "Recommended friendly guides and short reading courses custom picked to help you master new operations.",
    trainerTitle: "Chat with Sarathi AI - Your Training Assistant",
    trainerDesc: "Ask me questions in English, Hindi, or Hinglish! I can help you with safety rules, preheating steps, or what to do during alarms.",
    knowledgeTitle: "Enterprise Field Guide Database",
    knowledgeDesc: "Read simplified operating procedures (SOPs), manuals, and safety handbooks curated by factory experts.",
    mentorsTitle: "Our Helpful Factory Mentors",
    mentorsDesc: "Need physically hand-on advice? Connect with senior engineers and friendly operators who work in your exact area.",
    graphTitle: "Interactive Skill Map Graph",
    graphDesc: "A colorful, interactive visual map playing out how your skills, safety checklists, and certifications link together.",

    // Language Toggle Bar
    toggleLabel: "Change System Language / भाषा बदलें",
    currentLangPrefix: "Now displaying in: ",
    englishBtn: "English (Simple)",
    hindiBtn: "हिन्दी (सरल)"
  },
  hi: {
    // Header & Strip Info
    deckTitle: "समीक्षक मोड:",
    deckDesc: "अलग-अलग यूजर रोल (अधिकार) की जाँच करने के लिए इन आसान बटनों का उपयोग करें।",
    switchCrew: "फ़ील्ड स्टाफ़ (राजेश)",
    switchManager: "पर्यवेक्षक (अमिताभ)",
    switchAdmin: "नेतृत्व (सिद्धार्थ)",
    appTitle: "सारथी एआई",
    appSub: "कार्यबल सहायक",
    appStandby: "प्रणाली स्टैंडबाय मोड पर है",
    logout: "सत्र से बाहर निकलें",
    activeDashboardLabel: "डैशबोर्ड क्षेत्र",
    telemetryActive: "संयंत्र सेंसर: सुचारू रूप से चालू",
    telemetryDesc: "SMS-2 कंट्रोल रूम नेटवर्क ठीक से कार्य कर रहा है। गैस का स्तर बिल्कुल सुरक्षित है (5ppm)।",
    telemetrySync: "समय सिंक ठीक है",

    // Authentication Gate
    gatewayTitle: "फ़ैक्टरी सुरक्षा गेट",
    gatewayDesc: "अपने सुरक्षा प्रशिक्षण स्कोर की जाँच करने, ऑपरेटिंग गाइड पढ़ने और अपने अनुकूल प्रशिक्षण सहायक से बातचीत करने के लिए यहाँ लॉगिन करें।",
    labelFullName: "आपका पूरा नाम",
    labelDesignation: "आपकी नौकरी (पद) क्या है?",
    labelDept: "आप किस विभाग में काम करते हैं?",
    labelPrivilege: "आपकी भूमिका क्या है?",
    optEmployee: "फ़ील्ड स्टाफ़ कर्मचारी (Employee)",
    optManager: "भट्ठी पर्यवेक्षक (Manager)",
    optAdmin: "नेतृत्व (Admin)",
    labelUsername: "आपका यूजरनेम",
    labelPassword: "पासवर्ड",
    btnCompile: "सुरक्षित लॉगिन करें",
    btnCreateProfile: "एक नया कर्मचारी खाता पंजीकृत करें",
    btnReturn: "वापस लॉगिन स्क्रीन पर जाएं",

    // Dashboard Tabs Labels (Employee)
    tabIntel: "सफलता सूचकांक",
    tabMatrix: "कौशल मैट्रिक्स",
    tabTests: "सुरक्षा परीक्षाएं",
    tabPaths: "सीखने के मार्ग",
    tabTrainer: "एआई शिक्षक चैट",
    tabKnowledge: "सुरक्षा ऑपरेटिंग गाइड",
    tabMentors: "मार्गदर्शक (मेंटर्स) खोजें",
    tabGraph: "कौशल मैप ग्राफ़",

    // Tab Headers & Subtexts
    intelTitle: "आपकी सुरक्षा और कौशल सूचकांक",
    intelDesc: "यह आपके वास्तविक समय के सुरक्षा प्रदर्शन स्कोर, पूर्ण किए गए कार्यों और आज काम करने की योग्यता को दर्शाता है।",
    mySkillsTitle: "सत्यापित कौशल एवं योग्यता सूची",
    mySkillsDesc: "ये आपके आधिकारिक प्रशिक्षण स्तर हैं। उच्च स्तर होने का मतलब है कि आप कठिन और महत्वपूर्ण कार्य कर सकते हैं।",
    testsTitle: "सुरक्षा प्रश्नोत्तरी और परीक्षाएं",
    testsDesc: "हॉट ज़ोन में सुरक्षित रूप से काम करने के नियमों को सत्यापित करने के लिए इन परीक्षाओं को पूरा करें और ब्याज अनलॉक करें।",
    pathsTitle: "आपके व्यक्तिगत प्रशिक्षण मार्ग",
    pathsDesc: "मददगार अध्याय और शार्ट कोर्सेज जो आपके दैनिक परिचालन और सुरक्षा कौशलों को बेहतर बनाने में काम आएंगे।",
    trainerTitle: "एआई सारथी ट्यूटर के साथ बातचीत",
    trainerDesc: "मुझसे हिंदी, अंग्रेजी या हिंग्लिश में प्रश्न पूछें! मैं अलार्म प्रतिक्रिया, प्रीहीटिंग और प्लांट नियमों में आपकी सहायता कर सकता हूँ।",
    knowledgeTitle: "ऑपरेटिंग गाइड एवं SOP डेटाबेस",
    knowledgeDesc: "फैक्ट्री विशेषज्ञों द्वारा संकलित की गयी सरल प्रक्रियाओं (SOP), नियमों और सुरक्षा पुस्तिकाओं को आसानी से खोजें।",
    mentorsTitle: "संयंत्र के अनुभवी मार्गदर्शक (Mentors)",
    mentorsDesc: "क्या आपको परिचालन स्तर पर सहायता चाहिए? अपने विभाग के वरिष्ठ इंजीनियरों और सलाहकारों के साथ संपर्क स्थापित करें।",
    graphTitle: "इंटरैक्टिव कौशल मैप ग्राफ़",
    graphDesc: "एक रंगीन और समझने में आसान ग्राफ़ जो दिखाता है कि आपके कौशल, सुरक्षा प्रमाणपत्र और दस्तावेज़ एक दूसरे से कैसे जुड़े हैं।",

    // Language Toggle Bar
    toggleLabel: "Change System Language / भाषा बदलें",
    currentLangPrefix: "अभी चुनी गयी भाषा: ",
    englishBtn: "English (Simple)",
    hindiBtn: "हिन्दी (सरल)"
  }
};

export type Language = "en" | "hi";
