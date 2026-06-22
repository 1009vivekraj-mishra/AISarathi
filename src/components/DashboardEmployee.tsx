import React, { useState, useEffect, useRef } from "react";
import { 
  Briefcase, ShieldAlert, Brain, BookOpen, Users, Share2, 
  Award, Network, Send, Upload, Bookmark, CheckCircle2, 
  AlertTriangle, Search, Plus, ChevronRight, Info, Sparkles, 
  Clock, ArrowRight, UserCheck, Check, RotateCcw,
  Video, FileText, ExternalLink
} from "lucide-react";
import { api } from "../api.js";
import { translations } from "../translations.js";

// Force-Directed Graph Simulation in pure React state for smooth rendering of relationships
interface Node {
  id: string;
  label: string;
  type: "user" | "competency" | "document" | "mentor" | "assessment";
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  relation: string;
}

const GAP_DATA: {
  [compId: string]: {
    explanation: string;
    pdfUrl: string;
    pdfName: string;
    externalLinks: { name: string; url: string; type: string }[];
    expertSuggestion: string;
    questions: {
      id: string;
      questionText: string;
      options: string[];
      correctOptionIdx: number;
    }[];
  }
} = {
  comp_1: {
    explanation: "This critical behavioral gap means you are not fully certified under plant standard operating procedures to handle emergency gas leaks independently, check localized CO level monitors, or supervise safety evacuations. This leaves the plant at higher risk during furnace or ladle operations.",
    pdfUrl: "https://www.cdc.gov/niosh/docs/77-229/pdfs/77-229.pdf?id=10.26616/NIOSHPUB77229",
    pdfName: "NIOSH Molten Metal Industrial Health & Safety Guide.pdf",
    externalLinks: [
      { name: "OSHA Steel Industry Safety Standards", url: "https://www.osha.gov/steel-industry", type: "Standard Portal" },
      { name: "OSHA Foundry Hazards Directive Booklet", url: "https://www.osha.gov/sites/default/files/publications/osha3284.pdf", type: "Official PDF Handbook" },
      { name: "HSE Molten Slag Heat Advisory", url: "https://www.hse.gov.uk/moltenslag/", type: "Academia Portal" }
    ],
    expertSuggestion: "Expert Suggestion from Siddharth Sen (VP of Talent): 'Focus on mastering active sensor trip thresholds. Remember that CO level triggers at 100 ppm demand instant plant evac warnings. Study the upwind beacon directions carefully.'",
    questions: [
      {
        id: "saf_1",
        questionText: "At what carbon monoxide (CO) concentration level must a plant worker immediately trigger a localized evacuation protocol?",
        options: ["15 ppm", "35 ppm", "100 ppm or above", "5 ppm"],
        correctOptionIdx: 2
      },
      {
        id: "saf_2",
        questionText: "Which safety area is designated for assemblers during a toxic gas emergency at SMS-2?",
        options: ["Downwind holding area", "Upwind designated assembly beacon zone", "Inside the mechanical maintenance cabin", "The basement pump station"],
        correctOptionIdx: 1
      },
      {
        id: "saf_3",
        questionText: "What is the standard frequency of auditing localized gas detectors under OSHA guidelines?",
        options: ["Every 2 years", "Once during annual turnaround", "At the start of every single shifts segment", "Only after a system-wide failure"],
        correctOptionIdx: 2
      }
    ]
  },
  comp_2: {
    explanation: "This technical casting gap impairs your ability to manage emergency tundish shut-offs or adjust mould oscillation speeds under extreme thermal load. This causes increased probability of alloy breakouts and casting structural tears.",
    pdfUrl: "https://www.nist.gov/system/files/documents/2017/05/24/p251-2.pdf",
    pdfName: "NIST Metallurgical Structural Steel Casting Handbook.pdf",
    externalLinks: [
      { name: "Steeluniversity Continuous Casting Simulation", url: "https://steeluniversity.org/course/continuous-casting/", type: "E-Learning Simulation" },
      { name: "American Iron and Steel Institute (AISI) Portal", url: "https://www.steel.org/", type: "Industry Standard" },
      { name: "HSE UK Machinery Mould Safety Guidelines", url: "https://www.hse.gov.uk/moltenslag/", type: "Regulatory Portal" }
    ],
    expertSuggestion: "Expert Suggestion from Amitabh Banerjee (Blast Furnace Group Manager): 'Review mould heat dissipation thermocouple logs. When thermal spikes manifest, it's a mold powder dry fault and require immediate shroud alignments adjustment.'",
    questions: [
      {
        id: "cst_1",
        questionText: "What is the prime critical symptom of a mold powder failure during molten steel casting operations?",
        options: ["Slab thickness increases linearly", "Sudden thermal spikes on thermocouple sensors inside mould walls", "Slag density drops below water density", "SCADA pump temperature cools down"],
        correctOptionIdx: 1
      },
      {
        id: "cst_2",
        questionText: "What action is required if tundish nozzle shroud cracks are detected during continuous casting?",
        options: ["Increase casting mold vibration speed", "Trigger immediate gas purging flow and replace the damaged shroud", "Ignore until continuous cast is finished", "Increase nozzle immersion depth"],
        correctOptionIdx: 1
      },
      {
        id: "cst_3",
        questionText: "In continuous casting, mold level fluctuations must be constrained to what maximum range to prevent steel breakouts?",
        options: ["±20 mm", "±2 mm to ±5 mm", "±50 mm", "±100 mm"],
        correctOptionIdx: 1
      }
    ]
  },
  comp_3: {
    explanation: "This high-criticality metallurgical gap prevents you from diagnosing pearlite crystallization faults or designing stress-free cooling flow curves, which leads to internal micro-crack defects in cast slab products.",
    pdfUrl: "https://www.nist.gov/system/files/documents/2017/05/24/p251-2.pdf",
    pdfName: "NIST Mechanical Phase Crystallization Standards.pdf",
    externalLinks: [
      { name: "Steeluniversity Metallurgy Interactive Guide", url: "https://steeluniversity.org/", type: "Interactive Platform" },
      { name: "NIST Structural Steel Science Guide", url: "https://www.nist.gov/", type: "Science Library" },
      { name: "ASME Codes & Standards Metallurgy Guides", url: "https://www.asme.org/codes-standards", type: "Certification Portal" }
    ],
    expertSuggestion: "Expert Suggestion from Rajesh Kumar (Continuous Casting Specialist): 'Cooling flow parameters are delicate. Always calculate carbon equivalent ratios first before selecting the spray cooling rates, to avoid cracking.'",
    questions: [
      {
        id: "phy_1",
        questionText: "Which microstructural phase is desired for high-strength steel grades after accelerated cooling of slabs?",
        options: ["Coarse pearlite grain matrix", "Fine-grain bainite or martensite phase", "As-cast dendritic sulfur clusters", "Excess pro-eutectoid cementite networks"],
        correctOptionIdx: 1
      },
      {
        id: "phy_2",
        questionText: "How does an excessive spray cooling rate affect slab quality down-line?",
        options: ["Improves interior chemical homogeneity", "Causes surface and corner micro-cracking due to high thermal stresses", "Generates high elongation rates", "Eliminates scale entirely"],
        correctOptionIdx: 1
      },
      {
        id: "phy_3",
        questionText: "What does a high Carbon Equivalent (CE) index signify in structural steel processing?",
        options: ["Lower susceptibility to cold cracking and simpler pre-heating", "Higher risk of weld-zone cold cracking requiring controlled pre-heats", "Enhanced thermodynamic elasticity of continuous molten metal", "Absolute resistance to phase transition"],
        correctOptionIdx: 1
      }
    ]
  },
  comp_4: {
    explanation: "This preventive wear gap affects your ability to align strand roll gaps or inspect hydraulic seal nodes. Untreated friction wear issues on segments will produce slab deformation faults under casting load.",
    pdfUrl: "https://www.nist.gov/system/files/documents/2017/05/24/p251-2.pdf",
    pdfName: "Heavy Machinery Roller Wear Calibration Procedures.pdf",
    externalLinks: [
      { name: "OSHA Steel Industry Hydraulic Safety Rules", url: "https://www.osha.gov/steel-industry", type: "Regulatory Rules" },
      { name: "American Welding Society Maintenance Guidelines", url: "https://www.steel.org/", type: "Industry Code" },
      { name: "ASME Professional Engineering Maintenance Portal", url: "https://www.asme.org/codes-standards", type: "Engineering Standards" }
    ],
    expertSuggestion: "Expert Suggestion from Amitabh Banerjee (Blast Furnace Group Manager): 'Never start segment shifts without verifying the roll gap parameters with the electro-mechanical loop checker. A simple Vernier calliper is insufficient.'",
    questions: [
      {
        id: "mnt_1",
        questionText: "What tool is utilized to calibrate the caster roller segment alignment values?",
        options: ["Simple vernier callipers", "Electro-mechanical roll gap checker and laser tracker", "Regular level chalk lines", "A standard torque dial wrench"],
        correctOptionIdx: 1
      },
      {
        id: "mnt_2",
        questionText: "How should a worn or torn high-pressure hydraulic seal in segment 2 be managed?",
        options: ["Double the pressurized fluid stream", "Clean, depressurize the auxiliary line, and replace the seal nodes immediately", "Seal with high-temperature epoxy on surface", "Leave it until standard winter inspection"],
        correctOptionIdx: 1
      },
      {
        id: "mnt_3",
        questionText: "What is the typical consequence of a misalignment in the strand guiding roller segment?",
        options: ["Increased slag separation", "Bulging and non-uniform shell thickness with high internal stresses", "Decreased mold oscillation frequency", "High carbon dilution levels"],
        correctOptionIdx: 1
      }
    ]
  },
  comp_5: {
    explanation: "This SCADA automation gap indicates gaps in troubleshooting level-2 plant automation telemetry or overriding PLC interlocking triggers, adding delay when safety overrides are demanded.",
    pdfUrl: "https://www.cdc.gov/niosh/docs/77-229/pdfs/77-229.pdf?id=10.26616/NIOSHPUB77229",
    pdfName: "ANSI Standard PLC Automation Interlocking Manual.pdf",
    externalLinks: [
      { name: "OSHA Electronic Control and Automation Safety Compliance", url: "https://www.osha.gov/steel-industry", type: "Standard Portal" },
      { name: "IEEE Industrial SCADA Safety Overwrite Guides", url: "https://www.steel.org/", type: "Technical Guild" }
    ],
    expertSuggestion: "Expert Suggestion from Siddharth Sen (VP of Talent): 'If the Level 2 SCADA communication breaks, do not sit on manual. Check the local PLC panel immediately and verify that interlocks remain operational.'",
    questions: [
      {
        id: "scd_1",
        questionText: "What is the correct protocol when a 'Red Level 2 PLC Communication Loss' alarm rings?",
        options: ["Mute and wait for auto-reconnection", "Verify physically at control cabinet, switch to manual backup controls if needed", "Reboot the SCADA master console directly", "Increase casting speed to outrun system sync delay"],
        correctOptionIdx: 1
      },
      {
        id: "scd_2",
        questionText: "What does a safety interlock bypass flag on heat logs signify?",
        options: ["The system is running on green backup networks", "Core mechanical triggers are decoupled and manual overrides are active", "Thermal heat loss is reduced by 15%", "Process automation data has successfully synced"],
        correctOptionIdx: 1
      },
      {
        id: "scd_3",
        questionText: "A SCADA analog signal drift can be corrected by doing what?",
        options: ["Lowering the operator screen brightness", "Recalibrating field transceivers and trimming 4-20mA loop signals", "Increasing raw heat logs databases size", "Changing the network IP gateway address"],
        correctOptionIdx: 1
      }
    ]
  },
  comp_prc_mng: {
    explanation: "This functional planning gap impairs your ability to balance furnace hot melt delivery speeds alongside ladle chemistry timelines, which impacts the continuous cast sequence.",
    pdfUrl: "https://www.cdc.gov/niosh/docs/77-229/pdfs/77-229.pdf?id=10.26616/NIOSHPUB77229",
    pdfName: "Modern Steelwork Logistics & Material Flow Manual.pdf",
    externalLinks: [
      { name: "AISI Steel Operations Logistics Resource Library", url: "https://www.steel.org/", type: "Industry Standard" },
      { name: "Steeluniversity Molten Metallurgy Logistics Hub", url: "https://steeluniversity.org/", type: "Academic Course" }
    ],
    expertSuggestion: "Expert Suggestion from Amitabh Banerjee (Blast Furnace Group Manager): 'Flow control matches ladle timings. Check active heats status and pre-schedule emergency tapping cycles to prevent caster turnaround freeze.'",
    questions: [
      {
        id: "prc_1",
        questionText: "In steel plant flow control, what is ladle 'cold heat' and how is it resolved?",
        options: ["Ladle temperature matches ideal grade; no action", "Molten temperature is too low; dispatch to LF (Ladle Furnace) for reheating", "Cooling water spray has frozen; use blowtorches", "Slab crystallization rate is too high; slow down caster"],
        correctOptionIdx: 1
      },
      {
        id: "prc_2",
        questionText: "What is the critical objective of balancing molten logistics between blast furnace and SMS?",
        options: ["Allow ladles to cool down for easier transport", "Ensure a continuous hot-metal buffer to prevent caster turnaround delays or delays in furnace tapping", "Reduce the amount of slag generated", "Maintain high levels of carbon steel impurities"],
        correctOptionIdx: 1
      },
      {
        id: "prc_3",
        questionText: "Which flow control tool optimizes continuous caster throughput bottlenecking?",
        options: ["Dynamic ladle casting timeline buffer planning", "Reducing casting strand thickness below 50mm", "Shutting down the electromagnetic mold stirrer", "Tapping the furnace 5 times per hour"],
        correctOptionIdx: 0
      }
    ]
  }
};

