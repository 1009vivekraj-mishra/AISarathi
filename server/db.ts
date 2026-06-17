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
  category: "Safety" | "Metallurgy" | "Operation" | "Maintenance" | "Digital Systems";
  requiredLevel: number; // 1 to 5 scale
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
}

export interface LearningModule {
  id: string;
  title: string;
  competencyId: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedMinutes: number;
  content: string;
  resources: { name: string; url: string }[];
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
    edges: []
  };

  constructor() {
    this.load();
  }

  private load() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const data = fs.readFileSync(DB_FILE, "utf-8");
        this.state = JSON.parse(data);
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
    // Generate Master Competencies
    const comps: Competency[] = [
      {
        id: "comp_1",
        code: "SAF-HZP",
        name: "Hazard Analysis & Safety Compliance",
        description: "Executing standard Hazard and Operability (HAZOP) assessments, handling emergencies, gas monitoring, and plant safety guidelines.",
        criticality: "high",
        category: "Safety",
        requiredLevel: 4
      },
      {
        id: "comp_2",
        code: "MET-CST",
        name: "Continuous Casting Operation",
        description: "Controlling tundish temperature, steel ladle pouring, shroud placement, and monitoring casting speeds for quality slab production.",
        criticality: "high",
        category: "Operation",
        requiredLevel: 4
      },
      {
        id: "comp_3",
        code: "MET-PHY",
        name: "Metallurgical Phase Control",
        description: "Designing cooling rate profiles, managing steel carbon equivalents, micro-alloying techniques, and diagnosing crystallization faults.",
        criticality: "high",
        category: "Metallurgy",
        requiredLevel: 3
      },
      {
        id: "comp_4",
        code: "MNT-PRV",
        name: "Preventive Mechanical Maintenance",
        description: "Precision calibration of continuous caster rollers, hydraulic seal inspections, pressure relief valve tuning, and wear analysis.",
        criticality: "medium",
        category: "Maintenance",
        requiredLevel: 4
      },
      {
        id: "comp_5",
        code: "DIG-SCD",
        name: "SCADA & Level-2 Automation Control",
        description: "Monitoring furnace heat diagrams, adjusting casting parameters from command boards, PLC interlocking, and telemetry logging.",
        criticality: "medium",
        category: "Digital Systems",
        requiredLevel: 3
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
          { name: "SOP-104: Heavy Gas Mitigation", url: "#" },
          { name: "Safety Video: Breathing System Lockin", url: "#" }
        ]
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
          { name: "Refractories Pre-heating Diagrams", url: "#" },
          { name: "SCADA Heat Log Template", url: "#" }
        ]
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
          { name: "Iron-Carbon Phase Solubility Charts", url: "#" }
        ]
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
      edges
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

  public getGraphNodes() { return this.state.nodes; }
  public addGraphNode(node: GraphNode) { this.state.nodes.push(node); this.save(); }

  public getGraphEdges() { return this.state.edges; }
  public addGraphEdge(edge: GraphEdge) { this.state.edges.push(edge); this.save(); }
}

const db = new CorporateDatabase();
export default db;
