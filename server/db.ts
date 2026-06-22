import fs from "fs";
import path from "path";
import crypto from "crypto";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// Ensure types are robust
export interface User {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  role: "employee" | "manager" | "admin";
  jobTitle: string;
  department: string;
  profileCompleted: boolean;
  onboardingData?: {
    priorExperienceYrs: number;
    specialties: string[];
    certificationCompleted: string[];
  };
}

export interface Competency {
  id: string;
  code: string;
  name: string;
  description: string;
  criticality: "high" | "medium" | "low";
  category: "Safety" | "Metallurgy" | "Operation" | "Maintenance" | "Digital Systems" | "Functional" | "Technical" | "Digital" | "Behavioral" | "Leadership" | "Knowledge" | string;
  requiredLevel: number; // 1 to 5 scale
  proficiencyLevels?: { [level: number]: string };
  targetLevelByRole?: { [role: string]: number };
  assessmentMapping?: string[];
  learningResourceMapping?: string[];
}

export interface UserSkill {
  id: string;
  userId: string;
  competencyId: string;
  currentLevel: number; // 0 to 5
  updatedAt: string;
  source: "self" | "assessment" | "manager";
}

export interface Assessment {
  id: string;
  title: string;
  roleTarget: string; // Job title
  questions: {
    id: string;
    questionText: string;
    options: string[];
    correctAnswerIdx: number;
    points: number;
    competencyId: string;
    questionType?: string;
  }[];
}

export interface AssessmentAttempt {
  id: string;
  userId: string;
  assessmentId: string;
  score: number; // 0-100 percentage
  completedAt: string;
  answers: { [questionId: string]: number };
  passed: boolean;
  competencyScores?: { [competencyId: string]: number };
}

export interface Role {
  id: string;
  roleName: string;
  requiredCompetencies: { competencyId: string; targetLevel: number }[];
}

export interface Question {
  id: string;
  competencyId: string;
  questionText: string;
  questionTextHindi?: string;
  options: string[];
  optionsHindi?: string[];
  correctAnswerIdx: number;
  difficulty: "easy" | "medium" | "hard";
  questionType: "mcq" | "scenario" | "safety" | "technical" | "functional" | "digital_literacy" | "leadership";
  explanation: string;
  explanationHindi?: string;
}

export interface LearningModule {
  id: string;
  title: string;
  competencyId: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedMinutes: number;
  content: string;
  resources: { name: string; url: string }[];
  easyExplanation?: string;
  easyExplanationHindi?: string;
}

export interface LearningProgress {
  id: string;
  userId: string;
  moduleId: string;
  status: "not_started" | "in_progress" | "completed";
  completedAt?: string;
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  type: "sop" | "safety_manual" | "logbook" | "expert_session";
  content: string;
  competencyId?: string;
  tags: string[];
  createdBy: string;
  createdAt: string;
  embedding?: number[]; // Semantic vector
}

export interface MentorSession {
  id: string;
  mentorId: string;
  employeeId: string;
  competencyId: string;
  scheduledAt: string;
  sessionNotes: string;
  capturedKnowledge?: string; // Transformed to SOP if approved
  status: "pending" | "scheduled" | "completed" | "cancelled";
  approvedByManager: boolean;
}

export interface MentorNomination {
  id: string;
  userId: string;
  competencies: string[]; // Competency IDs
  yearsExp: number;
  status: "pending" | "approved" | "rejected";
}

// Relational Knowledge Graph definitions
export interface GraphNode {
  id: string;
  label: string;
  type: "user" | "competency" | "document" | "mentor" | "assessment";
  properties: { [key: string]: any };
}

export interface GraphEdge {
  id: string;
  source: string; // Node ID
  target: string; // Node ID
  relation: string; // e.g. "MASTERS", "RECOMMENDED_BY", "VALIDATES", "LINKED_TO", "MENTORS"
}

export interface DBState {
  users: User[];
  competencies: Competency[];
  userSkills: UserSkill[];
  assessments: Assessment[];
  attempts: AssessmentAttempt[];
  modules: LearningModule[];
  progress: LearningProgress[];
  docs: KnowledgeDoc[];
  mentorSessions: MentorSession[];
  mentorNominations: MentorNomination[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  roles?: Role[];
  questions?: Question[];
  ldMessages?: any[];
}

const DB_FILE = path.join(process.cwd(), "sarathi_db.json");

// HMAC secret for lightweight custom tokens
export const JWT_SECRET = process.env.JWT_SECRET || "sarathi-industrial-secret-key-998877";

// Initialize Firebase for Live Decoupled Backend Sync
let firestoreDb: any = null;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const app = initializeApp(firebaseConfig);
    firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    console.log("🔥 Live Firebase Decentralized Sync active.");
  }
} catch (e) {
  console.error("CorporateDatabase: Failed to initialize Firebase backend sync:", e);
}

async function syncDoc(collectionName: string, docId: string, modelData: any) {
  if (!firestoreDb) return;
  try {
    const cleanData = JSON.parse(JSON.stringify(modelData));
    await setDoc(doc(firestoreDb, collectionName, docId), cleanData);
    console.log(`📡 [Sync] Pushed ${collectionName}/${docId} successfully!`);
  } catch (err) {
    console.error(`⚠️ [Sync Error] ${collectionName}/${docId}:`, err);
  }
}

class CorporateDatabase {
  public state: DBState = {
    users: [],
    competencies: [],
    userSkills: [],
    assessments: [],
    attempts: [],
    modules: [],
    progress: [],
    docs: [],
    mentorSessions: [],
    mentorNominations: [],
    nodes: [],
    edges: [],
    roles: [],
    questions: [],
    ldMessages: []
  };

  constructor() {
    this.load();
  }