interface Edge {
  id: string;
  source: string;
  target: string;
  relation: string;
}

export default function DashboardEmployee({ lang = "en", userProfile, onRefreshState }: { 
  lang?: "en" | "hi";
  userProfile: any; 
  onRefreshState: () => void; 
}) {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState("intelligence");

  // State hooks mapping to back-end endpoints
  const [myProfile, setMyProfile] = useState<any>(null);
  const [wriData, setWriData] = useState<any>(null);
  const [learningPaths, setLearningPaths] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [mentorsInfo, setMentorsInfo] = useState<any>(null);
  const [sessionLogs, setSessionLogs] = useState<any[]>([]);
  
  // Custom HawkEye & Pension Wisdom States
  const [ldInbox, setLdInbox] = useState<any[]>([]);
  const [ldInboxLoading, setLdInboxLoading] = useState(false);
  const [wisdomRequests, setWisdomRequests] = useState<any[]>([]);
  const [wisdomAnswers, setWisdomAnswers] = useState<{ [qId: string]: number }>({});
  const [wisdomSuccessMsg, setWisdomSuccessMsg] = useState("");
  const [activeWisdomQuest, setActiveWisdomQuest] = useState<any>(null);

  // Interaction/Modals state
  const [activeAssessment, setActiveAssessment] = useState<any>(null);
  const [userAnswers, setUserAnswers] = useState<{ [qId: string]: number }>({});
  const [assessmentResult, setAssessmentResult] = useState<any>(null);

  // Module checkoff assessment states
  const [activeModuleQuizAnswers, setActiveModuleQuizAnswers] = useState<{ [moduleId: string]: { [qId: string]: number } }>({});
  const [quizResults, setQuizResults] = useState<{ [moduleId: string]: any }>({});

  // Self nomination state
  const [selectedCompForNom, setSelectedCompForNom] = useState("");
  const [nomYearsExp, setNomYearsExp] = useState(2);
  const [nomSuccessMsg, setNomSuccessMsg] = useState("");

  // Mentor Session Logging
  const [logEmployeeId, setLogEmployeeId] = useState("");
  const [logCompId, setLogCompId] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [logCapture, setLogCapture] = useState("");
  const [logSuccessMsg, setLogSuccessMsg] = useState("");

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "model"; text: string; detectedLanguage?: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSources, setChatSources] = useState<{ title: string; type: string }[]>([]);
  const [aiEngine, setAiEngine] = useState<"gemini" | "groq">("groq");

  // Gap Reassessment states
  const [reassessmentCompId, setReassessmentCompId] = useState<string | null>(null);
  const [reassessmentAnswers, setReassessmentAnswers] = useState<{ [qId: string]: number }>({});
  const [reassessmentResult, setReassessmentResult] = useState<{ success: boolean; score: number; message: string } | null>(null);

  const handleReassessmentSubmit = async (compId: string, requiredLevel: number) => {
    const data = GAP_DATA[compId] || GAP_DATA["comp_1"];
    let correctCount = 0;
    data.questions.forEach((q) => {
      if (reassessmentAnswers[q.id] === q.correctOptionIdx) {
        correctCount++;
      }
    });

    const passed = correctCount === data.questions.length;
    const score = Math.round((correctCount / data.questions.length) * 100);

    if (passed) {
      try {
        await api.rateCompetency({ competencyId: compId, rating: requiredLevel });
        setReassessmentResult({
          success: true,
          score,
          message: "🎉 Outstanding! You answered all assessment questions correctly (100% accuracy). The critical safety/operational gap is now certified as CLOSED. Your competency level has been elevated, and the plant WRI rating has updated!"
        });
        // Clear cached answers
        setReassessmentAnswers({});
        // Reload all metrics & notify parent state
        loadEmployeeData();
        onRefreshState();
      } catch (err: any) {
        setReassessmentResult({
          success: false,
          score,
          message: `Passed the questionnaire, but failed to record the updated matrix on server: ${err.message || err}`
        });
      }
    } else {
      setReassessmentResult({
        success: false,
        score,
        message: `❌ Assessment Failed. You scored ${score}% (requires 100%). To protect operating safety, SMS personnel must understand all standards perfectly. Please review the official PDF guides and external standards before retrying.`
      });
    }
  };

  const loadLDInformation = async () => {
    try {
      setLdInboxLoading(true);
      const inbox = await api.getLDInbox();
      setLdInbox(inbox);
      const reqs = await api.getLDRetirementMyRequests();
      setWisdomRequests(reqs);
    } catch (e) {
      console.error("Failed loading transition/inbox prompts", e);
    } finally {
      setLdInboxLoading(false);
    }
  };

  const handleWisdomSubmit = async (assessmentId: string) => {
    try {
      await api.submitLDRetirementWisdom({
        assessmentId,
        answers: wisdomAnswers
      });
      setWisdomSuccessMsg("✓ Succession Wisdom Capsule submitted successfully! Auto-generated standard operating procedures published to RAG network.");
      setWisdomAnswers({});
      setActiveWisdomQuest(null);
      loadLDInformation();
      loadEmployeeData();
      onRefreshState();
      setTimeout(() => setWisdomSuccessMsg(""), 6000);
    } catch (err: any) {
      alert(err.message || "Failed to catalog experience wisdom.");
    }
  };

  // Search Knowledge Hub state
  const [searchQuery, setSearchQuery] = useState("");

  // Relational Graph Canvas state
  const [graphNodes, setGraphNodes] = useState<Node[]>([]);
  const [graphEdges, setGraphEdges] = useState<Edge[]>([]);
  const [selectedGraphNode, setSelectedGraphNode] = useState<any>(null);

  // Fetch all initial data
  const loadEmployeeData = async () => {
    try {
      const uProfile = await api.getUserCompetencyProfile(userProfile.id || userProfile.userId);
      setMyProfile(uProfile);

      const wData = await api.getWRI(userProfile.id || userProfile.userId);
      setWriData(wData);

      const lPaths = await api.getLearningPaths();
      setLearningPaths(lPaths);

      const assList = await api.getAssessments();
      setAssessments(assList);

      const dList = await api.getKnowledgeHub();
      setDocs(dList);

      const mRecommend = await api.getMentorRecommendations();
      setMentorsInfo(mRecommend);

      const sLogs = await api.getMentorSessions();
      setSessionLogs(sLogs);

      const gData = await api.getGraph();
      // Map dry nodes into coords
      const nodesWithCoords = gData.nodes.map((n: any, idx: number) => ({
        ...n,
        x: 150 + Math.cos((idx / gData.nodes.length) * 2 * Math.PI) * 120,
        y: 150 + Math.sin((idx / gData.nodes.length) * 2 * Math.PI) * 120,
        vx: 0,
        vy: 0
      }));
      setGraphNodes(nodesWithCoords);
      setGraphEdges(gData.edges);
    } catch (e) {
      console.error("Failed to load employee metrics:", e);
    }
  };

  useEffect(() => {
    loadEmployeeData();
    loadLDInformation();
  }, [userProfile, activeTab]);

  // Force Directed Spring Physics loop for interactive Knowledge Graph
  useEffect(() => {
    if (activeTab !== "graph" || graphNodes.length === 0) return;

    let animId: number;
    const updatePhysics = () => {
      setGraphNodes(prevNodes => {
        const nodes = prevNodes.map(n => ({ ...n }));
        const nodeMap = new Map<string, Node>(nodes.map(n => [n.id, n]));

        // Forces configurations
        const kSpring = 0.05;
        const restLength = 90;
        const repulsion = 120;

        // 1. Hooke's Spring Law along active edges
        graphEdges.forEach(edge => {
          const u = nodeMap.get(edge.source);
          const v = nodeMap.get(edge.target);
          if (u && v) {
            const dx = v.x - u.x;
            const dy = v.y - u.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = kSpring * (dist - restLength);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            u.vx += fx;
            u.vy += fy;
            v.vx -= fx;
            v.vy -= fy;
          }
        });

        // 2. Electrostatic Node-to-Node Repulsion
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const u = nodes[i];
            const v = nodes[j];
            const dx = v.x - u.x;
            const dy = v.y - u.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            if (dist < 180) {
              const force = -repulsion / (dist * dist);
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;

              u.vx += fx;
              u.vy += fy;
              v.vx -= fx;
              v.vy -= fy;
            }
          }
        }

        // 3. Apply friction and push coordinates towards center box boundary (300, 300)
        nodes.forEach(n => {
          n.vx += (150 - n.x) * 0.01; // Gravity to center
          n.vy += (150 - n.y) * 0.01;

          n.x += n.vx;
          n.y += n.vy;

          n.vx *= 0.65; // Dampening friction
          n.vy *= 0.65;

          // Prevent flying off canvas bounding box
          n.x = Math.max(20, Math.min(280, n.x));
          n.y = Math.max(20, Math.min(280, n.y));
        });

        return nodes;
      });
      animId = requestAnimationFrame(updatePhysics);
    };

    animId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animId);
  }, [activeTab, graphEdges]);

  // Skill Rating Submit Handler
  const handleRateSkill = async (compId: string, val: number) => {
    try {
      await api.rateCompetency({ competencyId: compId, rating: val });
      loadEmployeeData();
      onRefreshState();
    } catch (err) {
      alert("Failed to submit rating");
    }
  };

  // On learning path completion click
  const handleMarkModuleComplete = async (moduleId: string) => {
    try {
      const answers = activeModuleQuizAnswers[moduleId] || {};
      const res = await api.completeLearningModule(moduleId, answers);
      
      setQuizResults(prev => ({
        ...prev,
        [moduleId]: {
          success: true,
          message: res.message || "Module cleared successfully!",
          score: res.score,
          passed: true,
          penaltyApplied: res.penaltyApplied,
          skillIncrement: res.skillIncrement
        }
      }));

      // Clear answers for this successfully completed module
      setActiveModuleQuizAnswers(prev => {
        const copy = { ...prev };
        delete copy[moduleId];
        return copy;
      });

      loadEmployeeData();
      onRefreshState();
    } catch (err: any) {
      setQuizResults(prev => ({
        ...prev,
        [moduleId]: {
          success: false,
          message: err.message || "Failed to mark module completed. Ensure you scored at least 65% on the checklist validation quiz.",
          passed: false,
          score: 0
        }
      }));
    }
  };

  // Assessment answers handlers
  const handleSelectAnswer = (qId: string, idx: number) => {
    setUserAnswers(prev => ({ ...prev, [qId]: idx }));
  };

  const handleSubmitAnswers = async () => {
    if (!activeAssessment) return;
    try {
      const res = await api.submitAssessment({
        assessmentId: activeAssessment.id,
        answers: userAnswers
      });
      setAssessmentResult(res);
      loadEmployeeData();
      onRefreshState();
    } catch (err) {
      alert("Verification submission error.");
    }
  };

  // Self nomination
  const handleNominateMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompForNom) return;
    try {
      await api.nominateSelfAsMentor({
        competencies: [selectedCompForNom],
        yearsExp: nomYearsExp
      });
      setNomSuccessMsg("Successfully submitted. Manager will review L&D eligibility.");
      setTimeout(() => setNomSuccessMsg(""), 5000);
    } catch (err) {
      alert("Failed self nomination submission.");
    }
  };

  // Log Mentor Session
  const handleLogSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logEmployeeId || !logCompId || !logNotes) return;
    try {
      await api.logMentorSession({
        employeeId: logEmployeeId,
        competencyId: logCompId,
        sessionNotes: logNotes,
        capturedKnowledge: logCapture
      });
      setLogSuccessMsg("Session logged. Any high-value captured tips have been published to the Knowledge Hub!");
      setLogNotes("");
      setLogCapture("");
      setTimeout(() => setLogSuccessMsg(""), 6000);
      loadEmployeeData();
    } catch (err) {
      alert("Failed to save mentoring log");
    }
  };

  // AI Chat dialog submission
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setChatLoading(true);

    // Update frontend array
    setChatMessages(prev => [...prev, { role: "user", text: userMsg }]);

    try {
      const res = await api.askAITrainer(userMsg, chatMessages.map(m => ({ role: m.role, text: m.text })), aiEngine);
      setChatMessages(prev => [...prev, { role: "model", text: res.answer, detectedLanguage: res.detectedLanguage }]);
      setChatSources(res.retrievedContext || []);
      loadEmployeeData(); // Refresh auto generated logs!
    } catch (err) {
      setChatMessages(prev => [...prev, { role: "model", text: "Exception occured connecting to trainer engine. Locally loaded safety instructions are operational." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const getCriticalityBadge = (crit: string) => {
    switch (crit) {
      case "high":
        return <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-rose-950 text-rose-400 border border-rose-800 rounded">HIGH RISK</span>;
      case "medium":
        return <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-amber-950 text-amber-400 border border-amber-800 rounded">MEDIUM</span>;
      default:
        return <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-900 border border-slate-700 text-slate-400 rounded">LOW</span>;
    }
  };

  // Filter Knowledge hub SOPs
  const filteredDocs = docs.filter(doc => {
    if (!searchQuery) return true;
    const lower = searchQuery.toLowerCase();
    return doc.title.toLowerCase().includes(lower) || 
           doc.tags.some((t: string) => t.toLowerCase().includes(lower)) ||
           doc.content.toLowerCase().includes(lower);
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Visual Navigation Menu Side-Panel */}
      <div className="lg:col-span-3 bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-150">
          <div className="p-2 bg-sky-50 text-[#0284C7] rounded-md border border-sky-100">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-slate-900 text-sm">{userProfile.fullName}</h3>
            <p className="text-xs font-mono text-slate-500">{userProfile.jobTitle}</p>
            <p className="text-[10px] font-mono text-[#0284C7] mt-1 font-bold">{userProfile.department.toUpperCase()}</p>
          </div>
        </div>

        {/* Dynamic WRI Indicator Dial */}
        {wriData && (
          <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-md text-center">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Workforce Readiness Index</span>
            <div className="relative inline-flex items-center justify-center p-2 mb-2">
              <svg className="w-20 h-20">
                <circle className="text-slate-200" strokeWidth="6" stroke="currentColor" fill="transparent" r="32" cx="40" cy="40"/>
                <circle className="text-[#0284C7]" strokeWidth="6" strokeDasharray={2 * Math.PI * 32} strokeDashoffset={2 * Math.PI * 32 * (1 - wriData.wri / 100)} strokeLinecap="round" stroke="currentColor" fill="transparent" r="32" cx="40" cy="40" transform="rotate(-90 40 40)"/>
              </svg>
              <span className="absolute font-mono text-xl font-bold text-slate-800">{wriData.wri}%</span>
            </div>
            <div className="text-[10px] text-slate-500 font-sans">
              Status: <span className="font-bold text-emerald-600 font-mono">READY</span>
            </div>
          </div>
        )}

        {/* Tab Selection */}
        <div className="space-y-1">
          {[
            { id: "intelligence", label: t.tabIntel, icon: Brain },
            { id: "competencies", label: t.tabMatrix, icon: Award },
            { id: "assessments", label: t.tabTests, icon: ShieldAlert },
            { id: "paths", label: t.tabPaths, icon: BookOpen },
            { id: "trainer", label: t.tabTrainer, icon: Sparkles },
            { id: "knowledge", label: t.tabKnowledge, icon: Bookmark },
            { id: "mentors", label: t.tabMentors, icon: Users },
            { id: "graph", label: t.tabGraph, icon: Network },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-all ${
                  active 
                    ? "bg-[#0284C7] text-white font-semibold shadow-sm shadow-[#0284C7]/20" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${active ? "rotate-90" : ""}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Display Column */}
      <div className="lg:col-span-9 space-y-6">
        
        {/* TAB 1: WORKFORCE INTEL SYSTEM */}
        {activeTab === "intelligence" && wriData && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-sans font-extrabold text-slate-900 tracking-tight">{t.intelTitle}</h2>
                <p className="text-xs text-slate-500 mt-1">{t.intelDesc}</p>
              </div>
              <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 text-xs font-mono rounded">ID: {userProfile.userId || userProfile.id}</span>
            </div>

            {/* L&D HawkEye Connect Directives Panel */}
            {ldInbox && ldInbox.length > 0 && (
              <div className="bg-[#0284C7]/5 border border-[#0284C7]/20 rounded-xl p-4 space-y-3 shadow-3xs">
                <div className="flex items-center gap-2 border-b border-[#0284C7]/10 pb-2">
                  <Sparkles className="w-4 h-4 text-[#0284C7] animate-pulse" />
                  <span className="font-mono text-[10px] font-bold text-[#0284C7] uppercase tracking-wider">⚡ L&amp;D HawkEye Active Interventions</span>
                </div>
                <div className="space-y-2.5">
                  {ldInbox.map((msg: any) => (
                    <div key={msg.id} className="bg-white border border-slate-150 rounded-lg p-3 text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 uppercase font-mono text-[9px] bg-purple-50 text-purple-750 px-1.5 py-0.5 rounded border border-purple-150">
                            Directive: {msg.type}
                          </span>
                          <span className="text-[10px] text-slate-450 font-mono">From: {msg.senderName}</span>
                        </div>
                        <p className="text-slate-700 italic font-medium leading-relaxed font-sans mt-1">"{msg.message}"</p>
                      </div>

                      {msg.type === "assign" && msg.assignedModuleId && (
                        <button
                          type="button"
                          onClick={() => setActiveTab("paths")}
                          className="bg-[#0284C7] hover:bg-[#0369A1] text-white font-mono font-bold text-[10px] py-1.5 px-3 rounded cursor-pointer shrink-0 transition-colors"
                        >
                          📚 Open Training Paths &rarr;
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Elder Transition Retirement Wisdom Capture Card */}
            {wisdomRequests && wisdomRequests.length > 0 && (
              <div className="bg-purple-50/50 border border-purple-200 rounded-xl p-6 space-y-4 shadow-3xs">
                <div className="flex items-start gap-3">
                  <div className="bg-purple-600 text-white p-2.5 text-xs rounded-lg font-bold uppercase shrink-0">
                    👴 Elder
                  </div>
                  <div className="flex-1">
                    <span className="text-[9px] font-mono bg-purple-150 text-purple-800 font-bold px-2 py-0.5 rounded border border-purple-200 uppercase">Transition Wisdom Capsule</span>
                    <h3 className="text-sm font-sans font-black text-slate-850 mt-1.5">Submit Transition Wisdom before step down</h3>
                    <p className="text-xs text-slate-650 mt-1">
                      Our L&amp;D team has assigned critical knowledge-capture validations for you. Answer as verifiably as possible. 
                      Your troubleshooting guidelines will be integrated as searchable SOP manuals.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {wisdomRequests.map((req: any) => {
                    const activeQuiz = activeWisdomQuest === req.id;
                    return (
                      <div key={req.id} className="border border-purple-150 bg-white p-4 rounded-xl space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <h4 className="font-bold text-slate-900">{req.title}</h4>
                          <button
                            type="button"
                            onClick={() => setActiveWisdomQuest(activeQuiz ? null : req.id)}
                            className="text-purple-650 hover:text-purple-800 font-bold text-[11px] font-mono cursor-pointer"
                          >
                            {activeQuiz ? "[ Collapse Assessment ]" : "[ Begin Legacy Capture Exam ]"}
                          </button>
                        </div>

                        {activeQuiz && (
                          <div className="space-y-4 pt-3 border-t border-purple-100 text-xs text-slate-705">
                            {req.questions.map((q: any, qIdx: number) => (
                              <div key={qIdx} className="space-y-2.5">
                                <p className="font-semibold text-slate-850 font-sans">{qIdx + 1}. {q.questionText}</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {q.options.map((opt: string, optIdx: number) => {
                                    const selected = wisdomAnswers[qIdx] === optIdx;
                                    return (
                                      <button
                                        type="button"
                                        key={optIdx}
                                        onClick={() => {
                                          setWisdomAnswers(prev => ({
                                            ...prev,
                                            [qIdx]: optIdx
                                          }));
                                        }}
                                        className={`p-2.5 text-left rounded border transition-all cursor-pointer ${
                                          selected
                                            ? "bg-purple-50 border-purple-400 text-purple-705 font-bold"
                                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                                        }`}
                                      >
                                        <span className="font-mono text-[10px] mr-1.5">[{String.fromCharCode(65 + optIdx)}]</span> {opt}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}

                            {wisdomSuccessMsg && (
                              <p className="text-[11px] text-emerald-600 font-sans font-semibold text-center bg-emerald-50 border border-emerald-150 p-2 rounded">{wisdomSuccessMsg}</p>
                            )}

                            <div className="flex justify-end pt-2">
                              <button
                                type="button"
                                onClick={() => handleWisdomSubmit(req.id)}
                                className="bg-purple-600 hover:bg-purple-550 text-white font-mono font-bold text-xs py-2 px-5 rounded uppercase tracking-wider cursor-pointer shadow-xs"
                              >
                                Submit Wisdom to SOP Pipeline &rarr;
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* WRI Multi-gauge Block */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-md">
                <p className="text-[10px] font-mono text-slate-500 uppercase">Core Competency Met Rate</p>
                <p className="text-3xl font-mono font-bold text-[#0284C7] mt-1">{wriData.factors.competencyCoverage}%</p>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="bg-[#0284C7] h-full rounded-full" style={{ width: `${wriData.factors.competencyCoverage}%` }}></div>
                </div>
                <span className="text-[10px] text-slate-400 mt-2 block">Weighted contribution: 50%</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-md">
                <p className="text-[10px] font-mono text-slate-500 uppercase">Certification Pass Multipliers</p>
                <p className="text-3xl font-mono font-bold text-purple-600 mt-1">{wriData.factors.assessmentSuccess}%</p>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="bg-purple-600 h-full rounded-full" style={{ width: `${wriData.factors.assessmentSuccess}%` }}></div>
                </div>
                <span className="text-[10px] text-slate-400 mt-2 block">Weighted contribution: 30%</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-md">
                <p className="text-[10px] font-mono text-slate-500 uppercase">Interactive Training Checkoff</p>
                <p className="text-3xl font-mono font-bold text-emerald-600 mt-1">{wriData.factors.learningProgress}%</p>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${wriData.factors.learningProgress}%` }}></div>
                </div>
                <span className="text-[10px] text-slate-400 mt-2 block">Weighted contribution: 20%</span>
              </div>
            </div>

            {/* Historical Trend Vector */}
            <div className="bg-slate-50 text-slate-800 p-4 border border-slate-200 rounded-md shadow-sm">
              <h4 className="text-sm font-sans font-bold text-slate-800 mb-4">Historical Progression Curve (WRI Score Index)</h4>
              <div className="flex h-32 items-end gap-6 justify-around border-b border-l border-slate-200 pl-4 pb-2">
                {wriData.history.map((pt: any, i: number) => (
                  <div key={i} className="flex flex-col items-center flex-1">
                    <div className="text-xs font-mono text-[#0284C7] mb-1 font-bold">{pt.score}%</div>
                    <div className="w-12 bg-[#0284C7]/20 border-t-2 border-[#0284C7] rounded-t animate-pulse" style={{ height: `${pt.score}%` }}></div>
                    <div className="text-[10px] font-mono text-slate-500 mt-2">{pt.month}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: COMPETENCY MANAGEMENT */}
        {activeTab === "competencies" && myProfile && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6 shadow-sm">
            <div>
              <h2 className="text-xl font-sans font-extrabold text-slate-900">{t.mySkillsTitle}</h2>
              <p className="text-xs text-slate-500 mt-1">{t.mySkillsDesc}</p>
            </div>

            <div className="space-y-4">
              {myProfile.profile.map((prof: any) => (
                <div key={prof.competency.id} className="bg-slate-50 border border-slate-200 p-4 rounded-md space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-200 text-slate-700 rounded border border-slate-300">{prof.competency.code}</span>
                        <h4 className="text-sm font-sans font-bold text-slate-900">{prof.competency.name}</h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{prof.competency.description}</p>
                    </div>
                    {getCriticalityBadge(prof.competency.criticality)}
                  </div>

                  {/* Level gauge comparisons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <div className="flex justify-between text-xs font-mono text-slate-500">
                        <span>Current Operator Level: {prof.currentLevel}/5</span>
                        <span>Required Level: {prof.requiredLevel}/5</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full mt-2 relative overflow-hidden">
                        <div className="absolute left-0 top-0 h-full bg-rose-500 rounded-full" style={{ width: `${(prof.requiredLevel / 5) * 100}%` }}></div>
                        <div className="absolute left-0 top-0 h-full bg-emerald-500 rounded-full" style={{ width: `${(prof.currentLevel / 5) * 100}%` }}></div>
                      </div>
                      {prof.gap > 0 ? (
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-mono mt-1.5 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Critical Gap discovered! Trainee requires {prof.gap} level upgrade. Recalculating KRI...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-mono mt-1.5 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Met and Certified for operations! WRI multiplier fully unlocked.</span>
                        </div>
                      )}
                    </div>

                    {/* Self rate selector */}
                    <div className="bg-slate-100 border border-slate-200 p-2.5 rounded flex flex-col justify-center">
                      <label className="text-[10px] font-mono text-slate-500 uppercase">Self-Assess Skill Rating (0 - 5 scale):</label>
                      <div className="flex items-center gap-2 mt-2">
                        {[1, 2, 3, 4, 5].map(val => (
                          <button
                            key={val}
                            onClick={() => handleRateSkill(prof.competency.id, val)}
                            className={`flex-1 font-mono text-xs font-bold py-1 px-1 rounded transition-colors ${
                              prof.currentLevel >= val 
                                ? "bg-[#0284C7] text-white hover:bg-[#0369A1]" 
                                : "bg-slate-200 hover:bg-slate-300 text-slate-600"
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ⚡ GAP DIAGNOSTIC, REFERENCES & REASSESSMENT PORTAL */}
                  {prof.gap > 0 && (() => {
                    const gapInfo = GAP_DATA[prof.competency.id] || GAP_DATA["comp_1"];
                    const isReassessing = reassessmentCompId === prof.competency.id;

                    return (
                      <div className="mt-4 border-t border-slate-200/80 pt-4 space-y-4">
                        <div className="bg-amber-50/50 border border-amber-200/80 rounded-lg p-4 space-y-3.5">
                          <div className="flex items-center gap-2 text-[#D97706] font-sans font-extrabold text-xs">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span className="uppercase tracking-wider">Gap Detected & Diagnostic Analysis</span>
                          </div>

                          <div className="text-xs text-slate-750 leading-relaxed font-sans">
                            <p className="font-semibold text-slate-900 mb-1">Impact & Explanation:</p>
                            <p className="text-slate-650">{gapInfo.explanation}</p>
                          </div>

                          {/* Ref resources row: PDF manual and real links */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                            <a
                              href={gapInfo.pdfUrl}
                              target="_blank"
                              referrerPolicy="no-referrer"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2.5 p-2 bg-rose-50 hover:bg-rose-100/80 text-rose-805 rounded-md border border-rose-200 text-xs transition-colors group font-sans"
                            >
                              <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="font-bold block truncate text-slate-900 group-hover:text-rose-900">Official PDF Guide</span>
                                <span className="text-[9px] font-mono text-rose-500 uppercase block truncate">View Standard Handbook</span>
                              </div>
                            </a>

                            {gapInfo.externalLinks.map((link, lIdx) => (
                              <a
                                key={lIdx}
                                href={link.url}
                                target="_blank"
                                referrerPolicy="no-referrer"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2.5 p-2 bg-sky-50 hover:bg-sky-100/80 text-sky-850 rounded-md border border-sky-150 text-xs transition-colors group font-sans"
                              >
                                <ExternalLink className="w-4 h-4 text-[#0284C7] shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="font-bold block truncate text-slate-900 group-hover:text-indigo-900">{link.name}</span>
                                  <span className="text-[9px] font-mono text-sky-600 uppercase block truncate">{link.type}</span>
                                </div>
                              </a>
                            ))}
                          </div>

                          {/* Expert's suggestion notes */}
                          <div className="bg-white/80 p-3 rounded-md border border-slate-150 text-xs italic text-slate-700 font-sans leading-relaxed flex items-start gap-2.5 shadow-3xs">
                            <UserCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                            <p>{gapInfo.expertSuggestion}</p>
                          </div>

                          {/* Reassessment control panel */}
                          <div className="border-t border-slate-200/60 pt-3.5 flex justify-between items-center">
                            <p className="text-[10px] text-slate-500 font-mono">Status: <span className="font-bold text-amber-600 uppercase tracking-widest ">Gap Active</span></p>
                            {!isReassessing ? (
                              <button
                                onClick={() => {
                                  setReassessmentCompId(prof.competency.id);
                                  setReassessmentAnswers({});
                                  setReassessmentResult(null);
                                }}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold font-sans text-xs rounded shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                              >
                                <span>Conduct Gap Reassessment</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setReassessmentCompId(null);
                                  setReassessmentResult(null);
                                }}
                                className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 border border-slate-200 text-xs font-semibold rounded"
                              >
                                Close Quiz Form
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Inline Expandable Reassessment Quiz */}
                        {isReassessing && (
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4 animate-fadeIn">
                            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                              <div className="flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-[#0284C7]" />
                                <span className="font-sans font-extrabold text-slate-900 text-xs uppercase tracking-wider">Trainee Verification Questionnaire</span>
                              </div>
                              <span className="text-[9px] font-mono uppercase bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">Requires 100% Correct</span>
                            </div>

                            <div className="space-y-4">
                              {gapInfo.questions.map((q, qIndex) => {
                                const answer = reassessmentAnswers[q.id];
                                return (
                                  <div key={q.id} className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2">
                                    <span className="text-[9px] text-[#0284C7] font-mono font-bold block uppercase tracking-wider">Question {qIndex + 1} of {gapInfo.questions.length}</span>
                                    <p className="text-xs font-sans font-bold text-slate-850 leading-relaxed">{q.questionText}</p>
                                    <div className="grid grid-cols-1 gap-1.5 pt-1">
                                      {q.options.map((opt, optIndex) => {
                                        const isSelected = answer === optIndex;
                                        return (
                                          <button
                                            key={optIndex}
                                            onClick={() => {
                                              setReassessmentAnswers(prev => ({
                                                ...prev,
                                                [q.id]: optIndex
                                              }));
                                            }}
                                            className={`text-left text-xs p-2.5 rounded-md border transition-all flex items-center justify-between cursor-pointer ${
                                              isSelected
                                                ? "bg-sky-50 border-sky-300 font-semibold text-sky-900 shadow-3xs"
                                                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-650"
                                            }`}
                                          >
                                            <span>{opt}</span>
                                            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                              isSelected ? "border-[#0284C7] bg-[#0284C7]/10" : "border-slate-300 bg-white"
                                            }`}>
                                              {isSelected && <div className="w-2 h-2 rounded-full bg-[#0284C7]" />}
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Reassessment Result Display */}
                            {reassessmentResult && (
                              <div className={`p-4 rounded-lg border text-xs font-sans space-y-1 ${
                                reassessmentResult.success
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                                  : "bg-rose-50 border-rose-250 text-rose-900"
                              }`}>
                                <div className="flex items-center gap-1.5 font-bold">
                                  {reassessmentResult.success ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                  ) : (
                                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                  )}
                                  <span>{reassessmentResult.success ? "Reassessment Succeeded!" : "Validation Check Failed"}</span>
                                </div>
                                <p className="leading-relaxed text-slate-700">{reassessmentResult.message}</p>
                              </div>
                            )}

                            {/* Submit action buttons */}
                            <div className="flex justify-end pt-1 gap-2">
                              {!reassessmentResult?.success && (
                                <button
                                  onClick={() => handleReassessmentSubmit(prof.competency.id, prof.requiredLevel)}
                                  className="px-4 py-2 hover:bg-sky-705 text-white font-bold font-sans text-xs rounded shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                                  style={{ backgroundColor: "#0284C7" }}
                                >
                                  <span>Submit Certified Answers</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: SAFETY ASSESSMENTS ENGINE */}
        {activeTab === "assessments" && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6 shadow-sm">
            <div>
              <h2 className="text-xl font-sans font-extrabold text-slate-900">{t.testsTitle}</h2>
              <p className="text-xs text-slate-500 mt-1">{t.testsDesc}</p>
            </div>

            {!activeAssessment ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assessments.map(ass => (
                  <div key={ass.id} className="bg-slate-50 border border-slate-200 p-5 rounded-md flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-sans font-bold text-slate-900">{ass.title}</h4>
                      <p className="text-xs text-slate-500 mt-2 font-mono">Roles target: {ass.roleTarget}</p>
                      <p className="text-xs text-slate-400 mt-1">{ass.questions.length} Comprehensive technical questions</p>
                    </div>
                    <button
                      onClick={() => {
                        setActiveAssessment(ass);
                        setUserAnswers({});
                        setAssessmentResult(null);
                      }}
                      className="w-full mt-4 bg-[#0284C7] hover:bg-[#0369A1] text-white py-1.5 font-sans font-bold text-xs rounded transition-colors"
                    >
                      Initialize Certification Test
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-md space-y-6">
                <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                  <h3 className="font-sans font-bold text-slate-900 text-sm">{activeAssessment.title}</h3>
                  <button 
                    onClick={() => setActiveAssessment(null)}
                    className="p-1 px-2 border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 rounded"
                  >
                    Cancel
                  </button>
                </div>

                {!assessmentResult ? (
                  <div className="space-y-6">
                    {activeAssessment.questions.map((q: any, qIdx: number) => (
                      <div key={q.id} className="space-y-2 border-b border-slate-200 pb-4">
                        <p className="text-xs font-sans text-slate-900 font-semibold">{qIdx + 1}. {q.questionText}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt: string, optIdx: number) => (
                            <button
                              key={optIdx}
                              onClick={() => handleSelectAnswer(q.id, optIdx)}
                              className={`text-left px-3 py-2 text-xs rounded border transition-colors ${
                                userAnswers[q.id] === optIdx
                                  ? "bg-sky-50 border-[#0284C7] text-[#0284C7] font-semibold"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={handleSubmitAnswers}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 font-sans font-extrabold text-xs tracking-wider rounded transition-colors uppercase"
                    >
                      Transmit Graded Answers
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-6 bg-white rounded border border-slate-200 space-y-4 shadow-sm">
                    <div className="flex justify-center">
                      {assessmentResult.passed ? (
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-200 leading-none">
                          <CheckCircle2 className="w-12 h-12" />
                        </div>
                      ) : (
                        <div className="p-3 bg-rose-50 text-rose-50 rounded-full border border-rose-200 leading-none">
                          <AlertTriangle className="w-12 h-12" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-lg font-sans font-bold text-slate-900">
                        {assessmentResult.passed ? "Certification Verification Succeeded!" : "Baseline Certification Failed"}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">Accuracy Grade scored: {assessmentResult.score}% (Passing Threshold: 70%)</p>
                    </div>

                    {assessmentResult.passed ? (
                      <p className="text-xs text-emerald-600 mt-2 font-semibold">🎉 Success! Relational Competencies have been updated automatically to matched role requirements. Check your refreshed matrix metrics.</p>
                    ) : (
                      <p className="text-xs text-rose-600 mt-2 font-semibold">🚫 Try compiling reviews inside the custom Learning Paths tab or ask the AI Trainer specifically on safety questions before re-launching tests.</p>
                    )}

                    <button
                      onClick={() => {
                        setActiveAssessment(null);
                        setAssessmentResult(null);
                      }}
                      className="mt-4 px-4 py-2 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs rounded"
                    >
                      Back to Assessments Listing
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MICRO LEARNING MODULES */}
        {activeTab === "paths" && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6 shadow-sm">
            <div>
              <h2 className="text-xl font-sans font-extrabold text-slate-900">{t.pathsTitle}</h2>
              <p className="text-xs text-slate-500 mt-1 font-sans">{t.pathsDesc}</p>
            </div>

            <div className="space-y-4">
              {learningPaths.map((item: any) => (
                <div 
                  key={item.module.id} 
                  className={`p-5 rounded-md border transition-all ${
                    item.isRecommended 
                      ? "border-amber-450 bg-amber-50/30 shadow-xs" 
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        {item.isRecommended && (
                          <span className="bg-amber-500 font-mono text-[9px] font-bold text-white px-1.5 py-0.5 rounded uppercase tracking-wider">Gap Recommended</span>
                        )}
                        <h4 className="text-sm font-sans font-bold text-slate-900">{item.module.title}</h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">Linked Competency: <span className="text-[#0284C7] font-semibold">{item.competencyName}</span></p>
                      <div className="flex items-center gap-4 text-[10px] text-slate-400 font-mono mt-1">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#0284C7]" />{item.module.estimatedMinutes} Mins</span>
                        <span className="uppercase">{item.module.difficulty} level</span>
                      </div>
                    </div>
                    {item.status === "completed" ? (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-sans font-bold bg-emerald-50 px-3 py-1 rounded border border-emerald-200">
                        <Check className="w-4 h-4 text-emerald-500" /> COMPLETED
                      </span>
                    ) : (
                      <span className="text-amber-600 bg-amber-50 px-3 py-1 border border-amber-200 rounded text-xs font-sans font-bold uppercase tracking-wider">
                        Pending Assessment
                      </span>
                    )}
                  </div>

                  {/* Syllabus Brief */}
                  <div className="mt-4 pt-3 border-t border-slate-200">
                    <span className="text-[10px] text-slate-500 font-mono block uppercase tracking-wider font-bold mb-1.5">Official SOP Syllabus & Guidelines (मानक संचालन प्रक्रिया)</span>
                    <div className="bg-white border p-3 rounded text-xs text-slate-705 font-sans whitespace-pre-line leading-relaxed border-slate-200">
                      {item.module.content}
                    </div>
                  </div>

                  {/* 💡 Easy words explanation */}
                  <div className="mt-4 p-4 rounded-lg bg-indigo-50/40 border border-indigo-100/60 space-y-3 shadow-3xs">
                    <div className="flex items-center gap-1.5 text-indigo-700 font-sans font-extrabold text-xs">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      <span>CONCEPT GUIDE: Explained in Easy Words (सरल सामान्य भाषा गाइड)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans leading-relaxed text-slate-750">
                      <div className="space-y-1 bg-white/70 p-3 rounded border border-slate-100">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold block">English Simple Terms:</span>
                        <p className="text-slate-705 leading-relaxed font-sans mt-0.5">
                          {item.module.easyExplanation || "In simple terms, this course helps you understand practical hazard protection, how process limits operate, and what immediate troubleshooting actions are needed on-site."}
                        </p>
                      </div>
                      <div className="space-y-1 bg-white/70 p-3 rounded border border-indigo-100/30">
                        <span className="text-[10px] uppercase tracking-wider text-indigo-500 font-mono font-bold block">सरल हिंदी स्पष्टीकरण:</span>
                        <p className="text-slate-800 leading-relaxed font-sans mt-0.5">
                          {item.module.easyExplanationHindi || "आसान शब्दों में कहें तो, यह कोर्स आपको प्रैक्टिकल सुरक्षा नियमों, मशीनों और उपकरणों की सीमा और आपातकालीन स्थिति में तुरंत की जाने वाली जरूरी कार्रवाई समझाता है।"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Shared Real Curated Resources */}
                  {item.module.resources && item.module.resources.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <span className="text-[10px] text-slate-500 font-mono block uppercase tracking-wider font-bold mb-2.5">
                        📚 Real Study Resources & Reference Links:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {item.module.resources.map((res: any, idx: number) => {
                          const isVideo = res.url.includes("youtube.com") || res.url.includes("youtu.be") || res.name.toLowerCase().includes("video");
                          const isPdf = res.url.includes(".pdf") || res.name.toLowerCase().includes("pdf") || res.name.toLowerCase().includes("manual") || res.name.toLowerCase().includes("handbook");
                          
                          return (
                            <a 
                              key={idx} 
                              href={res.url} 
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-start gap-3 p-3 rounded-lg bg-white border border-slate-200 hover:border-indigo-500 hover:text-indigo-650 hover:shadow-xs transition-all text-xs group"
                            >
                              <div className={`p-2 rounded shrink-0 ${isVideo ? "bg-rose-50 text-rose-600" : isPdf ? "bg-[#0284C7]/10 text-[#0284C7]" : "bg-teal-50 text-teal-600"}`}>
                                {isVideo ? (
                                  <Video className="w-4 h-4" />
                                ) : isPdf ? (
                                  <FileText className="w-4 h-4" />
                                ) : (
                                  <ExternalLink className="w-4 h-4" />
                                )}
                              </div>
                              <div className="space-y-0.5 flex-1 min-w-0">
                                <span className="font-sans font-bold text-slate-800 block truncate group-hover:text-indigo-650">{res.name}</span>
                                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block font-bold">
                                  {isVideo ? "Video Lesson (टीचिंग वीडियो)" : isPdf ? "Official Manual (पीडीएफ गाइड)" : "Standard Portal (अकादमिक लिंक)"}
                                </span>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SOP Checklist / Validation Quiz */}
                  {item.status !== "completed" && item.questions && item.questions.length > 0 && (
                    <div className="mt-5 p-4 rounded-lg bg-orange-50/20 border border-orange-100 flex flex-col gap-4">
                      <div className="flex items-center gap-1.5 text-orange-700 font-sans font-extrabold text-xs">
                        <Brain className="w-4 h-4 text-[#D97706]" />
                        <span>SOP CLEARANCE CHECKLIST (अनिवार्य सुरक्षा प्रश्नोत्तरी जांच)</span>
                      </div>
                      
                      <p className="text-xs text-slate-500">
                        You must answer the 3 randomized validation questions below correctly (scoring at least 65%) to confirm clearance and verify actual competency understanding.
                      </p>

                      <div className="space-y-4">
                        {item.questions.map((q: any, qIdx: number) => {
                          const currentAnswer = activeModuleQuizAnswers[item.module.id]?.[q.id];

                          return (
                            <div key={q.id} className="bg-white p-3 rounded border border-slate-200">
                              <span className="text-[10px] font-mono text-[#0284C7] font-bold block mb-1">
                                QUESTION {qIdx + 1} OF {item.questions.length}
                              </span>
                              <p className="text-xs font-sans font-semibold text-slate-800">
                                {lang === "en" ? q.questionText : q.questionTextHindi}
                              </p>

                              <div className="grid grid-cols-1 gap-2 mt-3">
                                {(lang === "en" ? q.options : q.optionsHindi).map((opt: string, optIdx: number) => {
                                  const isSelected = currentAnswer === optIdx;
                                  return (
                                    <button
                                      key={optIdx}
                                      onClick={() => {
                                        setActiveModuleQuizAnswers(prev => ({
                                          ...prev,
                                          [item.module.id]: {
                                            ...(prev[item.module.id] || {}),
                                            [q.id]: optIdx
                                          }
                                        }));
                                      }}
                                      className={`text-left text-xs p-2.5 rounded border transition-all flex items-center justify-between cursor-pointer ${
                                        isSelected
                                          ? "bg-sky-50 border-sky-300 font-medium text-sky-800"
                                          : "hover:bg-slate-50 border-slate-200 text-slate-600"
                                      }`}
                                    >
                                      <span>{opt}</span>
                                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                        isSelected ? "border-[#0284C7]" : "border-slate-300"
                                      }`}>
                                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#0284C7]" />}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Quiz Verification Error / Success message */}
                      {quizResults[item.module.id] && (
                        <div className={`p-3.5 rounded border text-xs font-sans ${
                          quizResults[item.module.id].success
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : "bg-rose-50 border-rose-100 text-rose-800"
                        }`}>
                          <div className="flex items-center gap-2 font-bold mb-1">
                            {quizResults[item.module.id].success ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>Verification Succeeded! ({quizResults[item.module.id].score}%)</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-4 h-4 text-rose-600" />
                                <span>Certification Assessment Failed</span>
                              </>
                            )}
                          </div>
                          <p className="leading-relaxed">{quizResults[item.module.id].message}</p>
                          {quizResults[item.module.id].penaltyApplied && (
                            <p className="text-[10px] font-mono mt-1 opacity-80">
                              Note: {quizResults[item.module.id].penaltyApplied} (Actual gain: +{quizResults[item.module.id].skillIncrement} competency level)
                            </p>
                          )}
                        </div>
                      )}

                      {/* Submit / Verification trigger */}
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => handleMarkModuleComplete(item.module.id)}
                          className="bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold font-sans text-xs px-4 py-2 rounded shadow-xs cursor-pointer transition-all flex items-center gap-1"
                        >
                          <span>Verify Answers & Complete SOP</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: AI TRAINER (RAG SEMANTIC BOT) */}
        {activeTab === "trainer" && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6 shadow-sm">
            <div className="flex justify-between items-start">
               <div>
                 <h2 className="text-xl font-sans font-extrabold text-[#0284C7] flex items-center gap-2">
                   <Sparkles className="w-5 h-5 text-[#0284C7]" />
                   {t.trainerTitle}
                 </h2>
                 <p className="text-xs text-slate-500 mt-1">{t.trainerDesc}</p>
               </div>
              <span className="text-[9px] font-mono select-none px-2 py-0.5 rounded bg-sky-50 text-[#0284C7] border border-sky-100 uppercase tracking-widest font-bold">EN + HI + HINGLISH</span>
            </div>

            {/* Chat Box Interface */}
            <div className="bg-slate-50 border border-slate-200 rounded-md flex flex-col h-[380px]">
              {/* LLM Engine selector rail */}
              <div className="bg-white border-b border-slate-200 px-3 py-1.5 flex items-center justify-between rounded-t-md text-xs select-none">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">Engine:</span>
                  <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200/60 font-medium">
                    <button
                      type="button"
                      onClick={() => setAiEngine("gemini")}
                      className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold cursor-pointer transition-colors ${aiEngine === "gemini" ? "bg-[#0284C7] text-white" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      Gemini Flash
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiEngine("groq")}
                      className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold cursor-pointer transition-colors ${aiEngine === "groq" ? "bg-purple-600 text-white" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      Groq Llama-3
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[9px] font-mono tracking-wider font-extrabold uppercase shrink-0">
                  {aiEngine === "groq" ? (
                    <span className="text-purple-600">Active: Llama 70B</span>
                  ) : (
                    <span className="text-sky-600">Active: Gemini 3.5</span>
                  )}
                </div>
              </div>

              {/* Chat timeline logs */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col justify-center items-center text-center text-slate-500 space-y-2 p-6">
                    <Brain className="w-10 h-10 text-slate-300" />
                    <p className="text-xs">Chat interface ready. Ask me any operations safety or training queries.</p>
                    <div className="flex flex-wrap justify-center gap-2 mt-2 pt-4">
                      {["Blast furnace leak drill sequence?", "What's the preheating parameters on CCM-2?", "Tundish slider malfunction होने पर क्या करें?"].map((q, id) => (
                        <button
                          key={id}
                          onClick={() => setChatInput(q)}
                          className="px-2.5 py-1 text-[10px] bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-200 font-sans cursor-pointer"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] p-3 rounded-lg leading-relaxed shadow-xs ${
                        msg.role === "user" 
                          ? "bg-[#0284C7] text-white font-medium rounded-tr-none" 
                          : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
                      } whitespace-pre-wrap`}>
                        <div>{msg.text}</div>
                        {msg.role === "model" && msg.detectedLanguage && (
                          <div className="mt-2 pt-1 border-t border-slate-100 flex items-center gap-1.5 text-[9px] font-mono tracking-wider font-extrabold text-slate-400 uppercase select-none">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            <span>Detected: {msg.detectedLanguage === "hinglish" ? "Hinglish 🇮🇳" : msg.detectedLanguage === "hindi" ? "Hindi (हिंदी) 🇮🇳" : "English 🇬🇧"}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 text-slate-500 p-3 rounded-lg rounded-tl-none flex items-center gap-2 shadow-xs">
                      <Clock className="w-3.5 h-3.5 animate-spin text-[#0284C7]" />
                      <span>RAG engine active. Mining context vectors...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Citations Box */}
              {chatSources.length > 0 && (
                <div className="px-4 py-2 border-t border-slate-200 bg-white flex flex-wrap gap-2 items-center text-[10px]">
                  <span className="text-slate-400 font-mono font-bold">RAG Retrieval References:</span>
                  {chatSources.map((src, i) => (
                    <span key={i} className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-[#0284C7] rounded border border-slate-200">
                      <Bookmark className="w-3 h-3" /> {src.title}
                    </span>
                  ))}
                </div>
              )}

              {/* Chat Input form */}
              <form onSubmit={handleSendChatMessage} className="p-3 border-t border-slate-200 flex gap-2 bg-white rounded-b-md">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask in Hindi, English, Hingish (e.g. 'Safe CO concentrations limits क्या हैं?')"
                  className="flex-1 bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded px-3 py-2 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="submit"
                  disabled={chatLoading}
                  className="bg-[#0284C7] hover:bg-[#0369A1] disabled:opacity-50 text-white px-4 rounded flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 6: KNOWLEDGE HUB */}
        {activeTab === "knowledge" && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-sans font-extrabold text-slate-900">{t.knowledgeTitle}</h2>
                <p className="text-xs text-slate-500 mt-1">{t.knowledgeDesc}</p>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search manuals, tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 pl-9 pr-3 py-2 rounded focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="space-y-4">
              {filteredDocs.map(doc => (
                <div key={doc.id} className="bg-slate-50 border border-slate-200 p-5 rounded-md space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[9px] font-mono bg-sky-50 text-[#0284C7] rounded border border-sky-100 font-bold uppercase">{doc.type}</span>
                        <h4 className="text-sm font-sans font-bold text-slate-900">{doc.title}</h4>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">Archived: {new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-slate-700 font-sans leading-relaxed whitespace-pre-line p-3 bg-white rounded border border-slate-200">
                    {doc.content}
                  </div>

                  {doc.tags && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {doc.tags.map((tag: string, idx: number) => (
                        <span key={idx} className="px-1.5 py-0.5 text-[9px] font-mono bg-slate-200 text-slate-600 border border-slate-300 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {filteredDocs.length === 0 && (
                <p className="text-center text-xs text-slate-500 font-mono py-8">No matching documentation logs matched search query.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: MENTOR CONNECT SYSTEM */}
        {activeTab === "mentors" && mentorsInfo && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6 shadow-sm">
            <div>
              <h2 className="text-xl font-sans font-extrabold text-slate-900">{t.mentorsTitle}</h2>
              <p className="text-xs text-slate-500 mt-1">{t.mentorsDesc}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Recs panel */}
              <div className="space-y-4">
                <h3 className="font-sans font-bold text-slate-700 text-xs uppercase tracking-wider">Gap-Matched Mentors Recommendations</h3>
                {mentorsInfo.recommendations.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded text-center text-xs text-slate-500">
                    No active gap recommendations required. Keep monitoring matrix checks!
                  </div>
                ) : (
                  mentorsInfo.recommendations.map((rec: any, i: number) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 p-4 rounded-md space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-sans font-extrabold text-slate-900">{rec.mentor.fullName}</h4>
                          <span className="text-[10px] font-mono text-slate-500">{rec.mentor.jobTitle} • {rec.mentor.department}</span>
                        </div>
                        <span className="px-1.5 py-0.5 text-[9px] font-mono bg-sky-50 border border-sky-100 text-[#0284C7] rounded">EXP: {rec.mentor.expertLevel}/5</span>
                      </div>
                      <p className="text-xs text-slate-600 font-serif leading-relaxed pt-1.5 border-t border-slate-150">
                        {rec.reason} Matches competency: <span className="text-amber-600 font-bold">{rec.competency.name}</span>.
                      </p>
                    </div>
                  ))
                )}
                
                {/* Peer sessions checklist */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-md space-y-2">
                  <h4 className="text-xs font-sans font-bold text-slate-800">Recent Session Archival Log</h4>
                  <div className="space-y-2 text-[10px] max-h-36 overflow-y-auto pr-1">
                    {sessionLogs.map((log) => (
                      <div key={log.session.id} className="border-b border-slate-200 pb-2">
                        <div className="flex justify-between text-slate-600">
                          <span className="font-bold">{log.mentorName} ➔ {log.employeeName}</span>
                          <span>{new Date(log.session.scheduledAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-500 truncate mt-1">{log.session.sessionNotes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action operations forms */}
              <div className="space-y-6">
                
                {/* Nomination Form */}
                <form onSubmit={handleNominateMentor} className="bg-slate-50 border border-slate-200 p-4 rounded-md space-y-3">
                  <h4 className="text-xs font-sans font-bold text-slate-800 uppercase tracking-wide">Self-Nominate as Expert Mentor</h4>
                  <div>
                    <label className="text-[10px] text-slate-500 font-mono block">Master Skill Category:</label>
                    <select
                      value={selectedCompForNom}
                      onChange={(e) => setSelectedCompForNom(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs text-slate-700 rounded px-2.5 py-1.5 mt-1 focus:outline-none focus:border-sky-500"
                    >
                      <option value="">-- Choose Mastery Competency --</option>
                      {api.getCompetencies ? (
                        myProfile.profile.filter((p: any) => p.currentLevel >= 3).map((p: any) => (
                          <option key={p.competency.id} value={p.competency.id}>{p.competency.name} ({p.currentLevel}/5)</option>
                        ))
                      ) : null}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-mono block">Years Operations Experience:</label>
                    <input
                      type="number"
                      value={nomYearsExp}
                      onChange={(e) => setNomYearsExp(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 text-xs text-slate-700 rounded px-2.5 py-1 mt-1 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  {nomSuccessMsg && (
                    <p className="text-[11px] text-emerald-600 font-sans">{nomSuccessMsg}</p>
                  )}
                  <button
                    type="submit"
                    className="w-full bg-[#0284C7] hover:bg-[#0369A1] text-white font-sans font-bold text-xs py-1.5 rounded transition-colors cursor-pointer"
                  >
                    Transmit Nomination Form
                  </button>
                </form>

                {/* Session Logging form */}
                <form onSubmit={handleLogSession} className="bg-slate-50 border border-slate-200 p-4 rounded-md space-y-3">
                  <h4 className="text-xs font-sans font-bold text-slate-800 uppercase tracking-wide">Log Mentorship Knowledge Capture</h4>
                  <div>
                    <label className="text-[10px] text-slate-500 font-mono block">Technician Trainee Name:</label>
                    <select
                      value={logEmployeeId}
                      onChange={(e) => setLogEmployeeId(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs text-slate-700 rounded px-2 py-1.5 mt-1"
                    >
                      <option value="">-- Choose Trainee Operator --</option>
                      <option value="user_employee">Rajesh Kumar (Continuous Casting SMS-2)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-mono block">Target Competency:</label>
                    <select
                      value={logCompId}
                      onChange={(e) => setLogCompId(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs text-slate-700 rounded px-2 py-1.5 mt-1"
                    >
                      <option value="">-- Choose Competency Module --</option>
                      {api.getCompetencies ? (
                        myProfile.profile.map((p: any) => (
                          <option key={p.competency.id} value={p.competency.id}>{p.competency.name}</option>
                        ))
                      ) : null}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-mono block">Brief Session Action Log:</label>
                    <input
                      type="text"
                      placeholder="e.g. Conducted calibration audit on roller bearings"
                      value={logNotes}
                      onChange={(e) => setLogNotes(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs text-slate-700 rounded px-2 py-1 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-mono block">Captured Expert Knowledge Tips (Auto-generates SOP):</label>
                    <textarea
                      placeholder="Write exact technician tips. If notes length exceeds 10 bytes, these tips automatically write a brand new searchable manual inside the shared Knowledge Hub!"
                      value={logCapture}
                      onChange={(e) => setLogCapture(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs text-slate-700 rounded p-2 mt-1 h-14"
                    />
                  </div>
                  {logSuccessMsg && (
                    <p className="text-[11px] text-emerald-600 font-sans">{logSuccessMsg}</p>
                  )}
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold text-xs py-1.5 rounded transition-colors cursor-pointer"
                  >
                    Archive and Auto-Publish SOP
                  </button>
                </form>

              </div>

            </div>
          </div>
        )}

        {/* TAB 8: KNOWLEDGE GRAPH SYSTEM */}
        {activeTab === "graph" && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6 shadow-sm">
            <div>
              <h2 className="text-xl font-sans font-extrabold text-slate-900">{t.graphTitle}</h2>
              <p className="text-xs text-slate-500 mt-1">{t.graphDesc}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* SVG Physics Workspace */}
               <div className="md:col-span-8 bg-slate-50 border border-slate-200 rounded-md p-2 flex items-center justify-center relative overflow-hidden h-[340px]">
                <span className="absolute left-2.5 top-2.5 text-[9px] font-mono text-slate-400 uppercase tracking-wider font-extrabold">Live Spring Physics Core Active</span>
                <svg className="w-full h-full max-w-[300px] max-h-[300px]">
                  {/* Edges */}
                  {graphEdges.map((edge) => {
                    const u = graphNodes.find(n => n.id === edge.source);
                    const v = graphNodes.find(n => n.id === edge.target);
                    if (!u || !v) return null;
                    return (
                      <g key={edge.id}>
                        <line
                          x1={u.x}
                          y1={u.y}
                          x2={v.x}
                          y2={v.y}
                          stroke="#cbd5e1"
                          strokeWidth="1.5"
                          strokeDasharray="2,2"
                        />
                        {/* Edge Label tag */}
                        <text
                          x={(u.x + v.x) / 2}
                          y={(u.y + v.y) / 2 - 3}
                          fill="#0284C7"
                          fontSize="7"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {edge.relation}
                        </text>
                      </g>
                    );
                  })}

                  {/* Nodes */}
                  {graphNodes.map((node) => {
                    const isSelected = selectedGraphNode?.id === node.id;
                    let color = "#94a3b8";
                    if (node.type === "user") color = "#0284C7";
                    if (node.type === "competency") color = "#f59e0b";
                    if (node.type === "document") color = "#10b981";
                    if (node.type === "assessment") color = "#a855f7";

                    return (
                      <g 
                        key={node.id} 
                        className="cursor-pointer"
                        transform={`translate(${node.x}, ${node.y})`}
                        onClick={() => setSelectedGraphNode(node)}
                      >
                        <circle
                          r={isSelected ? "11" : "8"}
                          fill={color}
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                        {/* Truncated Label */}
                        <text
                          y="18"
                          fill="#334155"
                          fontSize="7"
                          fontFamily="sans-serif"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {node.label.split(" (")[0].substring(0, 15)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Edge/Node Inspector panel */}
              <div className="md:col-span-4 bg-slate-50 border border-slate-200 p-4 rounded-md space-y-4">
                <h4 className="text-xs font-sans font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">Target Inspector</h4>
                {selectedGraphNode ? (
                  <div className="space-y-2.5">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400">Node Type:</span>
                      <span className="px-1.5 py-0.5 text-[9px] font-mono bg-sky-50 text-[#0284C7] rounded border border-sky-100 block w-max uppercase mt-1 font-bold">{selectedGraphNode.type}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-400">Registry Label:</span>
                      <p className="text-xs font-sans text-slate-800 font-bold">{selectedGraphNode.label}</p>
                    </div>
                    {selectedGraphNode.properties && (
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block">Metadata Map:</span>
                        <div className="bg-white p-2 rounded text-[10px] font-mono text-slate-600 space-y-1 mt-1 border border-slate-200">
                          {Object.keys(selectedGraphNode.properties).map((k) => (
                            <div key={k}>{k}: <span className="text-slate-800 font-bold">{selectedGraphNode.properties[k]}</span></div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 font-mono italic leading-relaxed">Click any mathematical node directly inside the adjacent physics canvas to inspect system connections.</p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
