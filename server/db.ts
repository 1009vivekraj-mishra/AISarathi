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
  questionType: "mcq" | "scenario" | "safety" | "technical" | "digital_literacy" | "leadership";
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
  private state: DBState = {
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
    questions: []
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
      {
        id: "q_1",
        competencyId: "comp_1",
        questionText: "What Carbon Monoxide (CO) sensor concentration level requires a full workplace evacuation alarm?",
        questionTextHindi: "सुरक्षा नियमों के अनुसार कितने कार्बन मोनोऑक्साइड (CO) का स्तर होने पर पूरी निकासी की आवश्यकता होती है?",
        options: ["10 ppm", "20 ppm", "30 ppm", "50 ppm"],
        optionsHindi: ["10 पीपीएम", "20 पीपीएम", "30 पीपीएम", "50 पीपीएम"],
        correctAnswerIdx: 3,
        difficulty: "easy",
        questionType: "safety",
        explanation: "CO level exceeding 50ppm triggers evacuation state automatically.",
        explanationHindi: "50ppm से अधिक CO का स्तर होने पर तुरंत सुरक्षा अलार्म बजता है और निकासी शुरू की जाती है।"
      },
      {
        id: "q_2",
        competencyId: "comp_1",
        questionText: "Where should the plant workforce group upup during toxic gas leak sirens?",
        questionTextHindi: "गैस रिसाव के समय कर्मचारियों के लिए सुरक्षित सभा स्थल (Assembly area) कौन सा है?",
        options: [
          "Downwind of leak directions for visibility",
          "Inside low coordinate base pits",
          "Upwind near designated Wind Direction Beacons",
          "Directly under fuel tank release pathways"
        ],
        optionsHindi: [
          "बॉयलर के पास हवा के नीचे की ओर",
          "जमीनी स्तर के गड्ढों और घाटियों के अंदर",
          "हवा के ऊपर की ओर, नामित विंड बीकन के पास",
          "भारी ईंधन टैंक रिलीज मार्गों के नीचे"
        ],
        correctAnswerIdx: 2,
        difficulty: "medium",
        questionType: "scenario",
        explanation: "Assembling upwind ensures breathing clean air free of gas particles.",
        explanationHindi: "हवा की दिशा के विपरीत (ऊपर की ओर) खड़े होने से विषैली गैस सांस के साथ अंदर नहीं जाती।"
      },
      {
        id: "q_3",
        competencyId: "comp_2",
        questionText: "What is the primary operational cause of thermal shock in continuous caster refractories?",
        questionTextHindi: "कास्टिंग के समय दुर्दम्य ईंटों (refractories) में थर्मल शॉक का मुख्य कारण क्या होता है?",
        options: [
          "Ladle shroud purge flows below 5 cubic meters",
          "Insufficient preheating of the tundish setup (under 950°C)",
          "Gradual caster speed calibration over 10 minutes",
          "Extreme electromagnetic stirring frequency"
        ],
        optionsHindi: [
          "कफन शुद्धिकरण का प्रवाह 5 घन मीटर से कम होना",
          "टंडिश को पर्याप्त रूप से गर्म न करना (950°C से कम)",
          "10 मिनट में रोटर की गति को धीरे-धीरे समायोजित करना",
          "अत्यधिक इलेक्ट्रोमैग्नेटिक वेव फ्रीक्वेंसी"
        ],
        correctAnswerIdx: 1,
        difficulty: "hard",
        questionType: "technical",
        explanation: "Pouring liquid steel at 1550°C into a cold tundish leads to cracking of refractories.",
        explanationHindi: "ठंडे टंडिश में 1550°C गर्म पिघला हुआ तरल इस्पात डालने से रिफ्रेक्ट्रीज फट सकती है।"
      },
      {
        id: "q_4",
        competencyId: "comp_5",
        questionText: "In SCADA command layouts, which live warning represents a blast furnace pressure risk?",
        questionTextHindi: "स्काडा (SCADA) प्रणाली में कौन सा अलार्म भट्ठी के अधिक दबाव के खतरे को दर्शाता है?",
        options: [
          "Level-2 communication sync heartbeat timeout",
          "Automatic spray loop throttle status alert",
          "Blast furnace top gas overpressure gauge flashing Red",
          "Hydraulic sensor alignment offset gauge"
        ],
        optionsHindi: [
          "लेवल-2 संचार सिंक में आई समस्या",
          "ऑटोमैटिक स्प्रे लूप नियंत्रण में त्रुटि",
          "धमन भट्ठी में गैस का दबाव लाल सूचक पर फ्लैश होना",
          "हाइड्रोलिक सेंसर अलाइनमेंट में बदलाव"
        ],
        correctAnswerIdx: 2,
        difficulty: "easy",
        questionType: "digital_literacy",
        explanation: "A flashing red top gas gauge shows pressure limits exceeded in the blast chamber.",
        explanationHindi: "धमन भट्ठी में गैस का अत्यधिक दबाव होने पर स्काडा स्क्रीन पर रेड फ्लैश दिखाई देता है।"
      },
      {
        id: "q_5",
        competencyId: "comp_prc_mng",
        questionText: "What is the standard procedure to balance output schedules when furnace tapholes clogged?",
        questionTextHindi: "फर्नेस टैप होल बंद होने पर उत्पादन को संतुलित करने का मानक नियम क्या है?",
        options: [
          "Stop ladles flow and slow down overall furnace blown rate",
          "Increase gas purge flow up to 100 cubic meters",
          "Shift cast speed instantly to 2.5 m/min",
          "De-energize all secondary water spray tubes"
        ],
        optionsHindi: [
          "लैडल प्रवाह को रोकना और संपूर्ण फर्नेस आउटपुट को धीमा करना",
          "गैस शुद्धिकरण प्रवाह को 100 घन मीटर तक बढ़ाना",
          "कास्टिंग गति को तुरंत 2.5 मीटर/मिनट पर ले जाना",
          "सभी द्वितीयक पानी के स्प्रे ट्यूबों को बंद करना"
        ],
        correctAnswerIdx: 0,
        difficulty: "medium",
        questionType: "scenario",
        explanation: "Slowing furnace blow ensures safety from pressure buildup while clearing blockages.",
        explanationHindi: "टैप होल ब्लॉक होने पर गति कम करने से अत्यधिक दबाव का निर्माण नहीं होता।"
      },
      {
        id: "q_6",
        competencyId: "comp_ldr_dec",
        questionText: "How should a supervisor act when an operator refuses to wear protective safety masks near the tapping zone?",
        questionTextHindi: "यदि कोई कर्मचारी टैपिंग क्षेत्र के पास मास्क पहनने से मना करे, तो सुपरवाइजर को क्या करना चाहिए?",
        options: [
          "Ignore the behavior to complete production timelines on time",
          "Suspend work immediately and enforce mask compliance before re-entry",
          "Assign another teammate to do the job without mask",
          "Deduct salary without communicating safety risks"
        ],
        optionsHindi: [
          "उत्पादन समय सीमा समय पर पूरी करने के लिए इस व्यवहार को अनदेखा करें",
          "काम रोकें और नियमों का पालन कराने के बाद ही पुनः प्रवेश करने दें",
          "बिना मास्क के ही दूसरे सहयोगी को काम सौंप दें",
          "बिना समझाए केवल वेतन में कटौती कर दें"
        ],
        correctAnswerIdx: 1,
        difficulty: "easy",
        questionType: "leadership",
        explanation: "Safety is top priority; non-compliant entries in hot zones cannot be permitted under any condition.",
        explanationHindi: "सुरक्षा सर्वोपरि है; गर्म क्षेत्रों में बिना पीपीई के काम करने की बिल्कुल अनुमति नहीं दी जा सकती।"
      },
      {
        id: "q_7",
        competencyId: "comp_3",
        questionText: "Which steel phase represents high hardness but is too brittle for pipeline manufacturing?",
        questionTextHindi: "कौन सा इस्पात चरण अत्यधिक कठोरता दर्शाता है लेकिन पाइपलाइन के लिए अत्यंत नाजुक होता है?",
        options: ["Pearlite core phase", "Austenite grain bounded matrix", "Martensite structure (मार्टेंसाइट)", "Ferrite pearlite grain bound"],
        optionsHindi: ["पर्लाइट कोर चरण", "ऑस्टेनाइट दानेदार मैट्रिक्स", "मार्टेंसाइट संरचना", "फेराइट पर्लाइट"],
        correctAnswerIdx: 2,
        difficulty: "hard",
        questionType: "technical",
        explanation: "Martensite phases form during ultra-rapid cooling, leading to brittleness and pipeline cracking risks.",
        explanationHindi: "मार्टेंसाइट का निर्माण अत्यधिक तेज गति से ठंडा करने पर होता है, जिससे स्लैब भंगुर हो जाता है।"
      },
      {
        id: "q_8",
        competencyId: "comp_knw_plt",
        questionText: "Which plant section coordinates the ladle transition from Blast Furnace to Caster Moulds?",
        questionTextHindi: "ब्लास्ट फर्नेस से कास्टर मोल्ड्स तक लैडल को भेजने का समन्वय कौन सा विभाग करता है?",
        options: ["SMS Shop 2 (स्टील मेल्टिंग शॉप 2)", "Parking Zone C", "Gas Recovery Station", "Water Coolant Station"],
        optionsHindi: ["एसएमएस शॉप 2 (SMS Shop 2)", "पार्किंग ज़ोन सी", "गैस रिकवरी स्टेशन", "वाटर कूलेंट स्टेशन"],
        correctAnswerIdx: 0,
        difficulty: "easy",
        questionType: "mcq",
        explanation: "SMS (Steel Melting Shop) handles the conversion of hot iron to steel and routes the ladles through casting lines.",
        explanationHindi: "एसएमएस पिघले लोहे को स्टील में बदलने और लैडल को कास्टिंग लाइनों तक भेजने का प्रबंधन करता है।"
      },
      {
        id: "q_9",
        competencyId: "comp_prc_mng",
        questionText: "A severe nozzle clogging is detected on Strand 2 of the caster mold. What is the immediate responsive sequence to avoid a breakout?",
        questionTextHindi: "कास्टर मोल्ड के स्ट्रैंड 2 पर एक गंभीर नोजल क्लॉगिंग का पता चला है। ब्रेकआउट से बचने के लिए तत्काल प्रतिक्रिया अनुक्रम क्या है?",
        options: [
          "Instantly stop Strand 2 slider gate and adjust overall casting speed safely",
          "Increase ladle purging pressure up to max to push through",
          "Pour cold steel directly into the mold to freeze the leak",
          "Disregard alarm signal and continue runtime log"
        ],
        optionsHindi: [
          "स्ट्रैंड 2 स्लाइडर गेट को तुरंत बंद करें और कास्टिंग गति को सुरक्षित रूप से समायोजित करें",
          "पुश करने के लिए लैडल पुर्ज दबाव को अधिकतम तक बढ़ाएं",
          "रिसाव को रोकने के लिए सीधे मोल्ड में ठंडी स्टील डालें",
          "अलार्म सिग्नल को अनदेखा करें और रनटाइम लॉग जारी रखें"
        ],
        correctAnswerIdx: 0,
        difficulty: "medium",
        questionType: "scenario",
        explanation: "Stopping the affected strand's feeder slide prevents mold overflows or localized freezing.",
        explanationHindi: "प्रभावित स्ट्रैंड के फीडर स्लाइड को रोकने से मोल्ड ओवरफ्लो या स्थानीय जमने की समस्या नहीं होती।"
      },
      {
        id: "q_10",
        competencyId: "comp_1",
        questionText: "During a high-temperature ladle transfer, you observe a minor leakage emission near the mold shroud. What is the correct priority sequence?",
        questionTextHindi: "उच्च तापमान वाले लैडल ट्रांसफर के दौरान, आप मोल्ड कफन के पास थोड़ा रिसाव देखते हैं। सही प्राथमिकता अनुक्रम क्या है?",
        options: [
          "Pause flow immediately, secure safety perimeters, and notify metallurgical supervisor",
          "Keep pouring steel and increase the secondary water cooling spray to solidify it",
          "Manually tighten the shroud pins with bare hands while standing on the ladle platform",
          "Ignore it until the current batch casting is fully completed"
        ],
        optionsHindi: [
          "प्रवाह को तुरंत रोकें, सुरक्षा परिधि सुरक्षित करें, और धातुकर्म पर्यवेक्षक को सूचित करें",
          "स्टील डालना जारी रखें और इसे जमने के लिए द्वितीयक जल शीतलन स्प्रे को बढ़ाएं",
          "लैडल प्लेटफॉर्म पर खड़े होकर नंगे हाथों से मैन्युअल रूप से कफन पिन को कसें",
          "वर्तमान बैच कास्टिंग पूरी होने तक इसे अनदेखा करें"
        ],
        correctAnswerIdx: 0,
        difficulty: "hard",
        questionType: "scenario",
        explanation: "Pausing high temp steel transfer ensures safety boundary maintenance before active repairs.",
        explanationHindi: "गर्म स्टील के रिसाव के समय प्रवाह रोकने से सक्रिय मरम्मत से पूर्व गंभीर दुर्घटना को टाला जा सकता है।"
      },
      {
        id: "q_11",
        competencyId: "comp_5",
        questionText: "When the Level-2 SCADA dashboard displays a yellow 'PLC Heartbeat Missing' flag, what is the best procedural first check for an operator?",
        questionTextHindi: "जब लेवल-2 स्काडा डैशबोर्ड पीला 'पीएलसी हार्टबीट मिसिंग' ध्वज प्रदर्शित करता है, तो ऑपरेटर के लिए सबसे अच्छी प्रक्रियात्मक पहली जांच क्या है?",
        options: [
          "Verify physical Ethernet switch connectivity and check terminal cycle times",
          "Perform manual bypass shutdown of the entire water pumping station",
          "Delete the entire sensor historical database to free space on controller",
          "Re-route hot ladle flow into the secondary scrap yards"
        ],
        optionsHindi: [
          "भौतिक ईथरनेट स्विच कनेक्टिविटी सत्यापित करें और टर्मिनल चक्र समय की जांच करें",
          "संपूर्ण जल पंपिंग स्टेशन का मैन्युअल बायपास शटडाउन करें",
          "कंट्रोलर पर जगह खाली करने के लिए संपूर्ण सेंसर ऐतिहासिक डेटाबेस हटाएं",
          "द्वितीयक स्क्रैप यार्ड में गर्म लैडल प्रवाह को पुन: निर्देशित करें"
        ],
        correctAnswerIdx: 0,
        difficulty: "easy",
        questionType: "digital_literacy",
        explanation: "A yellow alarm points to communication lag or hardware link disconnects between the PLC and server.",
        explanationHindi: "पीला अलार्म पीएलसी और सर्वर के बीच संचार अंतराल या केबल डिस्कनेक्ट होने की ओर संकेत करता है।"
      },
      {
        id: "q_12",
        competencyId: "comp_5",
        questionText: "How does the IoT-driven Sarathi predictive maintenance panel alert operators of a thermal slab crack risk?",
        questionTextHindi: "IoT-संचालित सारथी भविष्य कहनेवाला रखरखाव पैनल ऑपरेटरों को थर्मल स्लैब क्रैक के जोखिम के बारे में कैसे सचेत करता है?",
        options: [
          "By analyzing real-time thermocouple variations in the secondary cooling spray zones",
          "By triggering physical alarm sirens located outside the administrative sector",
          "By shutting down the entire external high-voltage electrical grid automatically",
          "By printing a manual paper report at the central shift dispatch terminal"
        ],
        optionsHindi: [
          "द्वितीयक शीतलन स्प्रे क्षेत्रों में वास्तविक समय थर्मोकपल विविधताओं का विश्लेषण करके",
          "प्रशासनिक क्षेत्र के बाहर स्थित भौतिक अलार्म सायरन बजाकर",
          "संपूर्ण बाहरी हाई-वोल्टेज बिजली ग्रिड को स्वचालित रूप से बंद करके",
          "केंद्रीय शिफ्ट डिस्पैच टर्मिनल पर मैन्युअल पेपर रिपोर्ट प्रिंट करके"
        ],
        correctAnswerIdx: 0,
        difficulty: "medium",
        questionType: "digital_literacy",
        explanation: "The predictive model monitors temperature trends across cooling arrays to catch micro cracks in solidifying casting shells.",
        explanationHindi: "पूर्वानुमानित मॉडल स्लैब के जमने की प्रक्रिया के दौरान दरारें पकड़ने के लिए कूलिंग सरणियों में तापमान का आकलन करता है।"
      },
      {
        id: "q_13",
        competencyId: "comp_ldr_dec",
        questionText: "A project production target has fallen behind schedule. An experienced worker suggests skipping a mandatory 10-minute gas purging drill to catch up. How should a team leader respond?",
        questionTextHindi: "एक परियोजना उत्पादन लक्ष्य समय से पीछे चल रहा है। एक अनुभवी कर्मचारी समय की भरपाई के लिए एक अनिवार्य 10-मिनट गैस पर्जिंग ड्रिल को छोड़ने का सुझाव देता है। एक टीम लीडर को क्या प्रतिक्रिया देनी चाहिए?",
        options: [
          "Enforce the safety drill strictly; explain that safety targets cannot be bartered for raw production speed",
          "Allow skipping it just this once but warn them not to tell the audit team",
          "Deduct the worker's weekend appraisal shift score without warning",
          "Delegate the decision to the junior most shift apprentice to bypass accountability"
        ],
        optionsHindi: [
          "सुरक्षा ड्रिल को सख्ती से लागू करें; स्पष्ट करें कि उत्पादन गति के लिए सुरक्षा से समझौता नहीं हो सकता",
          "केवल इस बार इसे छोड़ने की अनुमति दें लेकिन उन्हें ऑडिट टीम को न बताने की चेतावनी दें",
          "बिना चेतावनी के कर्मचारी के सप्ताहांत मूल्यांकन शिफ्ट स्कोर में कटौती करें",
          "जवाबदेही से बचने के लिए निर्णय को कनिष्ठतम शिफ्ट प्रशिक्षु को सौंपें"
        ],
        correctAnswerIdx: 0,
        difficulty: "hard",
        questionType: "leadership",
        explanation: "Ethical industrial leaders uphold safety policies above all transactional schedule pressures.",
        explanationHindi: "सफल औद्योगिक नेतृत्व किसी भी दबाव में सुरक्षा मानकों से समझौता नहीं करता।"
      },
      {
        id: "q_14",
        competencyId: "comp_ldr_dec",
        questionText: "During a shift transition, a junior operator is nervous about reporting an accidental sensor drift. What leadership style encourages open incident reporting?",
        questionTextHindi: "Shift परिवर्तन के दौरान, एक जूनियर ऑपरेटर दुर्घटनावश हुए सेंसर बहाव की रिपोर्ट करने में घबरा रहा है। कौन सी नेतृत्व शैली खुली घटना रिपोर्टिंग को प्रोत्साहित करती है?",
        options: [
          "Blameless post-mortem culture; focusing on process safety improvement rather than punishment",
          "Public discipline during morning assembly to set an example",
          "Strict warnings and temporary suspension policies",
          "Ignoring small sensor drifts and writing manual values in logs"
        ],
        optionsHindi: [
          "दोषमुक्त आत्मनिरीक्षण संस्कृति; सजा के बजाय प्रक्रिया सुरक्षा सुधार पर ध्यान केंद्रित करना",
          "उदाहरण स्थापित करने के लिए सुबह की सभा के दौरान सार्वजनिक अनुशासन",
          "कड़े चेतावनी और अस्थायी निलंबन नियम",
          "छोटे सेंसर बहाव को अनदेखा करना और लॉग में मैन्युअल मान लिखना"
        ],
        correctAnswerIdx: 0,
        difficulty: "medium",
        questionType: "leadership",
        explanation: "Establishing safety trust drives open reporting, preventing fatal facility failures behind hidden errors.",
        explanationHindi: "विश्वास-आधारित वातावरण बनाने से कर्मचारी बिना डरे गलतियाँ साझा करते हैं जिससे भविष्य की बड़ी दुर्घटनाओं को रोका जा सकता है।"
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
}

const db = new CorporateDatabase();
export default db;