  private load() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const data = fs.readFileSync(DB_FILE, "utf-8");
        this.state = JSON.parse(data);
        if (!this.state.roles) this.state.roles = [];
        if (!this.state.questions) this.state.questions = [];
        if (!this.state.ldMessages) this.state.ldMessages = [];
        // Ensure some initial seed questions always run if none exist
        if (this.state.roles.length === 0 || this.state.questions.length === 0) {
          this.initializeDefaults();
        }
      } catch (e) {
        console.error("Failed to parse database. Initializing defaults.", e);
        this.initializeDefaults();
      }
    } else {
      this.initializeDefaults();
    }
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to write database file:", e);
    }
  }

  private initializeDefaults() {
    // Generate Master Competencies for Sarathi AI
    const comps: Competency[] = [
      {
        id: "comp_1",
        code: "SAF-HZP",
        name: "Hazard Analysis & Safety Compliance (सुरक्षा नियम)",
        description: "Standard plant safety, gas leak emergency drills, CO level monitoring, and assembly rules.",
        criticality: "high",
        category: "Behavioral",
        requiredLevel: 4,
        proficiencyLevels: {
          1: "Understand basic safety signs (मूल सुरक्षा संकेत समझना)",
          2: "Follow guided safety drills (निर्देशित सुरक्षा अभ्यास का पालन करना)",
          3: "Operate basic gas sensors independently (स्वतंत्र रूप से गैस सेंसर संचालित करना)",
          4: "Lead emergency evacuation audits (आपातकालीन निवासी निकासी का प्रबंधन करना)",
          5: "Design site-wide plant hazard controls (संयंत्र के लिए सुरक्षा नियंत्रण प्रणाली तैयार करना)"
        }
      },
      {
        id: "comp_2",
        code: "MET-CST",
        name: "Continuous Casting Operation (कास्टिंग संचालन)",
        description: "Managing tundish temperature, shroud placement, casting speed selection, and mould controls.",
        criticality: "high",
        category: "Technical",
        requiredLevel: 4,
        proficiencyLevels: {
          1: "Identify basic casting mould components (कास्टिंग मोल्ड के मूल भागों की पहचान करना)",
          2: "Set manual shroud pins under guidance (निरीक्षण में कफन पिन स्थापित करना)",
          3: "Adjust casting speeds in normal run (सामान्य रूप से कास्टिंग गति समायोजित करना)",
          4: "Manage emergency tundish shut-offs (आपातकालीन टंडिश शट-ऑफ संभालना)",
          5: "Optimize crystallization profiles for quality (गुणवत्ता के लिए कास्टिंग प्रोफाइल संरेखित करना)"
        }
      },
      {
        id: "comp_3",
        code: "MET-PHY",
        name: "Metallurgical Phase Control (धातुकर्म नियंत्रण)",
        description: "Steel phase transitions, grain matrices, pearlite coolings, and crystallization faults.",
        criticality: "high",
        category: "Technical",
        requiredLevel: 3,
        proficiencyLevels: {
          1: "Understand basic phase rules (मूल धातुकर्म चरण नियमों को समझना)",
          2: "Check steel carbon equivalents (इस्पात कार्बन अनुपात की जांच करना)",
          3: "Adjust cooling flow coefficients (कूलिंग प्रवाह मापदंडों को ठीक करना)",
          4: "Diagnose deep crystal faults in slabs (स्लैब में गहरी दरारों और दोषों का निदान करना)",
          5: "Design custom steel alloy cooling curves (तनाव मुक्त इस्पात के लिए कूलिंग प्रोफाइल बनाना)"
        }
      },
      {
        id: "comp_4",
        code: "MNT-PRV",
        name: "Preventive Mechanical Maintenance (यांत्रिक रखरखाव)",
        description: "Bending rollers calibration, mechanical alignments, hydraulic seals, and wear tests.",
        criticality: "medium",
        category: "Technical",
        requiredLevel: 4,
        proficiencyLevels: {
          1: "Perform basic oiling and check-ups (मूल तेल लगाना और रखरखाव जाँच करना)",
          2: "Follow inspection checklists for rollers (रोलर्स के लिए निरीक्षण चेकलिस्ट का पालन करना)",
          3: "Replace worn hydraulic seal nodes (घिसे हुए हाइड्रोलिक सील बदलना)",
          4: "Calibrate caster roller alignments (कास्टर रोलर संरेखण को कैलिब्रेट करना)",
          5: "Assess lifetime wear fatigue points (यांत्रिक जीवन चक्र और थकान बिंदुओं का आकलन करना)"
        }
      },
      {
        id: "comp_5",
        code: "DIG-SCD",
        name: "SCADA & Level-2 Automation Control (स्काडा नियंत्रण)",
        description: "Telemetry screens adjustment, heat logs review, PLC interlocking safety triggers.",
        criticality: "medium",
        category: "Digital",
        requiredLevel: 3,
        proficiencyLevels: {
          1: "Read screen gauges values (स्क्रीन पर लिखे डेटा और रीडिंग को पढ़ना)",
          2: "Acknowledge common operator alarms (मुख्य ऑपरेटर चेतावनियों को पहचानना)",
          3: "Toggle safety interlocks electronically (सुरक्षा प्रणालियों को चालू या बंद करना)",
          4: "Audit PLC signal logs for errors (पीएलसी सिग्नल त्रुटियों का ऑडिट करना)",
          5: "Program automated alarm responses (स्वचालित सुरक्षा प्रतिक्रियाओं को कॉन्फ़िगर करना)"
        }
      },
      {
        id: "comp_prc_mng",
        code: "PRC-MNG",
        name: "Process Management & Flow Control (प्रक्रिया प्रबंधन)",
        description: "Managing production flows, routing ladle schedules, and balancing furnace loads.",
        criticality: "medium",
        category: "Functional",
        requiredLevel: 3,
        proficiencyLevels: {
          1: "Log timing of active ladle melts (सक्रिय पिघलने के चक्र के समय को दर्ज करना)",
          2: "Maintain raw material flow indices (कच्चे माल के प्रवाह सूचकांक को बनाए रखना)",
          3: "Balance blast furnace inputs dynamically (भट्ठी के इनपुट संतुलन को प्रबंधित करना)",
          4: "Track and route multi-cast logistics (मल्टी-कास्ट लॉजिस्टिक्स को ट्रैक करना)",
          5: "Re-engineer factory layout workflows (फैक्ट्री लेआउट और प्रवाह का पुनर्गठन करना)"
        }
      },
      {
        id: "comp_ldr_dec",
        code: "LDR-DEC",
        name: "Team Leadership & Safety Decision Making (नेतृत्व क्षमता)",
        description: "Directing field operations, coordinating repairs, and rapid shift decisions.",
        criticality: "high",
        category: "Leadership",
        requiredLevel: 3,
        proficiencyLevels: {
          1: "Coordinate basic work handovers (मूल शिफ्ट हैंडओवर को पूरा करना)",
          2: "Distribute daily tasks to teammates (सहयोगियों को दैनिक कार्य सौंपना)",
          3: "Direct rapid emergency repairs on site (साइट पर त्वरित सुरक्षा मरम्मत का मार्गदर्शन करना)",
          4: "Conduct root cause shift audits (शिफ्ट के दौरान दुर्घटनाओं का मुख्य कारण खोजना)",
          5: "Foster unified factory safety cultures (संयंत्र में सुरक्षा की मजबूत संस्कृति स्थापित करना)"
        }
      },
      {
        id: "comp_knw_plt",
        code: "KNW-PLT",
        name: "Plant Assembly & Layout Guides (संयंत्र लेआउट ज्ञान)",
        description: "Deep understanding of casting machinery bounds, zone mappings, and equipment limits.",
        criticality: "low",
        category: "Knowledge",
        requiredLevel: 3,
        proficiencyLevels: {
          1: "Recall plant zone coordinates (संयंत्र क्षेत्र के निर्देशांक याद रखना)",
          2: "Identify secondary layout bottlenecks (द्वितीयक लेआउट बाधाओं की पहचान करना)",
          3: "Map gas lines and valve pathways (गैस लाइनों और वाल्व मार्गों का नक्शा बनाना)",
          4: "Verify pressure safety limit points (दबाव सुरक्षा सीमा बिंदुओं को सत्यापित करना)",
          5: "Optimize physical machinery installations (मशीनरी की भौतिक स्थापना को अनुकूलित करना)"
        }
      }
    ];

    // Seed default users (Admin, Manager, Employee)
    const adminHash = this.hashPassword("admin123");
    const managerHash = this.hashPassword("manager123");
    const employeeHash = this.hashPassword("employee123");

    const users: User[] = [
      {
        id: "user_admin",
        username: "admin",
        passwordHash: adminHash,
        fullName: "Siddharth Sen (VP of Talent & Quality)",
        role: "admin",
        jobTitle: "Operations Director",
        department: "L&D Division",
        profileCompleted: true
      },
      {
        id: "user_manager",
        username: "manager",
        passwordHash: managerHash,
        fullName: "Amitabh Banerjee",
        role: "manager",
        jobTitle: "Blast Furnace Group Manager",
        department: "Iron Making",
        profileCompleted: true
      },
      {
        id: "user_employee",
        username: "employee",
        passwordHash: employeeHash,
        fullName: "Rajesh Kumar",
        role: "employee",
        jobTitle: "Continuous Casting Specialist",
        department: "Steel Melting Shop 2",
        profileCompleted: true,
        onboardingData: {
          priorExperienceYrs: 4,
          specialties: ["Ladle Metallurgy", "SCADA Monitoring"],
          certificationCompleted: ["Plant Safety Level I"]
        }
      }
    ];

    // Seed default skills
    const userSkills: UserSkill[] = [
      {
        id: "skill_1",
        userId: "user_employee",
        competencyId: "comp_1",
        currentLevel: 3,
        updatedAt: new Date().toISOString(),
        source: "self"
      },
      {
        id: "skill_2",
        userId: "user_employee",
        competencyId: "comp_2",
        currentLevel: 4,
        updatedAt: new Date().toISOString(),
        source: "manager"
      },
      {
        id: "skill_3",
        userId: "user_employee",
        competencyId: "comp_3",
        currentLevel: 1,
        updatedAt: new Date().toISOString(),
        source: "self"
      },
      {
        id: "skill_4",
        userId: "user_employee",
        competencyId: "comp_5",
        currentLevel: 2,
        updatedAt: new Date().toISOString(),
        source: "self"
      }
    ];

    // Seed default Knowledge SOP documents
    const docs: KnowledgeDoc[] = [
      {
        id: "doc_1",
        title: "Standard Operating Procedure: Tundish Preheating & Casting Inception",
        type: "sop",
        content: `Standard operation guidelines for pre-operational setups on the Continuous Casting Machine #2 (CCM-2):
1. PREHEATING PROTOCOLS: Tundish preheating must compile with heating curves up to 1100°C for at least 90 minutes to prevent thermal shocking in refractories.
2. SHROUP PLACEMENT: Set the ladle shroud with argon purging rings gas-tight at 15 cubic meters per hour. Ensure no ambient oxygen ingress.
3. INITIATION SPEED: Start casting sequence at 0.6 meters/minute. Gradually scale to design speed of 1.2 meters/minute over 10 minutes.
4. EMERGENCY RESPONSE: In case of mould level control malfunctions, instantly trigger the emergency tundish slider-gate close and divert molten metal to ladle capture sinks.`,
        competencyId: "comp_2",
        tags: ["Tundish", "CCM", "Casting", "SOP"],
        createdBy: "user_admin",
        createdAt: new Date().toISOString()
      },
      {
        id: "doc_2",
        title: "Plant Safety Manual: Blast Furnace Gas Leak & HAZOP Action Plans",
        type: "safety_manual",
        content: `Emergency drill sequence for industrial melting sectors under severe Carbon Monoxide (CO) gas risk:
1. DETECTOR ALARMS: At CO concentration exceeding 30ppm, personal sensors will pulse a warn chirp. At 50ppm, evacuation is legally initiated.
2. VENTILATION ADJUSTMENTS: SCADA operators must force open top blast release valves to vent trapped pressure.
3. ASSEMBLY CO-ORDINATION: Shift operators will assemble at Wind Direction Beacon #4 upwind of source.
4. RESCUE KITS: Breathing protection masks are distributed inside Zone B maintenance boxes. Only certified technicians handle repair operations under positive air breathing supply.`,
        competencyId: "comp_1",
        tags: ["CO Leak", "HAZOP", "Blast Furnace", "Evacuation"],
        createdBy: "user_admin",
        createdAt: new Date().toISOString()
      },
      {
        id: "doc_3",
        title: "Metallurgical Guide: High Carbon Cooling Rate Formulas & Phase Solidification",
        type: "expert_session",
        content: `Expert Seminar on Steel Hardening Micro-Structures:
1. SOLIDIFICATION PHASES: Fast mist spraying triggers martensite formations that reduce slab flexibility. We prioritize pearlitic-ferritic grain bounds.
2. AMBIENT COOLING FORMULA: Target water flow coefficients of 1.15 to 1.30 Liters per kilogram of steel.
3. FAULTY TRANSITIONS: Casting speed drops below 0.8 meters/minute can form coarse grains causing steel brittleness and tearing under subsequent heavy rolling.`,
        competencyId: "comp_3",
        tags: ["Crystallization", "Solidification", "Phase Control", "Martensite"],
        createdBy: "user_manager",
        createdAt: new Date().toISOString()
      }
    ];

    // Seed default Assessments
    const assessments: Assessment[] = [
      {
        id: "assess_1",
        title: "HAZOP & Gas Safety Validation Test",
        roleTarget: "Continuous Casting Specialist",
        questions: [
          {
            id: "q1",
            questionText: "What carbon monoxide (CO) sensor limit triggers legal workplace evacuation according to the safety guidelines?",
            options: ["10 ppm", "20 ppm", "30 ppm", "50 ppm"],
            correctAnswerIdx: 3,
            points: 20,
            competencyId: "comp_1"
          },
          {
            id: "q2",
            questionText: "Where should crew members group during a blast furnace gas leak?",
            options: [
              "Upwind at designated Wind Direction Beacon locations",
              "Basement storm shelter pits",
              "Inside control rooms with high windows",
              "Downwind perimeter gates"
            ],
            correctAnswerIdx: 0,
            points: 20,
            competencyId: "comp_1"
          },
          {
            id: "q3",
            questionText: "Which gas is used for purging rings when installing steel ladle shrouds?",
            options: ["Carbon Dioxide", "Nitrogen", "Argon", "Oxygen"],
            correctAnswerIdx: 2,
            points: 20,
            competencyId: "comp_1"
          },
          {
            id: "q4",
            questionText: "Emergency breathing apparatus kits for safety rescue are stored inside:",
            options: [
              "Zone B maintenance boxes",
              "Plant cafeteria backrooms",
              "Administrative main offices",
              "Parking lot security booths"
            ],
            correctAnswerIdx: 0,
            points: 20,
            competencyId: "comp_1"
          },
          {
            id: "q5",
            questionText: "What is the primary SCADA intervention during blast furnace overpressure alarms?",
            options: [
              "Open top blast release valves to vent gas",
              "Shut off backup electrical water pumps",
              "De-energize PLC control networks",
              "Activate emergency crane lifts"
            ],
            correctAnswerIdx: 0,
            points: 20,
            competencyId: "comp_1"
          }
        ]
      },
      {
        id: "assess_2",
        title: "Continuous Caster Operations Certification",
        roleTarget: "Continuous Casting Specialist",
        questions: [
          {
            id: "q2_1",
            questionText: "What is the recommended tundish preheating duration to avoid thermal shock?",
            options: ["15 minutes", "30 minutes at 500°C", "90 minutes up to 1100°C", "5 hours at 200°C"],
            correctAnswerIdx: 2,
            points: 25,
            competencyId: "comp_2"
          },
          {
            id: "q2_2",
            questionText: "At what starting casting speed is the continuous casting drum CCM-2 initialized?",
            options: ["0.2 m/min", "0.6 m/min", "1.2 m/min", "2.0 m/min"],
            correctAnswerIdx: 1,
            points: 25,
            competencyId: "comp_2"
          },
          {
            id: "q2_3",
            questionText: "What is the primary target water spray volume for standard phase solidification control?",
            options: ["0.1-0.2 L/kg", "0.5-0.8 L/kg", "1.15-1.30 L/kg", "3.0-4.5 L/kg"],
            correctAnswerIdx: 2,
            points: 25,
            competencyId: "comp_2"
          },
          {
            id: "q2_4",
            questionText: "What casting defect is highly correlated to slow speeds under 0.8 m/min?",
            options: [
              "Coarse crystalline grain growth and increased steel brittleness",
              "Ultra-rapid carbide clustering",
              "Incomplete slag melting",
              "Instant hydraulic pressure loss"
            ],
            correctAnswerIdx: 0,
            points: 25,
            competencyId: "comp_2"
          }
        ]
      }
    ];

    // Seed default Learning modules
    const modules: LearningModule[] = [
      {
        id: "mod_1",
        title: "Advanced HAZOP Analysis & Plant Air Protection",
        competencyId: "comp_1",
        difficulty: "intermediate",
        estimatedMinutes: 45,
        content: `### Hazard Identification and CO Safety Principles
Industrial plants are vulnerable to gas leakages, primarily carbon monoxide (CO), which is highly toxic, completely odorless, and invisible.

### Core Metrics to Remember:
1. **At 30ppm**: Pre-alarm warnings begin. Wear personal respirator kits.
2. **At 50ppm**: Plant sirens trigger evacuation protocols. Assemble at Wind Beacons immediately.
3. SCADA safety interlocking systems are designed to automate venting when pressure gauges hit red zones.`,
        resources: [
          { name: "Safety Video: HAZOP Study Analysis Model", url: "https://www.youtube.com/watch?v=1F_U2rP1gM4" },
          { name: "SOP Document: OSHA Process Safety Hazard Guidelines", url: "https://www.osha.gov/sites/default/files/publications/osha3132.pdf" },
          { name: "Manual: HSE UK Carbon Monoxide Safety in Workspace", url: "https://www.hse.gov.uk/pubns/indg360.pdf" }
        ],
        easyExplanation: "A HAZOP (Hazard and Operability) study is like a detailed 'what-if' checklist for a factory. Engineers sit down and look at every pipe, valve, and pump, asking: 'What if this pipe clogs?' or 'What if this gas lever fails?' We focus heavily on invisible hazards like Carbon Monoxide (CO). CO is a silent hazard with no smell or color. If sirens sound (above 30ppm), you must wear breathing masks, look at the plant windsock, and evacuate in the opposite direction of the wind to prevent gas inhalation.",
        easyExplanationHindi: "HAZOP (हज़ार्ड एंड ऑपरेबिलिटी) अध्ययन एक फैक्टरी के सेफ्टी गाइड की तरह है। इंजीनियर हर पाइप, वाल्व और पंप की जांच करते हैं और पूछते हैं: 'अगर यह मशीन खराब हुई तो क्या होगा?' हवा में कार्बन मोनोऑक्साइड (CO) जैसी अदृश्य और गंधहीन जहरीली गैस का रिसाव होने पर तत्काल सुरक्षा कार्रवाई आवश्यक है। अलार्म बजने (30ppm से अधिक) पर तुरंत सुरक्षित मास्क पहनें, विंड सॉक (हवा की दिशा बताने वाला कपड़ा) को देखकर हवा की विपरीत दिशा में सुरक्षित असेंबली जोन की ओर बढ़ें।"
      },
      {
        id: "mod_2",
        title: "Ladle Pouring & Continuous Caster Mechanical Mastery",
        competencyId: "comp_2",
        difficulty: "advanced",
        estimatedMinutes: 60,
        content: `### Casting Machine Operations
Understand ladle shroud connections and sliding valve gates on tundish setups:
- Pre-heating tundishes to 1100°C eliminates thermal cracking.
- Introduce argon gas purging blocks to block ambient oxygen oxidation risks.
- Steel solidifies inside molds under electromagnetic stirrings to control dendritic crystallizations.`,
        resources: [
          { name: "Casting Video: Continuous Casting Machine (CCM) Operations", url: "https://www.youtube.com/watch?v=A_0fL66i6R0" },
          { name: "SOP Manual: World Steel Association - Steel Processing Guide", url: "https://worldsteel.org/wp-content/uploads/Steel-processing.pdf" },
          { name: "Education Portal: Steeluniversity Steelmaking Academy", url: "https://steeluniversity.org/" }
        ],
        easyExplanation: "Imagine the continuous casting machine like a giant automated mold for manufacturing steel slabs at 1600°C! Molten steel is poured from a colossal transport bucket ('Ladle') into a holding tub ('Tundish'). The tundish feeds the steel into water-cooled copper molds. Pre-heating elements to 1100°C prevents cracks from sudden temperature drops. We inject Argon gas blockades to push away oxygen—otherwise, oxygen bubbles inside the steel slab make it incredibly weak and brittle.",
        easyExplanationHindi: "कंटीन्यूअस कास्टिंग मशीन (CCM) को 1600°C पर पिघले हुए लोहे को सीधे मजबूत स्टील स्लैब में बदलने की प्रक्रिया समझें! पिघला स्टील एक बड़े बर्तन ('लाडल') से एक छोटे टब ('टंडिश') में गिरता है, जो स्टील को तांबे के सांचे (मोल्ड) में भेजता है। सांचे को 1100°C तक पहले से गर्म किया जाता है ताकि स्टील अचानक ठंडा होकर फटे नहीं। पिघले स्टील में आर्गन गैस डाली जाती है ताकि बाहरी हवा का ऑक्सीजन स्टील के भीतर बुलबुले न बना सके, जिससे स्टील की बनावट कमजोर न हो।"
      },
      {
        id: "mod_3",
        title: "Metallurgical Grain Control: Pearlite-Ferrite Structures",
        competencyId: "comp_3",
        difficulty: "advanced",
        estimatedMinutes: 90,
        content: `### Phase Equilibrium in Steel Casting
How speed, chemical additions, and mist cooling configure quality casting slabs:
- Rapid chilling leads to martensitic phases which are too brittle for high-tension pipelines.
- Slow cooling develops coarse ferrite matrices. We require structured spray headers delivering 1.25 L/Kg of caster flow coefficients.`,
        resources: [
          { name: "Metallurgy Video: Iron-Carbon Phase Diagrams & Grain Alloys", url: "https://www.youtube.com/watch?v=8V-wF5Z0vT0" },
          { name: "Lecture Notes: MIT Material Systems - Iron Carbon System PDF", url: "https://ocw.mit.edu/courses/3-091sc-introduction-to-solid-state-chemistry-fall-2010/7cba8b0fae41ab4c803080ffab7709a3_MIT3_091SCF10_lec26.pdf" },
          { name: "Research Link: Cambridge University Microstructure Library (DoITPoMS)", url: "https://www.doitpoms.ac.uk/" }
        ],
        easyExplanation: "When steel cools down, its cooling speed determines its final toughness. Slow cooling makes the steel soft and shapeable (called 'Ferrite' and 'Pearlite'). Suddenly cooling it with cold water (quenching) creates a structure called 'Martensite' which is as brittle as glass and snaps easily! To achieve the perfect blend of strength and flexibility, we spray water at a precise, calculated rate of 1.25 liters of water per kilogram of steel.",
        easyExplanationHindi: "जब गर्म स्टील ठंडा होता है, तो उसका ठंडा होने की स्पीड उसकी मजबूती तय करती है। धीरे-धीरे ठंडा करने पर सॉफ्ट और लचीला ढांचा मिलता है जिसे 'फेराइट' और 'पर्लाइट' कहते हैं। यदि उसे सीधे पानी में डालकर अचानक ठंडा किया जाए, तो वह 'मार्टेंसाइट' बन जाता है जो शीशे की तरह नाजुक होता है। सही मजबूती के लिए, हम विशेष स्प्रे पाइप से स्टील की सतह पर बिल्कुल सटीक 1.25 लीटर पानी प्रति किलोग्राम की दर से छिड़काव करते हैं।"
      },
      {
        id: "mod_4",
        title: "Industrial Hydraulic Systems & Roller Bearing Calibrations",
        competencyId: "comp_4",
        difficulty: "intermediate",
        estimatedMinutes: 50,
        content: `### Mechanical Alignment and Roller Upkeep
Proper laser calibration of casting rollers is necessary to prevent steel slab bulging.
- Check roll gap accuracy within ±0.1mm tolerance using digital calipers.
- Monitor hydraulic oil pressure to prevent sudden piston drops.
- Replace worn seals whenever fluid discoloration indicates metallic contamination.`,
        resources: [
          { name: "Mechanic Video: Hydraulic Cylinders and Wear Seals Rebuilding", url: "https://www.youtube.com/watch?v=FjIuCqJq3Cg" },
          { name: "SOP Handbook: SKF Ball and Roller Bearing Assembly Guides", url: "https://www.skf.com/group/products/rolling-bearings" }
        ],
        easyExplanation: "In high-pressure machinery, alignment is everything. If casting rollers are even 1 millimeter out of alignment, the hot steel slab will bulge and crack, causing a disastrous spill. Preventive maintenance involves using precise laser sensors to check gaps (within ±0.1mm), inspecting hydraulic oil for rubber debris or water, and replacing leaking piston seals immediately to maintain peak alignment pressure.",
        easyExplanationHindi: "मशीनों के रोलर्स ट्रेन के पहियों की तरह लगातार भारी प्रेशर में रहते हैं। अगर एक भी रोलर थोड़ा भी आगे-पीछे संरेखित (out of align) हो, तो स्टील स्लैब टेढ़ा होकर फट सकता है। समय पर यांत्रिक रखरखाव का मतलब है - लेजर गाइड से रोलर स्पेसिंग मापना, रबर सीलिंग्स की जांच करना और हाइड्रोलिक पाइप के प्रेशर को लगातार बनाए रखना ताकि पिघले स्टील को सटीक आकार दिया जा सके।"
      },
      {
        id: "mod_5",
        title: "SCADA & Level-2 Automation Control Systems",
        competencyId: "comp_5",
        difficulty: "intermediate",
        estimatedMinutes: 45,
        content: `### Monitoring Telemetry Screens & Realtime Alarms
Configure active safety relays and automated safety interlocks.
- Level-2 computer models calculate metallurgical coolings and trigger water valves.
- Understand how PLC registers receive inputs from thermocouple sensors and signal relays to close emergency valves if the temperature exceeds critical limits.`,
        resources: [
          { name: "Overview Video: SCADA Systems and PLC Architecture Explained", url: "https://www.youtube.com/watch?v=AIs_99VOfpE" },
          { name: "SOP Manual: Siemens Industrial Automation Online Support Desk", url: "https://support.industry.siemens.com/cs/ww/en/view/109741206" }
        ],
        easyExplanation: "SCADA and Level-2 models are the central nervous system of modern steel plants. Instead of climbing up hot, hazardous furnaces to read analog gauges, operators configure computerized safety programs called 'Interlocks'. If temperature readings from thermocouple sensors spike unexpectedly, the computer (PLC) automatically opens heavy safety cooling valves within milliseconds to protect workers.",
        easyExplanationHindi: "SCADA और ऑटोमेशन सिस्टम पूरे स्टील कारखाने का कंप्यूटर संचालित दिमाग हैं। खतरनाक हॉट ज़ोन में जाकर मैनुअल चेकिंग करने के बजाय, ऑपरेटर कंप्यूटर स्क्रीन पर रियल-टाइम तापमान और प्रेशर देखते हैं। यदि कोई डेंजर सिग्नल मिलता है, तो सुरक्षा प्रणाली (इंटरलॉक) इंसानी क्लिक की प्रतीक्षा किए बिना स्वचालित रूप से सुरक्षा वाल्व बंद कर देती है।"
      },
      {
        id: "mod_6",
        title: "Field Leadership & Incident Command Guidelines",
        competencyId: "comp_ldr_dec",
        difficulty: "advanced",
        estimatedMinutes: 40,
        content: `### Directing Shifts in Critical Incidents
Maintain clear communication channels during active melt transfers:
- Establish designated safety roles before high-temperature operations begin.
- Ensure complete adherence to lockout-tagout (LOTO) key protocols before allowing any physical mechanical work.`,
        resources: [
          { name: "Safety Video: Leadership and Human Factors in Industrial Settings", url: "https://www.youtube.com/watch?v=F4L1v9Gnd8A" },
          { name: "SOP Standard: OSHA Lockout Tagout (LOTO) Guidelines Book", url: "https://www.osha.gov/sites/default/files/publications/3120.pdf" }
        ],
        easyExplanation: "Safety leadership is about protecting your crew under pressure. Before anyone climbs into a machinery cage for cleaning, you must enforce Lockout-Tagout (LOTO). All electrical switches are locked with physical padlocks, and workers carry the physical key in their pocket. This removes human communication errors: no one can accidentally restart a conveyor belt, boiler, or roller while a human is inside servicing it.",
        easyExplanationHindi: "टीम लीडरशिप का उद्देश्य विषम परिस्थितियों में अपने सहयोगियों को पूर्ण सुरक्षा देना है। किसी भी मशीनरी में मरम्मत या सफाई से पहले 'लॉकआउट-टैगआउट' (LOTO) प्रोटोकॉल लागू करें। मशीन के स्विच पैनल को व्यक्तिगत ताले से बंद करें और उसकी चाबी खुद अपनी जेब में रखें। इससे दुर्घटना की संभावना समाप्त हो जाएगी क्योंकि आपकी अनुमति और चाबी के बिना कोई अन्य व्यक्ति मशीन शुरू नहीं कर सकेगा।"
      }
    ];

    // Seed interactive Knowledge Graph Nodes and Edges
    // Nodes
    const nodes: GraphNode[] = [
      { id: "node_user_rajesh", label: "Rajesh Kumar (Employee)", type: "user", properties: { dept: "SMS-2", title: "Caster Specialist" } },
      { id: "node_user_amitabh", label: "Amitabh Banerjee (Manager)", type: "user", properties: { dept: "Iron Making", title: "Furnace Manager" } },
      { id: "node_comp_hazop", label: "Gas Safety & HAZOP (Competency)", type: "competency", properties: { criticality: "high", category: "Safety" } },
      { id: "node_comp_caster", label: "Continuous Casting Operation (Competency)", type: "competency", properties: { criticality: "high", category: "Operation" } },
      { id: "node_comp_comp_3", label: "Metallurgical Phase Control (Competency)", type: "competency", properties: { criticality: "high", category: "Metallurgy" } },
      { id: "node_comp_comp_4", label: "Preventive Mechanical Maintenance (Competency)", type: "competency", properties: { criticality: "medium", category: "Maintenance" } },
      { id: "node_comp_comp_5", label: "SCADA & Level-2 Automation Control (Competency)", type: "competency", properties: { criticality: "medium", category: "Digital Systems" } },
      { id: "node_doc_sop", label: "Tundish SOP #2 (Doc)", type: "document", properties: { docType: "sop", taggedComp: "comp_2" } },
      { id: "node_doc_safety", label: "Gas Leak Drill Manual (Doc)", type: "document", properties: { docType: "safety_manual", taggedComp: "comp_1" } },
      { id: "node_assess_safety", label: "Safety Verification (Assessment)", type: "assessment", properties: { qNum: 5 } }
    ];

    // Edges
    const edges: GraphEdge[] = [
      { id: "edge_1", source: "node_user_rajesh", target: "node_comp_caster", relation: "MASTERS" },
      { id: "edge_2", source: "node_user_rajesh", target: "node_comp_hazop", relation: "ACQUIRING" },
      { id: "edge_3", source: "node_user_amitabh", target: "node_user_rajesh", relation: "MANAGES" },
      { id: "edge_4", source: "node_doc_sop", target: "node_comp_caster", relation: "LINKED_TO" },
      { id: "edge_5", source: "node_doc_safety", target: "node_comp_hazop", relation: "LINKED_TO" },
      { id: "edge_6", source: "node_assess_safety", target: "node_comp_hazop", relation: "VALIDATES" },
      { id: "edge_7", source: "node_user_amitabh", target: "node_comp_hazop", relation: "MENTORS" }
    ];

    // Seed Dynamic Roles
    const seedRoles: Role[] = [
      {
        id: "role_1",
        roleName: "Blast Furnace Operator (फर्नेस ऑपरेटर)",
        requiredCompetencies: [
          { competencyId: "comp_1", targetLevel: 4 },
          { competencyId: "comp_2", targetLevel: 3 },
          { competencyId: "comp_5", targetLevel: 3 }
        ]
      },
      {
        id: "role_2",
        roleName: "Maintenance Technician (रखरखाव तकनीशियन)",
        requiredCompetencies: [
          { competencyId: "comp_1", targetLevel: 4 },
          { competencyId: "comp_4", targetLevel: 4 },
          { competencyId: "comp_5", targetLevel: 3 }
        ]
      },
      {
        id: "role_3",
        roleName: "Supervisor (सुपरवाइजर)",
        requiredCompetencies: [
          { competencyId: "comp_1", targetLevel: 4 },
          { competencyId: "comp_ldr_dec", targetLevel: 4 },
          { competencyId: "comp_prc_mng", targetLevel: 4 }
        ]
      },
      {
        id: "role_4",
        roleName: "Continuous Casting Specialist (कास्टिंग विशेषज्ञ)",
        requiredCompetencies: [
          { competencyId: "comp_1", targetLevel: 4 },
          { competencyId: "comp_2", targetLevel: 4 },
          { competencyId: "comp_3", targetLevel: 3 },
          { competencyId: "comp_5", targetLevel: 3 }
        ]
      }
    ];

    // Seed Dynamic Questions (incorporating English & Hindi labels/content)
    const seedQuestions: Question[] = [
      // === 🛠️ TECHNICAL QUESTIONS (5 Questions: q_1 to q_5) ===
      {
        id: "q_1",
        competencyId: "comp_2",
        questionText: "What is the primary thermodynamic purpose of preheating a continuous caster tundish to 950°C before operation?",
        questionTextHindi: "कास्टिंग से पहले टंडिश प्री-हीटिंग (950°C) का मुख्य थर्मोडायनामिक उद्देश्य क्या है?",
        options: [
          "To avoid thermal shock and cracking of refractory linings",
          "To reduce carbon solubility in the ladle",
          "To eliminate silicon monoxide gas pockets",
          "To accelerate primary cooling spray rates"
        ],
        optionsHindi: [
          "रिफ्रेक्ट्री लाइनिंग में थर्मल शॉक और दरारों से बचना",
          "लैडल में कार्बन की घुलनशीलता को कम करना",
          "सिलिकॉन मोनोऑक्साइड गैस पॉकेट को समाप्त करना",
          "प्राथमिक शीतलन स्प्रे दरों में तेजी लाना"
        ],
        correctAnswerIdx: 0,
        difficulty: "easy",
        questionType: "technical",
        explanation: "Preheating refractory materials avoids rapid heat loss and structural cracking.",
        explanationHindi: "रिफ्रेक्ट्री सामग्री को पहले से गर्म करने से तेजी से तापमान नुकसान और संरचनात्मक दरारें टल जाती हैं।"
      },
      {
        id: "q_2",
        competencyId: "comp_3",
        questionText: "Which microstructure phase represents high hardness but low ductility, making it problematic for structural steel layout weldability?",
        questionTextHindi: "कौन सा माइक्रोस्ट्रक्चर चरण उच्च कठोरता लेकिन कम लचीलापन दर्शाता है, जो स्टील वेल्डेबिलिटी के लिए समस्याग्रस्त है?",
        options: ["Austenite", "Coarse Pearlite", "Martensite", "Ferrite"],
        optionsHindi: ["ऑस्टेनाइट", "मोटा पर्लाइट", "मार्टेंसाइट", "फेराइट"],
        correctAnswerIdx: 2,
        difficulty: "medium",
        questionType: "technical",
        explanation: "Martensite is brittle and hard, causing cracks under residual stresses.",
        explanationHindi: "मार्टेंसाइट का निर्माण अत्यधिक तेज गति से ठंडा करने पर होता है, जिससे स्लैब कठोर व नाजुक हो जाता है।"
      },
      {
        id: "q_3",
        competencyId: "comp_3",
        questionText: "In steel metallurgy, what is the critical effect of excessive aluminum additions in liquid steel?",
        questionTextHindi: "स्टील धातुकर्म में, तरल इस्पात में अत्यधिक एल्युमिनियम मिलाने का गंभीर प्रभाव क्या होता है?",
        options: [
          "Accelerates pearlite transformation",
          "Causes alumina nozzle clogging in tundish stream",
          "Increases steel sulfur concentration",
          "Maintains liquid slag fluidity"
        ],
        optionsHindi: [
          "पर्लाइट परिवर्तन को तेज करता है",
          "टंडिश प्रवाह में एल्युमिना नोजल ब्लॉकेज का कारण बनता है",
          "स्टील में सल्फर की सांद्रता को बढ़ाता है",
          "तरल स्लैग की तरलता बनाए रखता है"
        ],
        correctAnswerIdx: 1,
        difficulty: "hard",
        questionType: "technical",
        explanation: "Excess Al forms solid alumina particles that stick to casting nozzles.",
        explanationHindi: "अत्यधिक एल्युमीनियम से एल्युमिना का जमाव बढ़ता है जो नोजल को अवरुद्ध कर देता है।"
      },
      {
        id: "q_4",
        competencyId: "comp_2",
        questionText: "What is the main cause of surface slag entrapment in casting slabs?",
        questionTextHindi: "कास्टिंग स्लैब में सतह पर स्लैग फंसने (Slag entrapment) का मुख्य कारण क्या है?",
        options: [
          "Low spray nozzle pressure",
          "Excessive mold level fluctuations",
          "Elevated secondary cooling temperatures",
          "Inert gas pressure deficit"
        ],
        optionsHindi: [
          "कम स्प्रे नोजल दबाव",
          "अत्यधिक मोल्ड स्तर में उतार-चढ़ाव",
          "बढ़ा हुआ द्वितीयक शीतलन तापमान",
          "अक्रिय गैस के दबाव की कमी"
        ],
        correctAnswerIdx: 1,
        difficulty: "medium",
        questionType: "technical",
        explanation: "Uncontrolled fluctuations pull liquid slag into the solidifying metal shell.",
        explanationHindi: "मोल्ड में स्तर के अत्यधिक उतार-चढ़ाव से तरल स्लैग जमे हुए धातु में प्रवेश कर जाता है।"
      },
      {
        id: "q_5",
        competencyId: "comp_3",
        questionText: "How does mold powder thickness affect heat transfer between mold copper plates and solidifying steel?",
        questionTextHindi: "मोल्ड पाउडर की मोटाई मोल्ड तांबे की प्लेटों और ठोस हो रहे स्टील के बीच थर्मल ट्रांसफर को कैसे प्रभावित करती है?",
        options: [
          "Acts as thermal insulation and lubrication layer",
          "Completely blocks vertical cooling system",
          "Triggers direct metal-to-metal friction",
          "Evaporates coolant water flow instantly"
        ],
        optionsHindi: [
          "थर्मल इन्सुलेशन और स्नेहन (lubrication) परत के रूप में कार्य करता है",
          "वर्टिकल कूलिंग सिस्टम को पूरी तरह से अवरुद्ध करता है",
          "सीधे मेटल-टू-मेटल घर्षण को ट्रिगर करता है",
          "कूलेंट पानी के प्रवाह को तुरंत वाष्पित करता है"
        ],
        correctAnswerIdx: 0,
        difficulty: "medium",
        questionType: "technical",
        explanation: "Mold powder provides lubricated insulation, preventing thermal overload on mold plates.",
        explanationHindi: "मोल्ड पाउडर शुष्क घर्षण रोकता है और गर्मी का समान वितरण आश्वस्त करता है।"
      },

      // === 📋 FUNCTIONAL QUESTIONS (5 Questions: q_6 to q_10) ===
      {
        id: "q_6",
        competencyId: "comp_1",
        questionText: "What is the standard operating protocol when a ladle breakout alarm is triggered near the caster?",
        questionTextHindi: "कास्टर के पास लैडल ब्रेकआउट अलार्म बजने पर मानक संचालन प्रोटोकॉल क्या है?",
        options: [
          "Immediately divert stream to emergency ladle pits",
          "Increase mold oscillation frequency by 20%",
          "Close the secondary coolant water valves",
          "Inspect physical hydraulic seals while stream runs"
        ],
        optionsHindi: [
          "प्रवाह को तुरंत आपातकालीन लैडल गड्ढों (pits) में मोड़ें",
          "मोल्ड दोलन की आवृत्ति को 20% बढ़ाएं",
          "द्वितीयक कूलेंट पानी के वाल्व बंद करें",
          "प्रवाह चलने के दौरान भौतिक हाइड्रोलिक सील का निरीक्षण करें"
        ],
        correctAnswerIdx: 0,
        difficulty: "easy",
        questionType: "functional",
        explanation: "Diverting molten metal safely to refractory-lined pits prevents destructive plant floor damage.",
        explanationHindi: "पिघली धातु को सुरक्षित गड्ढों में मोड़ने से संयंत्र क्षेत्र में आग और भारी नुकसान टल जाता है।"
      },
      {
        id: "q_7",
        competencyId: "comp_2",
        questionText: "Which test is used in casting quality control to detect interior micro-cracks in solid slabs?",
        questionTextHindi: "ठोस स्लैब में आंतरिक सूक्ष्म दरारों का पता लगाने के लिए कास्टिंग गुणवत्ता नियंत्रण में किस परीक्षण का उपयोग किया जाता है?",
        options: [
          "Visual inspection only",
          "Ultrasonic Non-Destructive Testing (NDT)",
          "Ladle chemistry carbon analysis",
          "Basic temperature thermocouple audits"
        ],
        optionsHindi: [
          "केवल दृश्य निरीक्षण",
          "अल्ट्रासोनिक गैर-विनाशकारी परीक्षण (NDT)",
          "लैडल रसायन कार्बन विश्लेषण",
          "बुनियादी तापमान थर्मोकपल ऑडिट"
        ],
        correctAnswerIdx: 1,
        difficulty: "medium",
        questionType: "functional",
        explanation: "Ultrasonic NDT reveals hidden internal voids and micro fissures without destroying the slab.",
        explanationHindi: "अल्ट्रासोनिक तरंगे ठोस लोहे के अंदर छिपी हुई सूक्ष्म दरारें दर्शाती हैं।"
      },
      {
        id: "q_8",
        competencyId: "comp_2",
        questionText: "What is the primary role of a ladle shroud during the liquid steel transfer phase?",
        questionTextHindi: "तरल स्टील ट्रांसफर चरण के दौरान लैडल श्राउड (shroud) की प्राथमिक भूमिका क्या है?",
        options: [
          "To increase molten steel temperature",
          "To prevent re-oxidation from ambient air contact",
          "To filter carbon impurities mechanically",
          "To control caster vibration parameters"
        ],
        optionsHindi: [
          "पिघले हुए स्टील का तापमान बढ़ाने के लिए",
          "परिवेशी वायु संपर्क से पुन: ऑक्सीकरण (re-oxidation) को रोकने के लिए",
          "कार्बन अशुद्धियों को यांत्रिक रूप से छानने के लिए",
          "कास्टर कंपन मापदंडों को नियंत्रित करने के लिए"
        ],
        correctAnswerIdx: 1,
        difficulty: "easy",
        questionType: "functional",
        explanation: "Ladle shrouds physically block contact with atmospheric oxygen, preserving steel quality.",
        explanationHindi: "लैडल श्राउड इस्पात को बाहरी हवा से अलग कर ऑक्साइड अशुद्धियों को बनने से रोकता है।"
      },
      {
        id: "q_9",
        competencyId: "comp_1",
        questionText: "Why is nitrogen gas flushing of the tundish slide-gate bypass line periodically required?",
        questionTextHindi: "टंडिश स्लाइड-गेट बाईपास लाइन की नाइट्रोजन गैस फ्लशिंग समय-समय पर क्यों आवश्यक है?",
        options: [
          "To freeze unwanted slag clots",
          "To purge atmospheric oxygen and prevent oxidation",
          "To measure steel density dynamically",
          "To lubricate mechanical gears"
        ],
        optionsHindi: [
          "अवांछित स्लैग के थक्के जमाने के लिए",
          "वायुमंडलीय ऑक्सीजन को बाहर निकालने और ऑक्सीकरण को रोकने के लिए",
          "स्टील घनत्व को गतिशील रूप से मापने के लिए",
          "यांत्रिक गियर को चिकना करने के लिए"
        ],
        correctAnswerIdx: 1,
        difficulty: "medium",
        questionType: "functional",
        explanation: "Inert gas pressure pushes out atmospheric oxygen, keeping chemical oxidation at zero.",
        explanationHindi: "अक्रिय गैस हवा को विस्थापित कर नोजल के आसपास जंग अथवा ऑक्सीकरण को रोकती है।"
      },
      {
        id: "q_10",
        competencyId: "comp_3",
        questionText: "What is the standard target sulfur content threshold under quality specifications for structural grade steel?",
        questionTextHindi: "संरचनात्मक ग्रेड स्टील के लिए गुणवत्ता विनिर्देशों के तहत मानक लक्षित सल्फर सामग्री सीमा क्या है?",
        options: ["Below 0.015%", "Exactly 1.200%", "Around 5.500%", "Varies randomly from shift to shift"],
        optionsHindi: ["0.015% से नीचे", "ठीक 1.200%", "लगभग 5.500%", "शिफ्ट दर शिफ्ट बेतरतीब ढंग से भिन्न होती है"],
        correctAnswerIdx: 0,
        difficulty: "hard",
        questionType: "functional",
        explanation: "Upholding sulfur below 0.015% avoids solidification cracking and hot shortness.",
        explanationHindi: "सल्फर को 0.015% से नीचे रखने से इस्पात की गर्म अवस्था में टूटने की संवेदनशीलता कम होती है।"
      },

      // === 💻 DIGITAL LITERACY QUESTIONS (5 Questions: q_11 to q_15) ===
      {
        id: "q_11",
        competencyId: "comp_5",
        questionText: "In a SCADA control interface, what action represents safe handling of a false temperature alarm sensor error?",
        questionTextHindi: "स्काडा (SCADA) नियंत्रण इंटरफेस में, झूठी तापमान अलार्म सेंसर त्रुटि को सुरक्षित रूप से संभालने की कार्रवाई क्या है?",
        options: [
          "Delete the diagnostic logs",
          "Acknowledge/mute the siren and flag the channel for maintenance",
          "Force-close the main operating system window",
          "Disconnect high-voltage generator mains"
        ],
        optionsHindi: [
          "नैदानिक ​​​​लॉग हटाएं",
          "सायरन को स्वीकार/म्यूट करें और रखरखाव के लिए चैनल को चिह्नित करें",
          "मुख्य ऑपरेटिंग सिस्टम विंडो को जबरन बंद करें",
          "हाई-वोल्टेज जनरेटर मेन्स को डिस्कनेक्ट करें"
        ],
        correctAnswerIdx: 1,
        difficulty: "easy",
        questionType: "digital_literacy",
        explanation: "Acknowledge the alert so the dashboard remains active, then mark the channel for sensor replacement.",
        explanationHindi: "अलार्म स्वीकार करने के बाद अलार्म म्यूट होता है पर सुरक्षा बनी रहती है, फिर चैनल को जांच के लिए भेजें।"
      },
      {
        id: "q_12",
        competencyId: "comp_5",
        questionText: "What does a red flashing indicator next to 'PLC Sync' in the Level-2 control console signify?",
        questionTextHindi: "लेवल-2 नियंत्रण कंसोल में 'PLC Sync' के बगल में लाल चमकता हुआ संकेतक क्या दर्शाता है?",
        options: [
          "Internet browsing is disabled",
          "Communication link loop disconnect between SCADA server and PLC",
          "Operating room temperature too low",
          "Caster speed has surpassed normal parameters"
        ],
        optionsHindi: [
          "इंटरनेट ब्राउज़िंग अक्षम है",
          "स्काडा सर्वर और पीएलसी के बीच संचार लूप डिस्कनेक्ट",
          "ऑपरेटिंग रूम का तापमान बहुत कम है",
          "कास्टर की गति सामान्य मापदंडों से अधिक हो गई है"
        ],
        correctAnswerIdx: 1,
        difficulty: "medium",
        questionType: "digital_literacy",
        explanation: "A red flashing sync flag denotes immediate telemetry data loss between the master server and automated controller.",
        explanationHindi: "यह दर्शाता है कि सर्वर और पीएलसी हार्डवेयर के बीच डेटा प्रेषण तात्कालिक रूप से रुक गया है।"
      },
      {
        id: "q_13",
        competencyId: "comp_5",
        questionText: "How can an operator export the thermocouple historic heat log charts securely from the Sarathi IoT monitor?",
        questionTextHindi: "एक ऑपरेटर सारथी IoT मॉनिटर से थर्मोकपल ऐतिहासिक हीट लॉग चार्ट को सुरक्षित रूप से कैसे निर्यात कर सकता है?",
        options: [
          "Log in with auth token and export securely via central dashboard telemetry export",
          "Take a hand-written photo using unauthorized personal device",
          "Email the raw root server script files home",
          "Write numbers down on scrap cardboard sheets"
        ],
        optionsHindi: [
          "प्रमाणन टोकन के साथ लॉग इन करें और केंद्रीय डैशबोर्ड टेलीमेट्री निर्यात के माध्यम से सुरक्षित रूप से निर्यात करें",
          "अनधिकृत व्यक्तिगत उपकरण का उपयोग करके हस्तलिखित फोटो लें",
          "कच्ची रूट सर्वर स्क्रिप्ट फ़ाइलों को ईमेल करें",
          "रद्दी कार्डबोर्ड शीट पर नंबर लिखें"
        ],
        correctAnswerIdx: 0,
        difficulty: "easy",
        questionType: "digital_literacy",
        explanation: "Standard secure exports must utilize authenticated tokens via official dashboards.",
        explanationHindi: "डेटा को हमेशा मुख्य सुरक्षित पैनल के माध्यम से प्रमाणित टोकन का उपयोग करके निर्यात करना चाहिए।"
      },
      {
        id: "q_14",
        competencyId: "comp_5",
        questionText: "When using the AI-powered digital copilot for querying plant safety regulations (HAZOP manuals), how is a more accurate answer obtained?",
        questionTextHindi: "प्लांट सुरक्षा नियमों (HAZOP मैनुअल) की पूछताछ के लिए एआई-संचालित डिजिटल सह-पायलट का उपयोग करते समय, अधिक सटीक उत्तर कैसे प्राप्त किया जाता है?",
        options: [
          "Repeatedly press submit button",
          "Provide exact context keywords such as standard codes, section headers, and error codes",
          "Write arbitrary sentences in slang",
          "Skip prompt writing entirely"
        ],
        optionsHindi: [
          "बार-बार सबमिट बटन दबाएं",
          "सटीक संदर्भ कीवर्ड प्रदान करें जैसे कि मानक कोड, अनुभाग हेडर और त्रुटि कोड",
          "अनौपचारिक भाषा में मनमाने वाक्य लिखें",
          "प्रॉम्प्ट लिखना पूरी तरह से छोड़ दें"
        ],
        correctAnswerIdx: 1,
        difficulty: "easy",
        questionType: "digital_literacy",
        explanation: "AI models retrieve relevant context using specific search tokens, standard codes and exact references.",
        explanationHindi: "विशिष्ट टेक्निकल कोड और सेक्शन हेडर प्रदान करने से एआई सटीक समाधान खोज पाता है।"
      },
      {
        id: "q_15",
        competencyId: "comp_5",
        questionText: "Why is modifying PLC interlocking parameters strictly forbidden for non-certified floor personnel?",
        questionTextHindi: "गैर-प्रमाणित कर्मचारियों के लिए PLC इंटरलॉकिंग मापदंडों को संशोधित करना सख्त वर्जित क्यों है?",
        options: [
          "Because it halts the admin email server",
          "Because it risks bypass of automated mechanical safety barriers, causing catastrophic accidents",
          "Because it alters the monitor display color layouts",
          "Because it changes the system local clock time"
        ],
        optionsHindi: [
          "क्योंकि यह एडमिन ईमेल सर्वर को रोकता है",
          "क्योंकि इससे स्वचालित यांत्रिक सुरक्षा बाधाएं बायपास हो सकती हैं, जिससे विनाशकारी दुर्घटनाएं हो सकती हैं",
          "क्योंकि यह मॉनिटर डिस्प्ले कलर लेआउट को बदलता है",
          "क्योंकि यह सिस्टम के स्थानीय घड़ी के समय को बदलता है"
        ],
        correctAnswerIdx: 1,
        difficulty: "hard",
        questionType: "digital_literacy",
        explanation: "Interlock systems govern core physical thresholds. Decoupling them can easily lead to fatal explosions or metallic breakouts.",
        explanationHindi: "इंटरलोक बायपास करने से मशीनी सुरक्षा कवच स्वतः हट जाते हैं जो गंभीर दुर्घटना का कारण बन सकते हैं।"
      },

      // === 🧠 SCENARIO BASED QUESTIONS (5 Questions: q_16 to q_20) ===
      {
        id: "q_16",
        competencyId: "comp_1",
        questionText: "Carbon Monoxide sensors at the continuous casting stage monitor reads 120 ppm. A maintenance operator has slipped inside the zone nearby. What is the correct priority sequence?",
        questionTextHindi: "निरंतर कास्टिंग स्टेज मॉनिटर पर कार्बन मोनोऑक्साइड सेंसर 120 ppm दिखाता है। एक रखरखाव ऑपरेटर पास के क्षेत्र में फिसलकर गिर गया है। सही प्राथमिकता अनुक्रम क्या है?",
        options: [
          "Trigger sirens, activate localized evac, wear oxygen masks, retrieve operator immediately",
          "Wait to see if CO levels drop naturally in 15 minutes",
          "Instruct the operator to continue welding using protective glasses",
          "Reboot SCADA dashboard and mute alarm"
        ],
        optionsHindi: [
          "सायरन बजाएं, स्थानीय निकासी सक्रिय करें, ऑक्सीजन मास्क पहनें, ऑपरेटर को तुरंत बाहर निकालें",
          "यह देखने के लिए प्रतीक्षा करें कि क्या 15 मिनट में CO का स्तर स्वाभाविक रूप से घटता है",
          "ऑपरेटर को सुरक्षात्मक चश्मे का उपयोग करके वेल्डिंग जारी रखने का निर्देश दें",
          "स्काडा डैशबोर्ड को रीबूट करें और अलार्म म्यूट करें"
        ],
        correctAnswerIdx: 0,
        difficulty: "hard",
        questionType: "scenario",
        explanation: "CO levels over 100ppm demand immediate rescue with external oxygen configurations.",
        explanationHindi: "100 पीपीएम से ऊपर सीओ का स्तर अत्यधिक विषैला होता है; बिना खुद की सुरक्षा सुनिश्चित किए बिना प्रवेश न करें।"
      },
      {
        id: "q_17",
        competencyId: "comp_2",
        questionText: "While supervising mold operations, you notice a slag line thickening rapidly around the mold shroud. What is the best responsive flow?",
        questionTextHindi: "मोल्ड संचालन की निगरानी करते समय, आप मोल्ड कफन के चारों ओर स्लैग लाइन को तेजी से मोटा होते हुए देखते हैं। सबसे अच्छी प्रतिक्रिया क्या है?",
        options: [
          "Increase mold powder volume instantly without adjusting temperature",
          "Slightly reduce casting speed, alert operators, and adjust mold oscillation settings",
          "Turn off coolant liquid flows completely",
          "Leave it until standard winter system maintenance shutdown"
        ],
        optionsHindi: [
          "तापमान को समायोजित किए बिना तुरंत मोल्ड पाउडर की मात्रा बढ़ाएं",
          "कास्टिंग गति को थोड़ा कम करें, ऑपरेटरों को सचेत करें, और मोल्ड दोलन सेटिंग्स को समायोजित करें",
          "कूलेंट तरल प्रवाह को पूरी तरह बंद करें",
          "सर्दियों के सामान्य रख-रखाव शटडाउन तक इसे खाली छोड़ दें"
        ],
        correctAnswerIdx: 1,
        difficulty: "medium",
        questionType: "scenario",
        explanation: "Adjusting oscillation and slowing speed stabilizes casting surface heat variance.",
        explanationHindi: "दोलाई की आवृत्ति को नियंत्रित करने और गति धीमी करने से स्लैग परत संतुलित हो जाती है।"
      },
      {
        id: "q_18",
        competencyId: "comp_2",
        questionText: "A secondary cooling spray header undergoes physical blockage on Strand 1. What happens if the caster speed is not reduced immediately?",
        questionTextHindi: "स्ट्रैंड 1 पर एक द्वितीयक शीतलन स्प्रे हेडर भौतिक रूप से अवरुद्ध हो जाता है। यदि कास्टर की गति तुरंत कम नहीं की जाती है तो क्या होगा?",
        options: [
          "Molten steel will freeze in the tundish",
          "Severe risk of solid steel structural breakout and strand warping",
          "Slab carbon concentration increases linearly",
          "Hydraulic pressure valves will disconnect instantly"
        ],
        optionsHindi: [
          "टंडिश में पिघला हुआ स्टील जम जाएगा",
          "ठोस स्टील संरचनात्मक ब्रेकआउट और स्ट्रैंड विकृत होने का गंभीर खतरा",
          "स्लैब कार्बन सांद्रता रैखिक रूप से बढ़ती है",
          "हाइड्रोलिक दबाव वाल्व तुरंत डिस्कनेक्ट हो जाएंगे"
        ],
        correctAnswerIdx: 1,
        difficulty: "hard",
        questionType: "scenario",
        explanation: "Reduced cooling localized expansion causes thin casing shells to tear, creating critical liquid breakouts.",
        explanationHindi: "कम कूलिंग वाले हिस्से में पतली परत दबाव से फट जाती है जिससे गर्म लोहा पूरे क्षेत्र में बिखर सकता है।"
      },
      {
        id: "q_19",
        competencyId: "comp_4",
        questionText: "During ladle transfer, a minor hydraulic leak is detected in the tilt mechanism. What is the immediate responsive sequence?",
        questionTextHindi: "लैडल ट्रांसफर के दौरान, झुकाव तंत्र (tilt mechanism) में एक मामूली हाइड्रोलिक रिसाव का पता चलता है। तत्काल प्रतिक्रिया अनुक्रम क्या है?",
        options: [
          "Engage auxiliary standby hydraulic circuit, lock the tilt system manually, and initiate containment controls",
          "Mute the hydraulic warning limit sensor on SCADA",
          "Keep the ladle hanging on main crane overmold and wait for shifts transition",
          "Divert all secondary coolant water streams to hydraulic area"
        ],
        optionsHindi: [
          "सहायक स्टैंडबाय हाइड्रोलिक सर्किट संलग्न करें, झुकाव प्रणाली को मैन्युअल रूप से लॉक करें, और नियंत्रण शुरू करें",
          "स्काडा पर हाइड्रोलिक चेतावनी सीमा सेंसर को म्यूट करें",
          "लैडल को क्रेन पर लटका हुआ छोड़ दें और शिफ्ट बदलने का इंतजार करें",
          "सभी द्वितीयक शीतलन जल प्रवाहों को हाइड्रोलिक क्षेत्र में मोड़ें"
        ],
        correctAnswerIdx: 0,
        difficulty: "medium",
        questionType: "scenario",
        explanation: "Standby circuits stabilize the heavy thermal load of the ladle before active offline maintenance begins.",
        explanationHindi: "स्टैंडबाय हाइड्रोलिक सर्किट को तुरंत चालू कर लोड सुरक्षित करना ही पहली प्राथमिकता है।"
      },
      {
        id: "q_20",
        competencyId: "comp_2",
        questionText: "A sudden power flicker causes the electromagnetic casting mold stirrer to stop. How does this affect solidified slab interior grain quality?",
        questionTextHindi: "अचानक बिजली के झटके से इलेक्ट्रोमैग्नेटिक मोल्ड स्टिरर (stirrer) रुक जाता है। यह जमे हुए स्लैब की आंतरिक दानेदार गुणवत्ता को कैसे प्रभावित करता है?",
        options: [
          "Improves chemistry homogeneity and strength parameters",
          "Produces severe columnar dendrite growth with risk of internal cracking",
          "Renders the outer shell highly elastic",
          "Decreases the mold level fluctuations entirely"
        ],
        optionsHindi: [
          "रासायनिक समरूपता और शक्ति मापदंडों में सुधार करता है",
          "आंतरिक दरार के जोखिम के साथ गंभीर स्तंभ डेंड्राइट (columnar dendrite) विकास पैदा करता है",
          "बाहरी आवरण को अत्यधिक लचीला बनाता है",
          "मोल्ड स्तर के उतार-चढ़ाव को पूरी तरह से कम करता है"
        ],
        correctAnswerIdx: 1,
        difficulty: "hard",
        questionType: "scenario",
        explanation: "Electromagnetic stirring maintains non-directional equiaxed crystal growth; without it, columnar crystals dominate and cause cracking.",
        explanationHindi: "मैग्नेटिक स्टिरर के अभाव में धातु के क्रिस्टल एक ही अनचाही दिशा में असामान्य रूप से बढ़ने लगते हैं।"
      },

      // === 👑 LEADERSHIP QUESTIONS (5 Questions: q_21 to q_25) ===
      {
        id: "q_21",
        competencyId: "comp_ldr_dec",
        questionText: "A critical safety hazard warning has been bypassed by a senior shifts specialist. How should a manager or supervisor handle this violation?",
        questionTextHindi: "एक वरिष्ठ शिफ्ट विशेषज्ञ द्वारा एक महत्वपूर्ण सुरक्षा चेतावनी को बायपास कर दिया गया है। एक प्रबंधक या पर्यवेक्षक को इस उल्लंघन को कैसे संभालना चाहिए?",
        options: [
          "Ignore it since the specialist has 15+ years experience",
          "Initiate a blameless hazard de-briefing, explain critical risk to human safety, and document mandatory corrective compliance rules",
          "Suspend the specialist and notify HR without verbal communication",
          "Bypass the report and assign the safety drill to an apprentice instead"
        ],
        optionsHindi: [
          "इसे अनदेखा करें क्योंकि विशेषज्ञ के पास 15+ वर्षों का अनुभव है",
          "एक दोषमुक्त सुरक्षा डी-ब्रीफिंग शुरू करें, मानव सुरक्षा के लिए गंभीर जोखिम की व्याख्या करें, और सुधारात्मक नियम दर्ज करें",
          "बिना किसी मौखिक संचार के विशेषज्ञ को निलंबित करें और मानव संसाधन (HR) को सूचित करें",
          "रिपोर्ट को दरकिनार करें और सुरक्षा ड्रिल एक नए प्रशिक्षु को सौंपें"
        ],
        correctAnswerIdx: 1,
        difficulty: "easy",
        questionType: "leadership",
        explanation: "Constructive feedback and process analysis prevent future safety bypasses while maintaining workspace trust.",
        explanationHindi: "वरिष्ठ कर्मियों के साथ रचनात्मक चर्चा और खतरों के विश्लेषण से भविष्य के उल्लंघनों को टाला जा सकता है।"
      },
      {
        id: "q_22",
        competencyId: "comp_ldr_dec",
        questionText: "How should a shift supervisor balance high-volume production deadlines alongside critical safety rules during annual turnaround?",
        questionTextHindi: "एक शिफ्ट पर्यवेक्षक को वार्षिक बदलाव (turnaround) के दौरान महत्वपूर्ण सुरक्षा नियमों के साथ उच्च-मात्रा उत्पादन समय सीमा को कैसे संतुलित करना चाहिए?",
        options: [
          "Prioritize production deadlines, safety rules can be followed during normal schedules",
          "Uphold safety rules strictly; high-volume goals must always follow solid pre-verified safety compliance protocols",
          "Delegate safety monitoring directly to third party external hires with no plant power",
          "Implement safety protocols only if accidents are reported in adjacent zones"
        ],
        optionsHindi: [
          "उत्पादन समय सीमा को प्राथमिकता दें, सामान्य कार्यक्रम के दौरान सुरक्षा नियमों का पालन किया जा सकता है",
          "सुरक्षा नियमों का कड़ाई से पालन करें; उत्पादन उद्देश्यों को हमेशा सुरक्षा प्रोटोकॉल का पालन करना चाहिए",
          "सुरक्षा निगरानी को सीधे तीसरे पक्ष के बाहरी कर्मचारियों को सौंपें जिनके पास कोई प्लांट अधिकार नहीं है",
          "सुरक्षा प्रोटोकॉल तभी लागू करें जब आस-पास के क्षेत्रों में दुर्घटनाओं की सूचना मिले"
        ],
        correctAnswerIdx: 1,
        difficulty: "medium",
        questionType: "leadership",
        explanation: "Production volume must never compromise personnel safety boundaries.",
        explanationHindi: "सुरक्षा हमेशा उत्पादन से ऊपर रहेगी। सुरक्षित संचालन ही उत्तम परिणाम लाता है।"
      },
      {
        id: "q_23",
        competencyId: "comp_ldr_dec",
        questionText: "A junior apprentice is scared to report a minor operational error on mold oscillation controllers. What leadership environment best solves this?",
        questionTextHindi: "एक जूनियर प्रशिक्षु मोल्ड दोलन नियंत्रकों पर एक छोटी सी परिचालन त्रुटि की रिपोर्ट करने से डरता है। कौन सी नेतृत्व वातावरण इसे सबसे अच्छी तरह हल करता है?",
        options: [
          "A strict zero-tolerance penalty regime on any reporting errors",
          "An open, psychological-safety corporate culture focusing on lessons-learned diagnostics instead of individual blame",
          "Publishing names of low performers on morning shift bulletin boards",
          "Ignoring minor errors and manually fixing logs later"
        ],
        optionsHindi: [
          "किसी भी रिपोर्टिंग त्रुटियों पर एक सख्त शून्य-सहनशीलता जुर्माना व्यवस्था",
          "एक खुली और मनोवैज्ञानिक रूप से सुरक्षित कॉर्पोरेट संस्कृति जो व्यक्तिगत दोष के बजाय सीखे गए पाठों पर ध्यान केंद्रित करती है",
          "सुबह के शिफ्ट बुलेटिन बोर्ड पर खराब प्रदर्शन करने वालों के नाम प्रकाशित करना",
          "छोटी गलतियों को नजरअंदाज करना और बाद में मैन्युअल रूप से लॉग ठीक करना"
        ],
        correctAnswerIdx: 1,
        difficulty: "medium",
        questionType: "leadership",
        explanation: "Psychological safety encourages proactive hazard warning, preventing subsequent catastrophes.",
        explanationHindi: "विश्वास का माहौल होने से कर्मचारी अपनी तकनीकी त्रुटियों को छिपाने के बजाय तुरंत साझा करते हैं।"
      },
      {
        id: "q_24",
        competencyId: "comp_ldr_dec",
        questionText: "An experienced operator rejects using New predictive electronic telemetry monitors. What is the most effective coaching model?",
        questionTextHindi: "एक अनुभवी ऑपरेटर नए भविष्य कहने वाले इलेक्ट्रॉनिक टेलीमेट्री मॉनिटर का उपयोग करने से इनकार करता है। सबसे प्रभावी कोचिंग मॉडल क्या है?",
        options: [
          "Threaten salary reduction for technology non-compliance",
          "Hold a hands-on pairing session, demonstrating real safety benefits and how it prevents casting breakout accidents",
          "Allow using old manual books completely, bypassing new plant standard rules",
          "Instruct other personnel to ignore the operator during shifts"
        ],
        optionsHindi: [
          "प्रौद्योगिकी गैर-अनुपालन के लिए वेतन कटौती की धमकी दें",
          "एक व्यावहारिक सह-कार्य सत्र आयोजित करें, जिसमें वास्तविक सुरक्षा लाभ प्रदर्शित हों और यह कास्टिंग ब्रेकआउट को कैसे रोकता है",
          "पूरी तरह से पुरानी नियमावली पुस्तकों के उपयोग की अनुमति दें",
          "अन्य कर्मचारियों को निर्देश दें कि वे शिफ्ट के दौरान ऑपरेटर की उपेक्षा करें"
        ],
        correctAnswerIdx: 1,
        difficulty: "easy",
        questionType: "leadership",
        explanation: "Relatable demonstrations build functional alignment, helping veterans shift easily from legacy routines.",
        explanationHindi: "व्यवहारिक रूप से सुरक्षा लाभ दिखाने से नए उपकरणों को सीखने में वरिष्ठ कर्मचारियों का हिचकिचाहट दूर होता है।"
      },
      {
        id: "q_25",
        competencyId: "comp_ldr_dec",
        questionText: "How should a plant supervisor manage conflicts between metallurgical quality control requests and high casting speeds demanded by sales teams?",
        questionTextHindi: "एक प्लांट सुपरवाइजर को धातुकर्म गुणवत्ता नियंत्रण अनुरोधों और बिक्री टीमों द्वारा मांगी गई उच्च कास्टिंग गति के बीच संघर्ष को कैसे प्रबंधित करना चाहिए?",
        options: [
          "Follow sales requests blindly; steel quality can be fixed during subsequent processes",
          "Uphold metallurgy standards; quality parameters must always be non-compromised to prevent catastrophic down-line failures and product rejection",
          "Alternate randomly between speed and quality every hour",
          "Delegate core parameter decision to manual labor personnel"
        ],
        optionsHindi: [
          "आंख मूंदकर बिक्री अनुरोधों का पालन करें; स्टील की गुणवत्ता को बाद की प्रक्रियाओं के दौरान ठीक किया जा सकता है",
          "धातुकर्म मानकों को बनाए रखें; डाउन-लाइन विफलताओं और उत्पाद अस्वीकृति को रोकने के लिए गुणवत्ता मापदंडों से कभी समझौता नहीं किया जाना चाहिए",
          "हर घंटे गति और गुणवत्ता के बीच बेतरतीब ढंग से बदलाव करें",
          "मुख्य पैरामीटर निर्णय को मैनुअल श्रम कर्मियों को सौंपें"
        ],
        correctAnswerIdx: 1,
        difficulty: "hard",
        questionType: "leadership",
        explanation: "Upholding structural quality guarantees compliance safety, preventing downstream industrial asset hazards.",
        explanationHindi: "इस्पात की संरचनात्मक गुणवत्ता ही औद्योगिक मानकों की आधारशिला है, जिससे समझौता गंभीर नुकसान दे सकता है।"
      }
    ];

    this.state = {
      users,
      competencies: comps,
      userSkills,
      assessments,
      attempts: [],
      modules,
      progress: [],
      docs,
      mentorSessions: [],
      mentorNominations: [],
      nodes,
      edges,
      roles: seedRoles,
      questions: seedQuestions
    };
    this.save();
  }

  // Password Utility (Simple HMAC SHA256)
  public hashPassword(pw: string): string {
    return crypto.createHmac("sha256", JWT_SECRET).update(pw).digest("hex");
  }

  // Getters & Mutation hooks with file persistence auto-saving
  public getUsers() { return this.state.users; }
  public addUser(user: User) {
    this.state.users.push(user);
    this.save();
    syncDoc("users", user.id, {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      jobTitle: user.jobTitle,
      department: user.department,
      profileCompleted: user.profileCompleted
    });
  }
  public saveUser(user: User) {
    const idx = this.state.users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      this.state.users[idx] = user;
      this.save();
      syncDoc("users", user.id, {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        jobTitle: user.jobTitle,
        department: user.department,
        profileCompleted: user.profileCompleted
      });
    }
  }

  public getCompetencies() { return this.state.competencies; }
  public addCompetency(comp: Competency) {
    this.state.competencies.push(comp);
    this.save();
    syncDoc("competencies", comp.id, comp);
  }

  public getUserSkills() { return this.state.userSkills; }
  public saveUserSkill(skill: UserSkill) {
    const existingIdx = this.state.userSkills.findIndex(
      s => s.userId === skill.userId && s.competencyId === skill.competencyId
    );
    if (existingIdx !== -1) {
      this.state.userSkills[existingIdx] = skill;
    } else {
      this.state.userSkills.push(skill);
    }
    this.save();
    syncDoc("user_skills", skill.id, skill);
  }

  public getAssessments() { return this.state.assessments; }
  public addAssessment(ass: Assessment) {
    this.state.assessments.push(ass);
    this.save();
    syncDoc("assessments", ass.id, {
      id: ass.id,
      title: ass.title,
      roleTarget: ass.roleTarget
    });
  }

  public getAttempts() { return this.state.attempts; }
  public addAttempt(att: AssessmentAttempt) {
    this.state.attempts.push(att);
    this.save();
    syncDoc("attempts", att.id, {
      id: att.id,
      userId: att.userId,
      assessmentId: att.assessmentId,
      score: att.score,
      completedAt: att.completedAt,
      passed: att.passed
    });
  }

  public getModules() { return this.state.modules; }
  public getProgress() { return this.state.progress; }
  public saveProgress(prog: LearningProgress) {
    const idx = this.state.progress.findIndex(p => p.userId === prog.userId && p.moduleId === prog.moduleId);
    if (idx !== -1) {
      this.state.progress[idx] = prog;
    } else {
      this.state.progress.push(prog);
    }
    this.save();
  }

  public getDocs() { return this.state.docs; }
  public saveDoc(doc: KnowledgeDoc) {
    this.state.docs.push(doc);
    // Auto-create graph node + edge
    const nodeId = `node_doc_${doc.id}`;
    this.state.nodes.push({
      id: nodeId,
      label: doc.title,
      type: "document",
      properties: { docType: doc.type }
    });
    if (doc.competencyId) {
      this.state.edges.push({
        id: `edge_doc_${doc.id}_link`,
        source: nodeId,
        target: `node_comp_${doc.competencyId.replace("comp_", "") === "1" ? "hazop" : doc.competencyId.replace("comp_", "") === "2" ? "caster" : doc.competencyId}`,
        relation: "LINKED_TO"
      });
    }
    this.save();
    syncDoc("knowledge_docs", doc.id, {
      id: doc.id,
      title: doc.title,
      type: doc.type,
      content: doc.content,
      createdBy: doc.createdBy,
      createdAt: doc.createdAt
    });
  }

  public getMentorSessions() { return this.state.mentorSessions; }
  public saveMentorSession(sess: MentorSession) {
    const idx = this.state.mentorSessions.findIndex(s => s.id === sess.id);
    if (idx !== -1) {
      this.state.mentorSessions[idx] = sess;
    } else {
      this.state.mentorSessions.push(sess);
    }
    this.save();
    syncDoc("mentor_sessions", sess.id, sess);
  }

  public getMentorNominations() { return this.state.mentorNominations; }
  public saveMentorNomination(nom: MentorNomination) {
    const idx = this.state.mentorNominations.findIndex(n => n.id === nom.id);
    if (idx !== -1) {
      this.state.mentorNominations[idx] = nom;
    } else {
      this.state.mentorNominations.push(nom);
    }
    this.save();
    syncDoc("mentor_nominations", nom.id, nom);
  }

  public getRoles() {
    return this.state.roles || [];
  }
  public addRole(role: Role) {
    if (!this.state.roles) this.state.roles = [];
    this.state.roles.push(role);
    this.save();
  }
  public saveRole(role: Role) {
    if (!this.state.roles) this.state.roles = [];
    const idx = this.state.roles.findIndex(r => r.id === role.id);
    if (idx !== -1) {
      this.state.roles[idx] = role;
    } else {
      this.state.roles.push(role);
    }
    this.save();
  }

  public getQuestions() {
    return this.state.questions || [];
  }
  public addQuestion(q: Question) {
    if (!this.state.questions) this.state.questions = [];
    this.state.questions.push(q);
    this.save();
  }
  public saveQuestion(q: Question) {
    if (!this.state.questions) this.state.questions = [];
    const idx = this.state.questions.findIndex(x => x.id === q.id);
    if (idx !== -1) {
      this.state.questions[idx] = q;
    } else {
      this.state.questions.push(q);
    }
    this.save();
  }

  public getGraphNodes() { return this.state.nodes; }
  public addGraphNode(node: GraphNode) { this.state.nodes.push(node); this.save(); }

  public getGraphEdges() { return this.state.edges; }
  public addGraphEdge(edge: GraphEdge) { this.state.edges.push(edge); this.save(); }

  public getLDMessages() {
    if (!this.state.ldMessages) this.state.ldMessages = [];
    return this.state.ldMessages;
  }
  public addLDMessage(msg: any) {
    if (!this.state.ldMessages) this.state.ldMessages = [];
    this.state.ldMessages.push(msg);
    this.save();
    syncDoc("ld_messages", msg.id, msg);
  }
  public updateLDMessage(msg: any) {
    if (!this.state.ldMessages) this.state.ldMessages = [];
    const idx = this.state.ldMessages.findIndex(m => m.id === msg.id);
    if (idx !== -1) {
      this.state.ldMessages[idx] = msg;
    } else {
      this.state.ldMessages.push(msg);
    }
    this.save();
    syncDoc("ld_messages", msg.id, msg);
  }
}

const db = new CorporateDatabase();
export default db;
