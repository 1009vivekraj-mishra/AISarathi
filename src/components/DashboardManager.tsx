import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, Users, Award, CheckCircle2, AlertTriangle, 
  Search, ShieldCheck, FileText, ArrowRight, TrendingUp, Sparkles, HelpCircle,
  Video, ExternalLink, ChevronRight, User, GraduationCap, Briefcase, Plus, Send,
  Activity, Lock, Target, PlusCircle, Check, PlayCircle, BookOpen, Brain
} from "lucide-react";
import { api } from "../api.js";
import { translations } from "../translations.js";

export default function DashboardManager({ lang = "en", userProfile }: { 
  lang?: "en" | "hi";
  userProfile: any; 
}) {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<"myself" | "team">("team");
  const [team, setTeam] = useState<any[]>([]);
  const [competencies, setCompetencies] = useState<any[]>([]);
  const [kriData, setKriData] = useState<any>(null);
  const [nominations, setNominations] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedEmployeeProfile, setSelectedEmployeeProfile] = useState<any>(null);

  // New HawkEye intelligence & custom Learning/Assessment states for managers
  const [hawkeyeData, setHawkeyeData] = useState<any>(null);
  const [activeSubTab, setActiveSubTab] = useState<"roster" | "department" | "retirement" | "connect" | "mentors">("roster");
  const [selectedCompForMitigation, setSelectedCompForMitigation] = useState<any>(null);
  const [mitigationEmployeeId, setMitigationEmployeeId] = useState<string>("");
  const [mitigationStep, setMitigationStep] = useState<"explain" | "pdf" | "links" | "experts" | "quiz">("explain");
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [quizAnswers, setQuizAnswers] = useState<{ [key: number]: number }>({});
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean } | null>(null);

  // Connect intervention states
  const [connectSuccess, setConnectSuccess] = useState("");
  const [connectError, setConnectError] = useState("");
  const [connectTargetType, setConnectTargetType] = useState<"employee" | "team" | "department">("employee");
  const [connectTargetId, setConnectTargetId] = useState("");
  const [connectMsg, setConnectMsg] = useState("");
  const [connectType, setConnectType] = useState<"info" | "warning" | "assign">("info");
  const [connectSelectedModule, setConnectSelectedModule] = useState("");

  // Custom retirement access states
  const [retirementModalOpen, setRetirementModalOpen] = useState(false);
  const [activeRetiree, setActiveRetiree] = useState<any>(null);
  const [wisdomAssessTitle, setWisdomAssessTitle] = useState("");
  const [wisdomSuccess, setWisdomSuccess] = useState("");
  const [wisdomQuestions, setWisdomQuestions] = useState<any[]>([
    {
      questionText: "What critical blast furnace shutoff protocol must occur first during a vacuum breakdown?",
      options: [
        "Isolate ladle vacuum suction seals and engage nitrogen ballast valves",
        "Dump molten tundish stream directly into emergency pit",
        "Disengage all power to furnace cooling grid layouts",
        "Vent high-pressure steam boilers manually"
      ],
      correctAnswerIdx: 0,
      points: 25,
      competencyId: ""
    },
    {
      questionText: "When solidifying steel grades on CCM-2 casting strands, mould friction is stabilized by:",
      options: [
        "Applying active slag flux powder melts continuously",
        "Spraying raw nitrogen on secondary guide rolls",
        "Doubling electromagnetic induction amplitudes",
        "Stopping the tundish stream for 10 minutes"
      ],
      correctAnswerIdx: 0,
      points: 25,
      competencyId: ""
    }
  ]);

  // Manager's own personal stats
  const [myWri, setMyWri] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [myLearning, setMyLearning] = useState<any[]>([]);
  const [assignmentLogs, setAssignmentLogs] = useState<any[]>([]);
  const [assignmentSuccess, setAssignmentSuccess] = useState<string | null>(null);

  // States for manager's mini-assessment / quiz
  const [activeManagerQuizModuleId, setActiveManagerQuizModuleId] = useState<string | null>(null);
  const [managerQuizAnswers, setManagerQuizAnswers] = useState<{ [qId: string]: number }>({});
  const [managerQuizResults, setManagerQuizResults] = useState<{ [moduleId: string]: { success: boolean; message: string; score: number; passed: boolean } }>({});

  const loadManagerData = async () => {
    try {
      const tUsers = await api.getTeam();
      setTeam(tUsers);

      const comps = await api.getCompetencies();
      setCompetencies(comps);

      const kData = await api.getKRI();
      setKriData(kData);

      const noms = await api.getMentorNominations();
      setNominations(noms);

      const sLogs = await api.getMentorSessions();
      setSessions(sLogs);

      // Load HawkEye data for managers
      try {
        const he = await api.getLDHawkEye();
        setHawkeyeData(he);
      } catch (heErr) {
        console.warn("Could not load HawkEye details for manager (routing limitations):", heErr);
      }

      // Load manager's own report safely
      try {
        const mw = await api.getWRI();
        setMyWri(mw);
        const mp = await api.getUserCompetencyProfile();
        setMyProfile(mp);
        const ml = await api.getLearningPaths();
        setMyLearning(ml);
      } catch (err) {
        console.warn("Could not load personal report stats for manager:", err);
      }
    } catch (e) {
      console.error("Failed to load manager metrics:", e);
    }
  };

  useEffect(() => {
    loadManagerData();
  }, [userProfile]);

  const handleAssignModule = async (empId: string, employeeName: string, moduleId: string, moduleTitle: string) => {
    try {
      await api.postLDConnect({
        targetType: "employee",
        targetId: empId,
        message: `Mandatory dispatch: Please study learning module '${moduleTitle}' to address your current competency gaps under our shift group.`,
        type: "assign",
        assignedModuleId: moduleId
      });
      const newLog = {
        id: `asg_${Date.now()}`,
        employeeName,
        moduleTitle,
        assignedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setAssignmentLogs(prev => [newLog, ...prev]);
      setAssignmentSuccess(`Successfully dispatched priority assignment '${moduleTitle}' to ${employeeName}!`);
      setTimeout(() => {
        setAssignmentSuccess(null);
      }, 5000);
      loadManagerData();
    } catch (err: any) {
      alert(err.message || "Failed to dispatch priority assignment.");
    }
  };

  // Action callback for Approvals
  const handleApproveNomination = async (nomId: string, action: "approved" | "rejected") => {
    try {
      await api.actOnNomination(nomId, action);
      loadManagerData();
    } catch (e) {
      alert("Failed actioning nomination.");
    }
  };

  const inspectSkillProfile = async (empId: string) => {
    try {
      const prof = await api.getUserCompetencyProfile(empId);
      setSelectedEmployeeProfile(prof);
    } catch (e) {
      alert("Failed to load user gap profiles.");
    }
  };

  const [quizFinished, setQuizFinished] = useState(false);

  // PRE-DEFINED PROFESSIONAL 10-QUESTION REAL COMPASSES
  const TEN_QUESTIONS_MAP: { [compId: string]: { questionText: string; options: string[]; correctAnswerIdx: number; explanation: string }[] } = {
    comp_1: [
      {
        questionText: "Which gas concentration limit triggers immediate plant-wide evacuation according to standard safety guidelines?",
        options: ["10 ppm CO", "25 ppm CO", "30 ppm CO", "50 ppm CO"],
        correctAnswerIdx: 3,
        explanation: "A high toxic threshold of 50 ppm CO triggers emergency plant-wide evacuations."
      },
      {
        questionText: "What instrument is on-site to inspect safe wind directions during sudden gas leakage evacuation?",
        options: ["Barometric sensor indicator", "Wind direction beacons / windsocks", "Digital laser telemetry rods", "Lidar plume gauges"],
        correctAnswerIdx: 1,
        explanation: "Continuous viewing of windsocks ensures evacuation is upwind of the toxic gas plumes."
      },
      {
        questionText: "What is the primary positive-pressure respirator tank pressure check limit?",
        options: ["50 bar", "100 bar", "150 bar", "200 bar"],
        correctAnswerIdx: 3,
        explanation: "Standard plant safety operations require a minimum respirator tank level of 200 bar before entry."
      },
      {
        questionText: "What procedure does LOTO stand for in continuous plant maintenance?",
        options: ["Lever-Open, Tunnel-Out", "Lock-Out, Tag-Out", "Line-Organized Telemetry Operation", "Layered Oxygen Thermal-Oxidation"],
        correctAnswerIdx: 1,
        explanation: "Lock-Out Tag-Out holds physical isolation keys secure during active mechanical line repairs."
      },
      {
        questionText: "Safe 8-hour continuous workplace occupational noise limit under OSHA is:",
        options: ["70 dBA", "85 dBA", "95 dBA", "110 dBA"],
        correctAnswerIdx: 1,
        explanation: "Noise limit is strictly capped at 85 dBA, over which earmuffs or earplugs are legally mandatory."
      },
      {
        questionText: "Where are emergency safety rescue respiratory kits stored inside Zone B?",
        options: ["Zone B positive maintenance lockboxes", "Administrative main offices", "Standard parking security booths", "Main cafeteria rear cabinets"],
        correctAnswerIdx: 0,
        explanation: "Emergency box clusters in Zone B house personal air breathing systems."
      },
      {
        questionText: "In HAZOP methodology, what does the guideword 'No Flow' represent?",
        options: ["Over-speed turbine rotation", "Complete line obstruction or valve seizure", "Steam condensation inside pipelines", "Pressure transducer fault"],
        correctAnswerIdx: 1,
        explanation: "No Flow represents mechanical restriction, total valve closure, or upstream pump tripping."
      },
      {
        questionText: "According to OSHA, fall protection harness coupling is required for what elevated height?",
        options: ["0.6 meters", "1.2 meters", "1.8 meters or higher", "3.0 meters"],
        correctAnswerIdx: 2,
        explanation: "Working at heights exceeding 1.8 meters (6 feet) necessitates standard safety harness anchors."
      },
      {
        questionText: "What color coding is worldwide standard for toxic gas warning indicators?",
        options: ["Solid sky blue", "Safety bright yellow with black slashes", "Matte silver stripes", "Orange-red neon dots"],
        correctAnswerIdx: 1,
        explanation: "High-contrast hazard stripes on yellow background denote toxic gas safety corridors."
      },
      {
        questionText: "What immediate action must follow an individual CO wearable beep chirp?",
        options: ["Sit down and seek rest", "Report to downwind perimeter fences", "Immediately move to upwind beacons and alert supervisors", "Unscrew the detector battery"],
        correctAnswerIdx: 2,
        explanation: "Moving immediately upwind prevents inhalation of progressive gas clouds from leakage points."
      }
    ],
    comp_2: [
      {
        questionText: "What preheating temperature curve prevents thermal shattering inside refractories?",
        options: ["200°C for at least 12 hours", "500°C for at least 30 minutes", "1100°C for at least 90 minutes", "1500°C for 5 hours"],
        correctAnswerIdx: 2,
        explanation: "Consistent heat to 1100°C ensures no structural refractory shocks when molten steel hits."
      },
      {
        questionText: "Which flow control valve is deployed on modern continuous ladle caster gates?",
        options: ["Piston rotary bypass gate", "Sliding slider gate valve system", "Single needle pinch ball valve", "Pneumatic diaphragm cone"],
        correctAnswerIdx: 1,
        explanation: "Refractory slide gates regulate steel throughput from ladle into tundish receivers."
      },
      {
        questionText: "Why is argon gas introduced into the tundish-mold casting shroud?",
        options: ["To accelerate steel freezing rates", "To block atmospheric oxygen reactions", "To oxidize steel elements", "To balance mechanical mold vibrators"],
        correctAnswerIdx: 1,
        explanation: "Argon gas is inert and displaces atmospheric oxygen, avoiding steel oxidation defects."
      },
      {
        questionText: "What casting speed is initialized during steady state CCM-2 sequence?",
        options: ["0.2 meter/min", "0.6 meter/min", "1.2 meters/min", "2.5 meters/min"],
        correctAnswerIdx: 2,
        explanation: "Standard design parameters steady speed at 1.2 m/min for optimal slab solidifications."
      },
      {
        questionText: "Continuous mold electromagnetic stirring (EMS) serves to:",
        options: ["Increase slab core temperature", "Refine dendrite crystallization and uniformity", "Separate slag by magnetic gravity", "Accelerate emergency dump sequence"],
        correctAnswerIdx: 1,
        explanation: "EMS creates localized induction flows, refining microstructures and dendritic profiles."
      },
      {
        questionText: "Refractory nozzle choke and freeze is heavily driven by which material?",
        options: ["Silicon manganese clusters", "Dissolved carbon particles", "Insoluble alumina (Al2O3) clusters", "Liquid calcium oxides"],
        correctAnswerIdx: 2,
        explanation: "Alumina oxide inclusions deposit on nozzle orifices, reducing casting nozzle throughput."
      },
      {
        questionText: "What is the primary role of mold flux powders on cast strands?",
        options: ["To carbonize steel surfaces", "To provide lubrication, trap slags, and retain heat", "To accelerate steel heat loss", "To anchor dummy tail bars"],
        correctAnswerIdx: 1,
        explanation: "Flux powders melt to provide mechanical strand lubrication and prevent steel heat loss."
      },
      {
        questionText: "A primary mold breakout event is triggered by which failure mode?",
        options: ["Loss of mechanical dummy anchors", "Over-solidified mold skull thickness", "Rupture of thin slag shell under liquid hydraulic load", "Argon sensor failure"],
        correctAnswerIdx: 2,
        explanation: "High speed or irregular shell growth causes thin solidified steel skin to tear inside the mold."
      },
      {
        questionText: "Why is water cooling volume (L/kg) strictly monitored during strand cooling?",
        options: ["To prevent mold magnetic drift", "To avoid massive temperature shocks and slab surface microcracks", "To compress the dummy head", "To wash away slag sediments"],
        correctAnswerIdx: 1,
        explanation: "Excessive or dynamic spray causes severe thermal shrinkage stress and surface cracking."
      },
      {
        questionText: "If steel cast speed drops under 0.6 m/min, what crystalline issue commonly occurs?",
        options: ["Excessive coarse grain growth and thermal stress shell tension", "Subsurface hydrogen bubbling", "Premature chemical martensite decay", "Total mold slider-gate erosion"],
        correctAnswerIdx: 0,
        explanation: "Low throughput rates result in excessive grain coarsening and slab physical stress."
      }
    ],
    comp_3: [
      {
        questionText: "Which crystal structure represents austenite steel stable above 912°C?",
        options: ["Body-Centered Cubic (BCC)", "Face-Centered Cubic (FCC)", "Hexagonal Close-Packed (HCP)", "Orthorhombic pearlite"],
        correctAnswerIdx: 1,
        explanation: "Austenite steel possesses a highly dense Face-Centered Cubic atomic layout."
      },
      {
        questionText: "Pearlite is a microscopic laminar structure consisting of:",
        options: ["Ferrite and Martensite", "Austenite and Cementite", "Ferrite and Cementite", "Bainite and Ledeburite"],
        correctAnswerIdx: 2,
        explanation: "Slow cooling of steel through eutectoid point creates alternating plates of soft ferrite and hard cementite."
      },
      {
        questionText: "Quench cracking on high carbon alloy steels is caused by:",
        options: ["Excessive sulfur deoxidation", "Martensite phase transformation volumetric expansion stress", "Slow pearlite grain nucleation", "Silicon segregation on surface"],
        correctAnswerIdx: 1,
        explanation: "Martensitic transformations cause a volumetric increase that induces severe local tensile cracks."
      },
      {
        questionText: "Which alloying element is primarily responsible for stainless steel corrosion resistance?",
        options: ["Vanadium", "Silicon", "Chromium", "Manganese"],
        correctAnswerIdx: 2,
        explanation: "Chromium forms an active, self-healing chromium oxide passive passivation layer on steel surface."
      },
      {
        questionText: "Dendritic microstructural segregation is best balanced by:",
        options: ["Fast casting speeds", "Liquid continuous agitation and solid annealing heat treatment", "Adding copper elements", "Cold mold quenching"],
        correctAnswerIdx: 1,
        explanation: "Chemical diffusion through long-time soaking at high temperatures homogenizes dendritic segregations."
      },
      {
        questionText: "What steel test measures the depth and profile of hardenability?",
        options: ["Charpy impact test", "Jominy End-Quench hardenability test", "Rockwell cone indentation test", "Vickers microhardness sweep"],
        correctAnswerIdx: 1,
        explanation: "The Jominy test measures water spray hardenability drop-off rate along a test specimen."
      },
      {
        questionText: "Standard carbon content of mild structural steels ranges in what spectrum?",
        options: ["0.01% - 0.05% C", "0.15% - 0.25% C", "0.60% - 0.85% C", "1.50% - 2.10% C"],
        correctAnswerIdx: 1,
        explanation: "Mild steel holds 0.15% to 0.25% carbon, offering tough weldability and decent yielding."
      },
      {
        questionText: "In cast steel slabs, what trace element is the primary root of 'hot shortness' red-brittleness?",
        options: ["Phosphorus", "Silicon", "Sulfur", "Nitrogen"],
        correctAnswerIdx: 2,
        explanation: "Sulfur forms low melting point iron sulfide eutectics, producing cracks during hot rolling."
      },
      {
        questionText: "Which test evaluates ductile-to-brittle transition temperature profile?",
        options: ["Tensile necking test", "Jominy curve sweep", "Charpy V-Notch impact testing at graduated temperatures", "Brinell ball hardness test"],
        correctAnswerIdx: 2,
        explanation: "Breaking V-notch samples at varying temperatures registers impact energy absorption curves."
      },
      {
        questionText: "Non-metallic inclusions in continuous mold castings are primarily composed of which oxides?",
        options: ["Iron oxide scale layers", "Silicon carbon particulates", "Alumina clusters (Al2O3)", "Calcium sulfates"],
        correctAnswerIdx: 2,
        explanation: "Alumina is the bypass product of aluminum deoxidation and degrades slab stretching ductility."
      }
    ]
  };

  const getTenQuestions = (compId: string, compName: string) => {
    if (TEN_QUESTIONS_MAP[compId]) {
      return TEN_QUESTIONS_MAP[compId];
    }
    // Dynamic reliable 10-questions backup generator for other targets to avoid breaking
    return [
      {
        questionText: `What is the primary operational objective of establishing master competence in '${compName}'?`,
        options: [
          "To reduce average cycle time and ensure plant safety compliance",
          "To maximize raw material storage volumes",
          "To bypass SCADA safety locks when output targets are high",
          "To isolate administrative staff from shift floor activities"
        ],
        correctAnswerIdx: 0,
        explanation: "Fulfilling competence ensures optimal performance metrics, plant safety, and standard operational efficiency."
      },
      {
        questionText: `Which safety standard primarily regulates operations governed by continuous deployment of '${compName}'?`,
        options: [
          "ISO 9001 quality catalog rules only",
          "OSHA Operational Safety & Industrial Process Control Standards",
          "Standard administrative tracking spreadsheets",
          "National public transit specifications"
        ],
        correctAnswerIdx: 1,
        explanation: "Industrial operations are strictly governed by OSHA safety criteria."
      },
      {
        questionText: `What represents the most common mechanical failure mode under continuous operations of '${compName}'?`,
        options: [
          "Irregular wear, lack of procedural compliance, or sensory detector drift",
          "Complete structural steel failure within minutes",
          "Solenoid power reverse on basic PLC lines",
          "Immediate coolant water tank boil off"
        ],
        correctAnswerIdx: 0,
        explanation: "Gradual mechanical fatigue, poor compliance, and sensor calibration losses are standard failure modes."
      },
      {
        questionText: `When managing severe process instability under '${compName}', the supervisor's first step must be:`,
        options: [
          "Initiate a scheduled audit in the next shift",
          "Consult and verify actual sensor logs and shut secure valves",
          "Increase speed to clear slag deposits quickly",
          "Request new raw material shipments"
        ],
        correctAnswerIdx: 1,
        explanation: "Isolating stability anomalies require verification of real-time sensor loops and primary valves."
      },
      {
        questionText: `What is the role of continuous training and routine SOP certifications in '${compName}'?`,
        options: [
          "To fulfill compliance checklist paperwork only",
          "To eliminate single-points-of-failure and increase overall Workforce Readiness Index (WRI)",
          "To reduce employee overall compensation costs",
          "To increase administrative team statistics"
        ],
        correctAnswerIdx: 1,
        explanation: "Routine SOP alignment expands multi-specialty redundancies, mitigating personnel bottleneck risks."
      },
      {
        questionText: `In standard operating manuals, how are critical warnings categorized in '${compName}'?`,
        options: [
          "In plain text remarks inside maintenance appendices",
          "High-contrast color-coded safety badges denoting hazardous zones",
          "Weekly verbal reminders",
          "Under general digital registry logs"
        ],
        correctAnswerIdx: 1,
        explanation: "Refractory and safety manuals use high-contrast safety banners for rapid risk assessment."
      },
      {
        questionText: `Which specialized wear material is preferred for heavy thermo-mechanical loads under '${compName}'?`,
        options: [
          "Mild structural cast carbon steel",
          "High-durability zirconia-refractory composites",
          "Industrial high-density vinyl polymers",
          "Standard copper plating layers"
        ],
        correctAnswerIdx: 1,
        explanation: "Zirconia composites withstand extreme operational temperatures and wear loads."
      },
      {
        questionText: `What is the primary metric to audit performance parameters under '${compName}'?`,
        options: [
          "Shift quality yield percentage and safety-first incident records",
          "Daily employee check-in times",
          "Total amount of fuel consumed",
          "Warehouse packaging count"
        ],
        correctAnswerIdx: 0,
        explanation: "Incident-free operations combined with maximum output compliance are standard KPIs."
      },
      {
        questionText: `Which alarm triggers immediately if emergency process parameters trace beyond acceptable parameters in '${compName}'?`,
        options: [
          "A soft green diagnostic strobe with no siren",
          "An active high-decibel audio siren with physical interlock trip",
          "A standard administrative email notification",
          "A periodic weekly equipment report highlight"
        ],
        correctAnswerIdx: 1,
        explanation: "Exceeding safety bounds triggers loud sirens along with automatic interlock trip protections."
      },
      {
        questionText: `By what method is manual adjustment done safely under critical conditions of '${compName}'?`,
        options: [
          "Under direct buddy supervision with positive backup controls",
          "By bypassing LOTO devices temporarily",
          "Instructing junior trainees immediately without supervision",
          "Uncoupling grounding wires"
        ],
        correctAnswerIdx: 0,
        explanation: "Any manual action under risk factors requires a certified supervisor buddy and mechanical locks."
      }
    ];
  };

  const handleQuizSubmit = async (score: number, passed: boolean) => {
    setQuizSubmitting(true);
    try {
      if (passed && selectedCompForMitigation && mitigationEmployeeId) {
        await api.rateCompetency({
          competencyId: selectedCompForMitigation.id,
          rating: 5,
          userId: mitigationEmployeeId
        });
        
        try {
          await api.postLDConnect({
            targetType: "employee",
            targetId: mitigationEmployeeId,
            message: `Congratulations! Your competency gap in '${selectedCompForMitigation.name}' has been successfully cleared after you completed the 10-question evaluation with a perfect rating!`,
            type: "info"
          });
        } catch (msgErr) {
          console.warn("Could not post success message:", msgErr);
        }
      }
      setQuizResult({ score, passed });
      setQuizFinished(true);
      await loadManagerData();
    } catch (e) {
      console.error("Quiz submission error:", e);
      alert("Failed to submit and rate competency.");
    } finally {
      setQuizSubmitting(false);
    }
  };

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectSuccess("");
    setConnectError("");
    if (!connectTargetId || !connectMsg) {
      setConnectError("Please select a target and enter your message.");
      return;
    }
    try {
      await api.postLDConnect({
        targetType: connectTargetType,
        targetId: connectTargetId,
        message: connectMsg,
        type: connectType,
        assignedModuleId: connectType === "assign" ? connectSelectedModule : undefined
      });
      setConnectSuccess(`Successfully pushed Connect directive to ${connectTargetId}!`);
      setConnectMsg("");
      setConnectSelectedModule("");
      loadManagerData();
    } catch (err: any) {
      setConnectError(err.message || "Failed to push intervention.");
    }
  };

  const handleWisdomAssessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWisdomSuccess("");
    if (!activeRetiree || !wisdomAssessTitle) return;
    try {
      await api.postLDRetirementAssess({
        retireeId: activeRetiree.id,
        assessmentTitle: wisdomAssessTitle,
        questions: wisdomQuestions
      });
      setWisdomSuccess(`Successfully assigned custom wisdom cap assessment "${wisdomAssessTitle}" to retiree ${activeRetiree.fullName}!`);
      setWisdomAssessTitle("");
      loadManagerData();
      setTimeout(() => {
        setRetirementModalOpen(false);
        setActiveRetiree(null);
        setWisdomSuccess("");
      }, 3500);
    } catch (err: any) {
      alert(err.message || "Failed to assign legacy wisdom assessment.");
    }
  };

  const getCriticalTag = (crit: string) => {
    if (crit === "high") return <span className="text-[9px] font-mono font-bold bg-rose-950 text-rose-400 border border-rose-900 rounded px-1.5 py-0.5">CRITICAL SPECIALTY</span>;
    return <span className="text-[9px] font-mono text-zinc-500 rounded px-1 px-1 py-0.5">STANDARD</span>;
  };

  const [searchTerm, setSearchTerm] = useState<string>("");

  const filteredTeam = team.filter(emp => {
    const val = searchTerm.toLowerCase();
    return emp.fullName?.toLowerCase().includes(val) || 
           emp.jobTitle?.toLowerCase().includes(val);
  });

  return (
    <div className="space-y-6">
      
      {/* 🚀 Portal Tab Switcher & Manager Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-8 -translate-y-8">
          <Activity className="w-64 h-64 text-sky-400" />
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse"></span>
              <span className="text-[10px] uppercase tracking-widest font-mono text-sky-400 font-bold">
                Manager Portal ({userProfile.department?.toUpperCase() || "Operations"} Department)
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight font-sans text-slate-100">
              {lang === "hi" ? `प्रबंधक डैशबोर्ड: ${userProfile.fullName}` : `Manager Control Hub: ${userProfile.fullName}`}
            </h2>
            <p className="text-xs text-sky-200/70 font-mono font-medium max-w-xl leading-relaxed">
              {lang === "hi" 
                ? "अपनी स्वयं की योग्यता प्रगति की निगरानी करें और अपने शिफ़्ट स्टाफ़ की तत्परता सूचकांक (Ready Indices) तथा कौशल अंतरालों का प्रबंधन करें।"
                : "Monitor your own capability progress alongside your shifts readiness indices, compliance scores, and targeted task training profiles."}
            </p>
          </div>

          <div className="flex bg-slate-800/80 p-1.5 rounded-lg border border-slate-700 shrink-0 self-start md:self-center">
            <button
              onClick={() => {
                setActiveTab("myself");
                setSelectedEmployeeProfile(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-sans font-extrabold transition-all duration-200 cursor-pointer ${
                activeTab === "myself"
                  ? "bg-sky-600 text-white shadow-md font-black"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <User className="w-4 h-4" />
              <span>{lang === "hi" ? "स्वयं की रिपोर्ट" : "My Personal Report"}</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("team");
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-sans font-extrabold transition-all duration-200 cursor-pointer ${
                activeTab === "team"
                  ? "bg-sky-600 text-white shadow-md font-black"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{lang === "hi" ? "टीम / विभाग रिपोर्ट" : "My Team/Dept Report"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🔮 Case 1: Myself Personal Report */}
      {activeTab === "myself" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Personal WRI Indicator Meter & Info Cards */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Leader Bio Profile Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs text-slate-800 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <div className="w-12 h-12 bg-sky-600 rounded-full flex items-center justify-center font-mono font-bold text-white text-sm">
                    {userProfile.fullName ? userProfile.fullName.split(" ").map((n: string) => n[0]).join("") : "M"}
                  </div>
                  <div>
                    <h3 className="font-sans font-black text-slate-900 text-sm leading-tight">{userProfile.fullName}</h3>
                    <p className="text-xs font-mono text-slate-500">{userProfile.jobTitle || "Department Manager"}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-mono font-extrabold bg-sky-50 border border-sky-200 text-sky-600 rounded uppercase">
                      Admin Authorized Lead
                    </span>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="font-medium">Duty Shift Location:</span>
                    <span className="font-mono text-slate-900 font-semibold bg-slate-50 px-2 py-0.5 rounded border border-slate-100">SMS-2 Casting Floor</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="font-medium">Direct Report Span:</span>
                    <span className="font-mono text-slate-900 font-semibold bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{team.length} Operators</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="font-medium">Primary Competency:</span>
                    <span className="font-mono text-slate-900 font-semibold text-[10px] bg-indigo-50 border border-indigo-150 text-indigo-700 px-2 py-0.5 rounded">
                      Process Controls
                    </span>
                  </div>
                </div>
              </div>

              {/* Personal Workforce Readiness Index Dial */}
              {myWri ? (
                <div className="bg-gradient-to-br from-indigo-950 to-slate-900 text-white rounded-xl p-5 shadow-md border border-indigo-900/60 text-center space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest font-black block">
                      My Workforce Readiness Score
                    </span>
                    <p className="text-[10px] text-slate-400 font-mono">My personal WRI compliance level</p>
                  </div>

                  <div className="inline-flex justify-center items-center relative py-2">
                    <div className="w-28 h-28 rounded-full border-4 border-slate-800 flex flex-col justify-center items-center bg-slate-950/50">
                      <span className="text-3xl font-mono font-black text-indigo-400">{myWri.wri}%</span>
                      <span className="text-[9px] font-mono tracking-wider uppercase text-emerald-400 font-bold mt-1">Ready</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800 text-[10px]">
                    <div className="space-y-0.5 bg-slate-950/40 p-2 rounded">
                      <span className="text-slate-400 block font-mono">Skills Met</span>
                      <span className="font-mono font-bold text-sky-400">{myWri.factors.competencyCoverage}%</span>
                    </div>
                    <div className="space-y-0.5 bg-slate-950/40 p-2 rounded">
                      <span className="text-slate-400 block font-mono">Tests Pass</span>
                      <span className="font-mono font-bold text-amber-400">{myWri.factors.assessmentSuccess}%</span>
                    </div>
                    <div className="space-y-0.5 bg-slate-950/40 p-2 rounded">
                      <span className="text-slate-400 block font-mono">Learning</span>
                      <span className="font-mono font-bold text-rose-400">{myWri.factors.learningProgress}%</span>
                    </div>
                  </div>
                  
                  <p className="text-[10px] text-slate-300 leading-relaxed text-left italic bg-white/5 p-2.5 rounded border border-white/5">
                    💡 <strong>Calculation Guide:</strong> Your management WRI score is a composite metric weighted at 50% core leadership competency fulfillment, 30% safety clearance assessments, and 20% active instructional progress.
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-400 font-mono text-xs">
                  Calculating personal metrics...
                </div>
              )}

            </div>

            {/* Right Column: Manager Skill matrices & Learning Progress */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Personal Manager Skill Requirements vs Target */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div>
                  <h3 className="text-sm font-sans font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-150">
                    <Target className="w-4 h-4 text-sky-600" />
                    <span>My Assigned Core Competencies & Gap Score</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Check your personal rating relative to corporate specifications assigned for your management category.
                  </p>
                </div>

                {myProfile ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2 max-h-96 overflow-y-auto pr-1">
                    {myProfile.profile.map((item: any) => {
                      const isGaped = item.gap > 0;
                      return (
                        <div key={item.competency.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between space-y-3 hover:border-slate-300 transition-colors">
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <span className="text-[9px] font-mono font-bold text-[#0284C7] bg-sky-50 border border-sky-100 rounded px-1.5 py-0.5">
                                {item.competency.code}
                              </span>
                              <h4 className="font-sans font-black text-slate-900 text-xs mt-1.5">{item.competency.name}</h4>
                            </div>
                            {isGaped ? (
                              <span className="shrink-0 px-2.5 py-0.5 font-mono text-[9px] font-black bg-rose-50 border border-rose-250 text-rose-600 rounded">
                                GAP: -{item.gap}
                              </span>
                            ) : (
                              <span className="shrink-0 px-2.5 py-0.5 font-mono text-[9px] font-black bg-emerald-50 border border-emerald-200 text-emerald-600 rounded uppercase tracking-wider">
                                Compliant
                              </span>
                            )}
                          </div>

                          <div className="space-y-1.5 text-[11px]">
                            <div className="flex justify-between text-slate-500 font-mono text-[10px]">
                              <span>My Rating: {item.currentLevel} / 5</span>
                              <span>Target Level: {item.requiredLevel} / 5</span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden border border-slate-250">
                              <div 
                                className={`h-full ${isGaped ? "bg-amber-500" : "bg-emerald-500"}`} 
                                style={{ width: `${Math.min(100, (item.currentLevel / item.requiredLevel) * 100)}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* 🎯 Real-time Gap Resolution: Study Roadmap, Materials, and Inline Assessment for Managers */}
                          {isGaped && (() => {
                            const matchingPath = myLearning?.find((p: any) => p.module.competencyId === item.competency.id);
                            if (!matchingPath) return null;
                            const isDone = matchingPath.status === "completed";

                            return (
                              <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                                <div className="bg-indigo-50/55 border border-indigo-100 rounded-lg p-3 space-y-2 text-[11px]">
                                  <div className="flex items-center gap-1 text-indigo-700 font-sans font-extrabold text-[10px] uppercase tracking-wider">
                                    <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>ROADMAPPED COURSE: {matchingPath.module.title}</span>
                                  </div>
                                  <p className="text-slate-600 leading-normal text-[11.5px] font-sans">
                                    {matchingPath.module.content}
                                  </p>

                                  {/* Concept Guide */}
                                  <div className="p-2.5 rounded bg-white hover:shadow-3xs transition-shadow border border-indigo-150/40 text-[11px] leading-relaxed">
                                    <div className="flex items-center gap-1 font-bold text-indigo-650 mb-1">
                                      <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
                                      <span>Simpler Explanation (सरल शब्दों में):</span>
                                    </div>
                                    <p className="text-slate-700 leading-relaxed">
                                      {lang === "en" 
                                        ? (matchingPath.module.easyExplanation || "Fulfill security checks and process bounds carefully.")
                                        : (matchingPath.module.easyExplanationHindi || "सुरक्षा नियंत्रण और प्रक्रिया सीमाओं को ध्यान से पूरा करें।")}
                                    </p>
                                  </div>

                                  {/* Materials required */}
                                  {matchingPath.module.resources && matchingPath.module.resources.length > 0 && (
                                    <div className="space-y-1.5 pt-1">
                                      <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500 block font-bold">Materials Required & References:</span>
                                      <div className="grid grid-cols-1 gap-1.5">
                                        {matchingPath.module.resources.map((res: any, idx: number) => {
                                          const isVideo = res.url.includes("youtube.com") || res.url.includes("youtu.be") || res.name.toLowerCase().includes("video");
                                          return (
                                            <a
                                              key={idx}
                                              href={res.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center justify-between p-2 rounded bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-650 transition-all text-[11px] font-medium"
                                            >
                                              <div className="flex items-center gap-2 truncate">
                                                {isVideo ? <Video className="w-3.5 h-3.5 text-rose-500 shrink-0" /> : <FileText className="w-3.5 h-3.5 text-sky-500 shrink-0" />}
                                                <span className="truncate text-slate-755">{res.name}</span>
                                              </div>
                                              <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                                            </a>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Taking Assessment */}
                                <div className="space-y-2">
                                  {isDone ? (
                                    <div className="p-2.5 bg-emerald-50 border border-emerald-150 rounded-lg text-emerald-700 text-[11px] font-medium flex items-center gap-1.5">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                      <span>Study completed. Competency gap successfully resolved!</span>
                                    </div>
                                  ) : (
                                    <>
                                      {activeManagerQuizModuleId === matchingPath.module.id ? (
                                        <div className="p-3 bg-orange-50/25 border border-orange-100 rounded-lg space-y-3 animate-fadeIn">
                                          <div className="flex items-center justify-between border-b border-orange-100 pb-1.5">
                                            <span className="font-mono text-[10px] text-orange-700 font-extrabold uppercase tracking-wide flex items-center gap-1">
                                              <Brain className="w-3.5 h-3.5" />
                                              <span>SOP Clearance Assessment</span>
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveManagerQuizModuleId(null);
                                                // Clear existing error/msg
                                                setManagerQuizResults(prev => {
                                                  const copy = { ...prev };
                                                  delete copy[matchingPath.module.id];
                                                  return copy;
                                                });
                                              }}
                                              className="text-[10px] font-sans text-slate-500 hover:text-slate-700 underline"
                                            >
                                              Close
                                            </button>
                                          </div>

                                          {matchingPath.questions && matchingPath.questions.length > 0 ? (
                                            <div className="space-y-3 text-[11px]">
                                              {matchingPath.questions.map((q: any, qIdx: number) => {
                                                const currentAns = managerQuizAnswers[q.id];
                                                return (
                                                  <div key={q.id} className="bg-white p-2.5 rounded border border-slate-150 space-y-1.5">
                                                    <span className="text-[9px] font-mono text-[#0284C7] font-bold block mb-0.5">QUESTION {qIdx + 1} OF {matchingPath.questions.length}</span>
                                                    <p className="font-semibold text-slate-800 leading-normal">{lang === "en" ? q.questionText : q.questionTextHindi}</p>
                                                    <div className="grid grid-cols-1 gap-1.5 mt-2">
                                                      {(lang === "en" ? q.options : q.optionsHindi).map((opt: string, optIdx: number) => {
                                                        const isSel = currentAns === optIdx;
                                                        return (
                                                          <button
                                                            type="button"
                                                            key={optIdx}
                                                            onClick={() => {
                                                              setManagerQuizAnswers(prev => ({
                                                                ...prev,
                                                                [q.id]: optIdx
                                                              }));
                                                            }}
                                                            className={`text-left text-[11px] p-2 rounded border transition-all flex items-center justify-between cursor-pointer ${
                                                              isSel ? "bg-indigo-50 border-indigo-300 text-indigo-850 font-medium" : "hover:bg-slate-50 border-slate-200 text-slate-650"
                                                            }`}
                                                          >
                                                            <span>{opt}</span>
                                                            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSel ? "border-indigo-500" : "border-slate-300"}`}>
                                                              {isSel && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                                                            </div>
                                                          </button>
                                                        );
                                                      })}
                                                    </div>
                                                  </div>
                                                );
                                              })}

                                              {managerQuizResults[matchingPath.module.id] && (
                                                <div className={`p-2.5 rounded border ${
                                                  managerQuizResults[matchingPath.module.id].success 
                                                    ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                                                    : "bg-rose-50 border-rose-250 text-rose-800"
                                                }`}>
                                                  {managerQuizResults[matchingPath.module.id].message}
                                                </div>
                                              )}

                                              <button
                                                type="button"
                                                onClick={async () => {
                                                  const answers = managerQuizAnswers;
                                                  try {
                                                    const res = await api.completeLearningModule(matchingPath.module.id, answers);
                                                    setManagerQuizResults(prev => ({
                                                      ...prev,
                                                      [matchingPath.module.id]: {
                                                        success: true,
                                                        message: `Congratulations! SOP Clearance checklist verification successful (${res.score}% scored). Your competency profile is newly updated!`,
                                                        score: res.score,
                                                        passed: true
                                                      }
                                                    }));
                                                    setManagerQuizAnswers({});
                                                    setActiveManagerQuizModuleId(null);
                                                    loadManagerData();
                                                  } catch (err: any) {
                                                    setManagerQuizResults(prev => ({
                                                      ...prev,
                                                      [matchingPath.module.id]: {
                                                        success: false,
                                                        message: err.message || "Failed clearance threshold of 65%. Please read concept manuals and re-assess.",
                                                        score: 0,
                                                        passed: false
                                                      }
                                                    }));
                                                  }
                                                }}
                                                className="w-full bg-sky-655 hover:bg-sky-700 bg-[#0284C7] hover:bg-[#0369A1] text-white font-sans font-bold py-2 rounded text-[11px] transition-all cursor-pointer shadow-3xs"
                                              >
                                                Submit Assessment to Update Profile
                                              </button>
                                            </div>
                                          ) : (
                                            <p className="text-slate-400 font-mono text-[10px] text-center">No validation quiz configured for this standard.</p>
                                          )}
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveManagerQuizModuleId(matchingPath.module.id);
                                            setManagerQuizAnswers({});
                                            // Reset outcomes
                                            setManagerQuizResults(prev => {
                                              const copy = { ...prev };
                                              delete copy[matchingPath.module.id];
                                              return copy;
                                            });
                                          }}
                                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold py-1.5 px-3 rounded text-[10.5px] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-3xs"
                                        >
                                          <Brain className="w-3.5 h-3.5" />
                                          <span>Take Assessment to Update Profile</span>
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-400 font-mono text-center text-xs py-6">Loading capability matrices...</p>
                )}
              </div>

              {/* Manager's Self-directed Learning Modules */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div>
                  <h3 className="text-sm font-sans font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-150">
                    <BookOpen className="w-4 h-4 text-sky-600" />
                    <span>My Self-Directed Standard Compliance Learning Tracks</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Access courses mapped to standard operational plant modules. Complete these modules to raise your core compliance factors.
                  </p>
                </div>

                {myLearning && myLearning.length > 0 ? (
                  <div className="space-y-4">
                    {myLearning.map((path: any) => {
                      const isDone = path.progress?.status === "completed";
                      return (
                        <div key={path.module.id} className="border border-slate-200 rounded-lg p-5 bg-slate-50/50 space-y-4 hover:border-sky-500 transition-all">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-indigo-650 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 uppercase">
                                  {path.module.difficulty}
                                </span>
                                <span className="font-mono text-[10px] text-slate-500">{path.module.estimatedMinutes} Mins</span>
                              </div>
                              <h4 className="font-sans font-black text-slate-900 text-xs">{path.module.title}</h4>
                              <p className="text-[11px] text-slate-650 font-sans leading-relaxed">
                                {path.module.content}
                              </p>
                            </div>

                            <div className="shrink-0 flex items-center">
                              {isDone ? (
                                <span className="flex items-center gap-1 text-[10px] font-mono font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-md">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>DONE</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (activeManagerQuizModuleId === path.module.id) {
                                      setActiveManagerQuizModuleId(null);
                                    } else {
                                      setActiveManagerQuizModuleId(path.module.id);
                                      setManagerQuizAnswers({});
                                      // Clear existing results
                                      setManagerQuizResults(prev => {
                                        const copy = { ...prev };
                                        delete copy[path.module.id];
                                        return copy;
                                      });
                                    }
                                  }}
                                  className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-[11px] rounded-md font-sans font-bold shadow-3xs cursor-pointer transition-all border ${
                                    activeManagerQuizModuleId === path.module.id 
                                      ? "bg-slate-100 border-slate-350 text-slate-705 hover:bg-slate-200"
                                      : "bg-white border-slate-200 hover:border-sky-500 hover:bg-sky-50 text-slate-705 hover:text-sky-700"
                                  }`}
                                >
                                  {activeManagerQuizModuleId === path.module.id ? (
                                    <>
                                      <span>Close Assessment</span>
                                    </>
                                  ) : (
                                    <>
                                      <Brain className="w-3.5 h-3.5 text-sky-500" />
                                      <span>Complete & Take Assessment</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* 💡 Concept guide: Easy Words */}
                          <div className="p-4 rounded-lg bg-indigo-50/40 border border-indigo-100/60 space-y-3 shadow-3xs">
                            <div className="flex items-center gap-1.5 text-indigo-700 font-sans font-extrabold text-xs">
                              <Sparkles className="w-4 h-4 text-indigo-500" />
                              <span>CONCEPT GUIDE: Explained in Easy Words (सरल सामान्य भाषा गाइड)</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans leading-relaxed text-slate-750">
                              <div className="space-y-1 bg-white/70 p-3 rounded border border-slate-100">
                                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold block">English Simple Terms:</span>
                                <p className="text-slate-705 leading-relaxed font-sans mt-0.5">
                                  {path.module.easyExplanation || "In simple terms, this course helps you understand practical hazard protection, how process limits operate, and what immediate troubleshooting actions are needed on-site."}
                                </p>
                              </div>
                              <div className="space-y-1 bg-white/70 p-3 rounded border border-indigo-100/30">
                                <span className="text-[10px] uppercase tracking-wider text-indigo-500 font-mono font-bold block">सरल हिंदी स्पष्टीकरण:</span>
                                <p className="text-slate-800 leading-relaxed font-sans mt-0.5">
                                  {path.module.easyExplanationHindi || "आसान शब्दों में कहें तो, यह कोर्स आपको प्रैक्टिकल सुरक्षा नियमों, मशीनों और उपकरणों की सीमा और आपातकालीन स्थिति में तुरंत की जाने वाली जरूरी कार्रवाई समझाता है।"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* 📚 Real reference study links */}
                          {path.module.resources && path.module.resources.length > 0 && (
                            <div className="pt-3 border-t border-slate-200">
                              <span className="text-[10px] text-slate-500 font-mono block uppercase tracking-wider font-bold mb-2.5">
                                Real Study Resources & Reference Links:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {path.module.resources.map((res: any, idx: number) => {
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
                          {!isDone && activeManagerQuizModuleId === path.module.id && (
                            <div className="mt-5 p-4 rounded-lg bg-orange-50/20 border border-orange-100 flex flex-col gap-4 animate-fadeIn">
                              <div className="flex items-center gap-1.5 text-orange-700 font-sans font-extrabold text-xs">
                                <Brain className="w-4 h-4 text-[#D97706]" />
                                <span>SOP CLEARANCE CHECKLIST (अनिवार्य सुरक्षा प्रश्नोत्तरी जांच)</span>
                              </div>
                              
                              <p className="text-xs text-slate-500">
                                You must answer the 3 randomized validation questions below correctly (scoring at least 65%) to confirm clearance and verify actual competency understanding.
                              </p>

                              {path.questions && path.questions.length > 0 ? (
                                <div className="space-y-4">
                                  {path.questions.map((q: any, qIdx: number) => {
                                    const currentAnswer = managerQuizAnswers[q.id];

                                    return (
                                      <div key={q.id} className="bg-white p-3 rounded border border-slate-200">
                                        <span className="text-[10px] font-mono text-[#0284C7] font-bold block mb-1">
                                          QUESTION {qIdx + 1} OF {path.questions.length}
                                        </span>
                                        <p className="text-xs font-sans font-semibold text-slate-800">
                                          {lang === "en" ? q.questionText : q.questionTextHindi}
                                        </p>

                                        <div className="grid grid-cols-1 gap-2 mt-3">
                                          {(lang === "en" ? q.options : q.optionsHindi).map((opt: string, optIdx: number) => {
                                            const isSelected = currentAnswer === optIdx;
                                            return (
                                              <button
                                                type="button"
                                                key={optIdx}
                                                onClick={() => {
                                                  setManagerQuizAnswers(prev => ({
                                                    ...prev,
                                                    [q.id]: optIdx
                                                  }));
                                                }}
                                                className={`text-left text-xs p-2.5 rounded border transition-all flex items-center justify-between cursor-pointer ${
                                                  isSelected
                                                    ? "bg-sky-50 border-sky-300 font-medium text-sky-850"
                                                    : "hover:bg-slate-50 border-slate-200 text-slate-655"
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

                                  {managerQuizResults[path.module.id] && (
                                    <div className={`p-3 rounded-lg border text-xs leading-relaxed ${
                                      managerQuizResults[path.module.id].success 
                                        ? "bg-emerald-50 border-emerald-250 text-emerald-800" 
                                        : "bg-rose-50 border-rose-255 text-rose-800"
                                    }`}>
                                      {managerQuizResults[path.module.id].message}
                                    </div>
                                  )}

                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const answers = managerQuizAnswers;
                                      try {
                                        const res = await api.completeLearningModule(path.module.id, answers);
                                        setManagerQuizResults(prev => ({
                                          ...prev,
                                          [path.module.id]: {
                                            success: true,
                                            message: `Congratulations! SOP Clearance checklist verification successful (${res.score}% scored). Your competency profile is newly updated!`,
                                            score: res.score,
                                            passed: true
                                          }
                                        }));
                                        setManagerQuizAnswers({});
                                        setActiveManagerQuizModuleId(null);
                                        loadManagerData();
                                      } catch (err: any) {
                                        setManagerQuizResults(prev => ({
                                          ...prev,
                                          [path.module.id]: {
                                            success: false,
                                            message: err.message || "Failed clearance threshold of 65%. Please read concept manuals and re-assess.",
                                            score: 0,
                                            passed: false
                                          }
                                        }));
                                      }
                                    }}
                                    className="w-full bg-sky-655 hover:bg-sky-700 bg-[#0284C7] hover:bg-[#0369A1] text-white font-sans font-bold py-2 rounded text-xs transition-all cursor-pointer shadow-3xs flex items-center justify-center gap-1"
                                  >
                                    <Brain className="w-4 h-4 text-white" />
                                    <span>Submit SOP Assessment to Clear Track</span>
                                  </button>
                                </div>
                              ) : (
                                <p className="text-slate-400 font-mono text-center text-xs">No validation questions available for this module.</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-400 font-mono text-center text-xs py-6">No self-directed study tracks assigned.</p>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 🔮 Case 2: Team/Dept Report Tab */}
      {activeTab === "team" && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Executive Quick Stats Cards */}
          {kriData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 p-5 rounded-xl flex justify-between items-center relative overflow-hidden shadow-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">Knowledge Risk Index (KRI)</span>
                  <p className={`text-4xl font-mono font-bold tracking-tight ${kriData.kri > 40 ? "text-rose-600" : "text-emerald-600"}`}>{kriData.kri}%</p>
                  <p className="text-[10px] text-slate-400 font-mono">Shift standard: max 35%</p>
                </div>
                <div className={`p-3 rounded-full border shrink-0 ${kriData.kri > 40 ? "bg-rose-50 border-rose-100 text-rose-500" : "bg-emerald-50 border-emerald-100 text-emerald-500"}`}>
                  <ShieldAlert className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-xl flex justify-between items-center relative overflow-hidden shadow-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">Competency Gap Risk</span>
                  <p className="text-4xl font-mono font-bold text-amber-600 tracking-tight">{kriData.factors.teamGapRisk}%</p>
                  <div className="w-24 bg-slate-100 h-1 rounded-full overflow-hidden mt-2 border border-slate-200">
                    <div className="bg-amber-500 h-full" style={{ width: `${kriData.factors.teamGapRisk}%` }}></div>
                  </div>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-100 text-amber-500 rounded-full shrink-0">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-xl flex justify-between items-center relative overflow-hidden shadow-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">Bottleneck Experts</span>
                  <p className="text-4xl font-mono font-bold text-rose-600 tracking-tight">{kriData.factors.bottleneckRisk}%</p>
                  <p className="text-[10px] text-slate-400 font-mono">Knowledge single points</p>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-500 rounded-full shrink-0">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-xl flex justify-between items-center relative overflow-hidden shadow-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">SOP Manual Deficit</span>
                  <p className="text-4xl font-mono font-bold text-sky-600 tracking-tight">{kriData.factors.documentationDeficit}%</p>
                  <p className="text-[10px] text-slate-400 font-mono">Unstructured knowledge</p>
                </div>
                <div className="p-3 bg-sky-50 border border-sky-100 text-sky-500 rounded-full shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
              </div>
            </div>
          )}

          {/* Plant Warnings Panel */}
          {kriData && kriData.riskWarnings?.length > 0 && (
            <div className="bg-rose-50/50 border-l-4 border-rose-500 p-4.5 rounded-r-lg space-y-2 border border-rose-200/50">
              <div className="flex items-center gap-2 text-rose-700 font-sans font-extrabold text-xs uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-rose-500 animate-bounce" />
                <span>Active Safety & Competency Risk Warnings</span>
              </div>
              <ul className="list-disc pl-5 text-[11px] text-slate-750 space-y-1.5 font-sans leading-relaxed">
                {kriData.riskWarnings.map((warn: string, i: number) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Interactive Assignment Success Toast Alert */}
          {assignmentSuccess && (
            <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-lg shadow-sm text-xs text-emerald-800 font-sans flex items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                  <Check className="w-3.5 h-3.5 font-black" />
                </div>
                <span className="font-bold">{assignmentSuccess}</span>
              </div>
              <button 
                onClick={() => setAssignmentSuccess(null)}
                className="text-[10px] font-mono text-slate-400 hover:text-slate-650 font-bold"
              >
                Close
              </button>
            </div>
          )}

          {/* Sub-tab navigation selector bar */}
          <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-205">
            <button
              onClick={() => {
                setActiveSubTab("roster");
                setSelectedEmployeeProfile(null);
                setSelectedCompForMitigation(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-sans font-bold border transition-all cursor-pointer ${
                activeSubTab === "roster"
                  ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Users className="w-4 h-4 text-current" />
              <span>{lang === "hi" ? "क्रू कौशल रोस्टर" : "📋 Crew Roster & Gaps"}</span>
            </button>
            <button
              onClick={() => {
                setActiveSubTab("department");
                setSelectedEmployeeProfile(null);
                setSelectedCompForMitigation(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-sans font-bold border transition-all cursor-pointer ${
                activeSubTab === "department"
                  ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Activity className="w-4 h-4 text-current" />
              <span>{lang === "hi" ? "विभाग स्वास्थ्य विश्लेषण" : "🏢 Team & Dept Health"}</span>
            </button>
            <button
              onClick={() => {
                setActiveSubTab("retirement");
                setSelectedEmployeeProfile(null);
                setSelectedCompForMitigation(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-sans font-bold border transition-all cursor-pointer ${
                activeSubTab === "retirement"
                  ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Briefcase className="w-4 h-4 text-current" />
              <span>{lang === "hi" ? "सेवानिवृत्ति भंडार" : "👴 Retirement Repository"}</span>
            </button>
            <button
              onClick={() => {
                setActiveSubTab("connect");
                setSelectedEmployeeProfile(null);
                setSelectedCompForMitigation(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-sans font-bold border transition-all cursor-pointer ${
                activeSubTab === "connect"
                  ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Send className="w-4 h-4 text-current" />
              <span>{lang === "hi" ? "कनेक्ट स्टेशन" : "⚡ Connect Station"}</span>
            </button>
            <button
              onClick={() => {
                setActiveSubTab("mentors");
                setSelectedEmployeeProfile(null);
                setSelectedCompForMitigation(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-sans font-bold border transition-all cursor-pointer relative ${
                activeSubTab === "mentors"
                  ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Award className="w-4 h-4 text-current" />
              <span>{lang === "hi" ? "अभिभावक प्राधिकरण" : "⚔️ Expert Mentor Queue"}</span>
              {nominations.filter(n => n.nomination.status === "pending").length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-white">
                  {nominations.filter(n => n.nomination.status === "pending").length}
                </span>
              )}
            </button>
          </div>

          {/* 💼 segment 1: Crew Skill roster with inline 'No Map' ahead resolution guidance */}
          {activeSubTab === "roster" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">
              
              {/* Left Column: Operator crew and gap diagnostics */}
              <div className={`${selectedCompForMitigation ? "lg:col-span-7" : "lg:col-span-12"} bg-white border border-slate-205 rounded-xl p-5 space-y-4 shadow-sm transition-all`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
                  <div>
                    <h3 className="text-base font-sans font-black text-slate-900">
                      {lang === "hi" ? "दैनिक फ़ील्ड स्टाफ़ कौशल सूची (Crew Matrix)" : "Department Operator Skill Roster"}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Analyze Operator Readiness Indexes (WRI) and trigger live competency studies or assessments.
                    </p>
                  </div>
                  
                  <div className="relative w-full sm:w-64 max-w-sm shrink-0">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                      <Search className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={lang === "hi" ? "कर्मचारी या पद खोजें..." : "Filter by operator name or job title..."}
                      className="w-full pl-9 pr-4 py-1.5 text-xs text-slate-800 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:ring-2 focus:ring-sky-500 rounded-lg outline-hidden font-sans transition-all"
                    />
                  </div>
                </div>

                {/* Table list */}
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-xs font-sans text-slate-700">
                    <thead className="bg-[#1E293B] text-[9px] uppercase font-mono tracking-widest text-[#F8FAFC]/90 text-left border-b border-zinc-100">
                      <tr>
                        <th className="p-3 font-extrabold text-[#F8FAFC]">Employee & Job Title</th>
                        <th className="p-3 font-extrabold text-center text-[#F8FAFC]">WRI Score</th>
                        <th className="p-3 font-extrabold text-center text-[#F8FAFC]">Skill Gaps</th>
                        <th className="p-3 font-extrabold text-[#F8FAFC]">Next Blueprint Assignment</th>
                        <th className="p-3 font-extrabold text-right text-[#F8FAFC]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {filteredTeam.map((emp) => {
                        const wriColor = emp.wri >= 75 ? "text-emerald-500 bg-emerald-50 border border-emerald-150" : emp.wri >= 45 ? "text-amber-600 bg-amber-50 border border-amber-150" : "text-rose-500 bg-rose-50 border border-rose-150";
                        const gapCount = emp.gaps ? emp.gaps.length : 0;
                        const nextAsg = emp.nextAssignments && emp.nextAssignments.length > 0 ? emp.nextAssignments[0] : null;

                        return (
                          <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-3 font-sans">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-sky-600 text-white font-mono font-black text-[9px] flex items-center justify-center shadow-3xs uppercase shrink-0">
                                  {emp.fullName?.split(" ").map((n: string) => n[0]).join("")}
                                </div>
                                <div className="space-y-0.5">
                                  <span className="font-bold text-slate-800 block leading-tight">{emp.fullName}</span>
                                  <span className="text-[9.5px] font-mono text-slate-400 block uppercase font-bold">{emp.jobTitle}</span>
                                </div>
                              </div>
                            </td>

                            <td className="p-3 text-center">
                              <div className="inline-flex flex-col items-center">
                                <span className={`px-1.5 py-0.5 rounded font-mono font-black text-xs ${wriColor}`}>
                                  {emp.wri || 0}%
                                </span>
                              </div>
                            </td>

                            <td className="p-3 text-center">
                              {gapCount > 0 ? (
                                <span className="px-1.5 py-0.5 rounded border border-rose-200 bg-rose-50/50 text-rose-600 text-[10px] font-mono font-black">
                                  {gapCount} GAPS
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-600 text-[10px] font-mono font-bold">
                                  COMPLIANT
                                </span>
                              )}
                            </td>

                            <td className="p-3 max-w-[180px] truncate">
                              {nextAsg ? (
                                <span className="text-slate-800 font-bold block truncate" title={nextAsg.title}>
                                  💡 {nextAsg.title}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-mono text-[10px] italic">Fully certified!</span>
                              )}
                            </td>

                            <td className="p-3 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                {nextAsg && (
                                  <button
                                    onClick={() => handleAssignModule(emp.id, emp.fullName, nextAsg.id, nextAsg.title)}
                                    className="bg-sky-50 border border-sky-200 hover:bg-sky-100 text-[#0284C7] text-[10px] font-sans font-bold py-1 px-2 rounded transition-colors shadow-3xs cursor-pointer flex items-center gap-1 shrink-0"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Assign</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    inspectSkillProfile(emp.id);
                                    setSelectedCompForMitigation(null);
                                  }}
                                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-sans font-semibold py-1 px-2.5 rounded transition-colors shadow-3xs cursor-pointer"
                                >
                                  Audit
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Audit Expanding Block */}
                {selectedEmployeeProfile && (
                  <div className="bg-slate-50/50 p-4 border border-slate-205 rounded-xl space-y-3.5 mt-5 animate-scaleUp">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                      <div>
                        <h4 className="text-[11px] font-mono font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-sky-600" />
                          Crew Capability Profiler
                        </h4>
                        <p className="text-xs text-slate-600">
                          Worker: <strong className="text-sky-750 font-black">{selectedEmployeeProfile.fullName}</strong> ({selectedEmployeeProfile.jobTitle})
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedEmployeeProfile(null);
                          setSelectedCompForMitigation(null);
                        }}
                        className="text-[10px] font-mono text-slate-400 hover:text-slate-600 font-bold border border-slate-200 bg-white shadow-3xs px-2 py-1 rounded cursor-pointer"
                      >
                        ✕ Close Audit
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                      {selectedEmployeeProfile.profile?.map((item: any) => {
                        const hasGap = item.gap > 0;
                        const isUnderMitigation = selectedCompForMitigation?.id === item.competency.id;

                        return (
                          <div 
                            key={item.competency.id} 
                            className={`p-3.5 rounded-xl border transition-all ${
                              isUnderMitigation 
                                ? "bg-sky-50 border-sky-600 ring-2 ring-sky-300/30" 
                                : "bg-white border-slate-200 hover:border-slate-300"
                            } flex flex-col justify-between`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-start gap-2">
                                <span className="text-[9px] font-mono font-extrabold text-sky-600 bg-sky-50 border border-sky-100 px-1.5 py-0.5 rounded">
                                  #{item.competency.code}
                                </span>
                                {hasGap ? (
                                  <span className="shrink-0 px-2 py-0.5 font-mono text-[9px] font-black bg-rose-50 text-rose-600 rounded">
                                    GAP: -{item.gap}
                                  </span>
                                ) : (
                                  <span className="shrink-0 px-2 py-0.5 font-mono text-[9px] bg-emerald-50 text-emerald-600 rounded font-bold uppercase tracking-wider">
                                    CLEAR
                                  </span>
                                )}
                              </div>
                              <h5 className="font-sans font-bold text-slate-900 text-xs">{item.competency.name}</h5>
                              <p className="text-[10px] text-slate-500 leading-normal line-clamp-2">{item.competency.description}</p>
                            </div>

                            <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[9.5px] font-mono text-slate-405">
                                {item.currentLevel}/{item.requiredLevel} Level
                              </span>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCompForMitigation(item.competency);
                                  setMitigationEmployeeId(selectedEmployeeProfile.id);
                                  setMitigationStep("explain");
                                  setQuizIndex(0);
                                  setQuizAnswers({});
                                  setQuizFinished(false);
                                  setQuizResult(null);
                                }}
                                className="bg-sky-600 hover:bg-sky-700 text-white font-mono font-bold text-[10px] py-1 px-3 rounded flex items-center gap-1 cursor-pointer transition-all shadow-3xs"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>Mitigation Guide &rarr;</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: "No Map ahead" focused Workspace */}
              {selectedCompForMitigation && (
                <div className="lg:col-span-12 xl:col-span-5 bg-gradient-to-br from-slate-900 to-indigo-950 border border-indigo-900 rounded-xl p-5 text-white space-y-4 shadow-md animate-slideIn">
                  
                  {/* Top segment */}
                  <div className="flex justify-between items-start pb-3 border-b border-indigo-900">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono font-extrabold text-sky-400 bg-sky-950/80 border border-sky-800/40 px-2.5 py-0.5 rounded tracking-widest uppercase">
                        Active Skill Healer Manual ({selectedCompForMitigation.code})
                      </span>
                      <h4 className="text-sm font-sans font-black text-slate-100">{selectedCompForMitigation.name}</h4>
                    </div>
                    <button
                      onClick={() => setSelectedCompForMitigation(null)}
                      className="text-[10px] font-mono text-indigo-300 hover:text-white border border-indigo-805 bg-indigo-950/60 px-2 py-0.5 rounded uppercase"
                    >
                      ✕ Close
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-350 leading-normal">
                    This operator holds a critical competency gap with no standard online training blueprint assigned. Resolve this gap using the live handbooks, expertise channels, and testing logs below.
                  </p>

                  {/* Horizontal modular navigation steps buttons */}
                  <div className="grid grid-cols-5 gap-1 bg-slate-950/80 p-1 rounded-lg border border-indigo-900/60 text-center font-mono text-[9px] font-bold">
                    <button
                      onClick={() => setMitigationStep("explain")}
                      className={`py-1.5 rounded transition-all cursor-pointer ${mitigationStep === "explain" ? "bg-sky-600 text-white" : "text-slate-40 transition-colors hover:text-slate-200"}`}
                      title="Direct concept definitions"
                    >
                      💡 Explain
                    </button>
                    <button
                      onClick={() => setMitigationStep("pdf")}
                      className={`py-1.5 rounded transition-all cursor-pointer ${mitigationStep === "pdf" ? "bg-sky-600 text-white" : "text-slate-40 transition-colors hover:text-slate-200"}`}
                      title="Study manuals and checksheets"
                    >
                      📄 PDF Guide
                    </button>
                    <button
                      onClick={() => setMitigationStep("links")}
                      className={`py-1.5 rounded transition-all cursor-pointer ${mitigationStep === "links" ? "bg-sky-600 text-white" : "text-slate-40 transition-colors hover:text-slate-200"}`}
                      title="External references"
                    >
                      🌐 Links
                    </button>
                    <button
                      onClick={() => setMitigationStep("experts")}
                      className={`py-1.5 rounded transition-all cursor-pointer ${mitigationStep === "experts" ? "bg-sky-600 text-white" : "text-slate-40 transition-colors hover:text-slate-200"}`}
                      title="Dedicated coaches matchmaking"
                    >
                      👥 Experts
                    </button>
                    <button
                      onClick={() => setMitigationStep("quiz")}
                      className={`py-1.5 rounded transition-all cursor-pointer relative ${mitigationStep === "quiz" ? "bg-sky-600 text-white" : "text-slate-40 transition-colors hover:text-slate-200"}`}
                      title="Take 10-questions check"
                    >
                      🧪 Quiz
                    </button>
                  </div>

                  {/* Workspace Render */}
                  <div className="bg-slate-950/50 border border-indigo-900/40 rounded-xl p-4 min-h-[300px]">
                    
                    {/* Step 1: Explain direct topic definitions */}
                    {mitigationStep === "explain" && (
                      <div className="space-y-3 font-sans animate-fadeIn">
                        <div className="flex items-center gap-1.5 text-sky-400 font-mono font-bold text-[10px]">
                          <BookOpen className="w-4 h-4 text-sky-400 shrink-0" />
                          <span>MEMBER TRAINING: LIVE EXPLANATION</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed text-[11px]">
                          Explain this standard metallurgical/safety operation visually to the technician. This contains the concept essentials formatted for quick shift delivery.
                        </p>
                        
                        <div className="bg-indigo-950/80 p-3 rounded-lg border border-indigo-900 space-y-1">
                          <h6 className="font-bold text-[10px] font-mono text-sky-300 uppercase">Core Operations Summary:</h6>
                          <p className="text-slate-200 text-xs italic font-serif">
                            "{selectedCompForMitigation.description}"
                          </p>
                        </div>

                        <div className="space-y-2 border-t border-indigo-950 pt-2.5">
                          <p className="font-bold text-slate-100 text-[10px] uppercase font-mono tracking-wider">Concept Study Guidelines:</p>
                          <ul className="list-disc pl-4 text-slate-305 text-[11px] space-y-1">
                            <li><strong>Pre-operational parameters:</strong> Consult gauges in shift records to establish starting bounds.</li>
                            <li><strong>Mitigation tools:</strong> Utilize positive air pressure lines, secure gas interlocking sensors, and thermal masks.</li>
                            <li><strong>Supervisor checkpoint rules:</strong> Complete shift buddy verification loops before line activation.</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Simulated Plant PDF Manual */}
                    {mitigationStep === "pdf" && (
                      <div className="space-y-4 animate-fadeIn font-sans">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-black text-rose-400 bg-rose-950/60 border border-rose-900/60 px-2 py-0.5 rounded">
                            DOCUMENT: SOP-REF-{selectedCompForMitigation.code}
                          </span>
                          <button
                            onClick={() => alert(`Simulating print of handbook 'SOP-REF-${selectedCompForMitigation.code}.pdf'`)}
                            className="bg-indigo-900 hover:bg-indigo-800 text-[10px] font-mono text-indigo-300 px-2 py-1 rounded flex items-center gap-1 transition-all"
                          >
                            <FileText className="w-3.5 h-3.5 text-rose-400" />
                            <span>Download PDF</span>
                          </button>
                        </div>

                        {/* Interactive Simulated Plant Checklist Document */}
                        <div className="bg-white text-slate-900 p-4 rounded-lg shadow-inner font-mono text-[10.5px] border-l-4 border-rose-500 space-y-3">
                          <div className="text-center border-b border-dashed border-slate-300 pb-2 text-slate-500">
                            <strong className="block text-slate-800 text-[11px]">SARATHI METALLICS QUALITY STANDARDS</strong>
                            <span>Shift floor handbook check sheets v4.12</span>
                          </div>

                          <div className="space-y-2">
                            <p className="font-black text-slate-900">SOP CRITICAL SAFETY CHECKPOINTS:</p>
                            <p>1. [ ] Check dual pressure sealings of refractory conduits.</p>
                            <p>2. [ ] Warm heater manifolds for at least 30 minutes minimum.</p>
                            <p>3. [ ] Verify argon balance purge rate stays positive.</p>
                            <p>4. [ ] In case of thermal drop, alert Control operations Desk instantly.</p>
                          </div>

                          <div className="pt-2 text-center text-slate-400 border-t border-dashed border-slate-200 text-[9px]">
                            <span>VALIDATED: PLANT OPERATIONS DIRECTIVE &copy; 2026</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Real external working reference links */}
                    {mitigationStep === "links" && (
                      <div className="space-y-4 text-xs font-sans animate-fadeIn">
                        <div className="space-y-1">
                          <h6 className="font-bold text-sky-400 font-mono text-[10px] uppercase">External Industrial Working Links</h6>
                          <p className="text-slate-400 text-[11px]">Consult standard public working databases, process manuals, and steel standards to study theoretical bounds.</p>
                        </div>

                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          <a 
                            href="https://www.osha.gov" 
                            target="_blank" 
                            rel="noreferrer" 
                            className="bg-slate-900 border border-slate-800 hover:border-sky-500 p-3 rounded-lg flex items-center justify-between text-slate-200 transition-colors cursor-pointer group"
                          >
                            <div className="space-y-0.5">
                              <span className="font-bold block group-hover:text-sky-400">OSHA Safety & Hazard Database</span>
                              <span className="text-[10px] text-slate-400 block font-mono">https://www.osha.gov</span>
                            </div>
                            <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-sky-450" />
                          </a>

                          <a 
                            href="https://www.steeluniversity.org" 
                            target="_blank" 
                            rel="noreferrer" 
                            className="bg-slate-900 border border-slate-800 hover:border-sky-500 p-3 rounded-lg flex items-center justify-between text-slate-200 transition-colors cursor-pointer group"
                          >
                            <div className="space-y-0.5">
                              <span className="font-bold block group-hover:text-sky-400">SteelUniversity Caster Training Hub</span>
                              <span className="text-[10px] text-slate-400 block font-mono">https://www.steeluniversity.org</span>
                            </div>
                            <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-sky-450" />
                          </a>

                          <a 
                            href="https://www.astm.org" 
                            target="_blank" 
                            rel="noreferrer" 
                            className="bg-slate-900 border border-slate-800 hover:border-sky-500 p-3 rounded-lg flex items-center justify-between text-slate-200 transition-colors cursor-pointer group"
                          >
                            <div className="space-y-0.5">
                              <span className="font-bold block group-hover:text-sky-400">ASTM Microstructural Properties Database</span>
                              <span className="text-[10px] text-slate-400 block font-mono">https://www.astm.org</span>
                            </div>
                            <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-sky-450" />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Expert guides matchmaking search options */}
                    {mitigationStep === "experts" && (
                      <div className="space-y-3 font-sans animate-fadeIn">
                        <div className="space-y-1">
                          <h6 className="font-bold text-sky-400 font-mono text-[10px] uppercase">Senior Peer Expert Matchmakers</h6>
                          <p className="text-slate-400 text-[11px]">The following senior workers in the shift possess full mastery of this competency. Allocate physical mentoring sessions to assist the candidate.</p>
                        </div>

                        <div className="space-y-2 max-h-56 overflow-y-auto">
                          {team.filter(u => {
                            const hasMasteredComp = u.skills?.some((s: any) => s.competencyId === selectedCompForMitigation.id && s.level >= 4);
                            return u.role === "employee" && u.id !== mitigationEmployeeId && hasMasteredComp;
                          }).map(expert => (
                            <div key={expert.id} className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-100 block text-xs">{expert.fullName} (Rank #{expert.wri}% WRI)</span>
                                <span className="text-[9.5px] font-mono text-sky-400 uppercase tracking-widest">{expert.jobTitle}</span>
                              </div>
                              <button
                                onClick={() => {
                                  alert(`Assigning offline shift mentoring tutorial with expert coach: ${expert.fullName}`);
                                }}
                                className="bg-sky-600 hover:bg-sky-500 text-[10px] text-white font-mono font-bold py-1 px-2.5 rounded transition-all shrink-0 cursor-pointer"
                              >
                                Request Mentoring Guide
                              </button>
                            </div>
                          ))}

                          {team.filter(u => {
                            const hasMasteredComp = u.skills?.some((s: any) => s.competencyId === selectedCompForMitigation.id && s.level >= 4);
                            return u.role === "employee" && u.id !== mitigationEmployeeId && hasMasteredComp;
                          }).length === 0 && (
                            <p className="text-center py-8 text-slate-550 font-mono text-[10px]">No peer certified senior operator is currently assigned in this shift block. Search other departments or run custom studies.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Step 5: Completed Option -> 10 Questions Assessment! */}
                    {mitigationStep === "quiz" && (
                      <div className="space-y-3.5 text-slate-100 font-sans animate-fadeIn">
                        
                        {!quizFinished ? (
                          <div className="space-y-4">
                            
                            {/* Quiz headers */}
                            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 pb-2 border-b border-indigo-900">
                              <span>SOP CERTIFICATION FOR: Operators</span>
                              <span className="font-bold text-[#0284C7]">QUESTION {quizIndex + 1} OF 10</span>
                            </div>

                            {/* Crisp progress slider bar */}
                            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-indigo-950">
                              <div className="bg-sky-500 h-full transition-all" style={{ width: `${((quizIndex + 1) / 10) * 100}%` }}></div>
                            </div>

                            <p className="font-bold text-xs leading-relaxed text-slate-100">
                              {getTenQuestions(selectedCompForMitigation.id, selectedCompForMitigation.name)[quizIndex].questionText}
                            </p>

                            <div className="space-y-2">
                              {getTenQuestions(selectedCompForMitigation.id, selectedCompForMitigation.name)[quizIndex].options.map((opt, oIdx) => {
                                const isSelected = quizAnswers[quizIndex] === oIdx;
                                return (
                                  <button
                                    key={oIdx}
                                    onClick={() => setQuizAnswers(prev => ({ ...prev, [quizIndex]: oIdx }))}
                                    className={`w-full p-2.5 rounded-lg border text-left text-[11px] block transition-all cursor-pointer ${
                                      isSelected 
                                        ? "bg-sky-600/30 border-sky-500 text-white font-bold" 
                                        : "bg-slate-900 border-slate-800 hover:bg-slate-850 text-slate-200"
                                    }`}
                                  >
                                    <span className="font-mono text-[10px] font-bold text-sky-400 mr-2 uppercase bg-slate-950 px-1.5 py-0.5 rounded border border-indigo-900/60 inline-block min-w-[20px] text-center">
                                      {String.fromCharCode(65 + oIdx)}
                                    </span>
                                    <span>{opt}</span>
                                  </button>
                                );
                              })}
                            </div>

                            <div className="flex justify-between items-center pt-3 border-t border-indigo-900">
                              <button
                                onClick={() => setQuizIndex(prev => Math.max(0, prev - 1))}
                                disabled={quizIndex === 0}
                                className="bg-slate-900 hover:bg-slate-800 text-slate-400 text-[10px] py-1 px-3 rounded border border-slate-800 disabled:opacity-40"
                              >
                                &larr; Prev
                              </button>

                              {quizAnswers[quizIndex] === undefined ? (
                                <span className="text-[10px] font-mono text-rose-400">Select a response to proceed</span>
                              ) : quizIndex < 9 ? (
                                <button
                                  onClick={() => setQuizIndex(prev => prev + 1)}
                                  className="bg-sky-600 hover:bg-sky-500 text-white font-mono font-bold text-[10px] py-1 px-4 rounded uppercase"
                                >
                                  Next question &rarr;
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    // Process Score out of 10
                                    let correctSum = 0;
                                    const qSource = getTenQuestions(selectedCompForMitigation.id, selectedCompForMitigation.name);
                                    qSource.forEach((q, i) => {
                                      if (quizAnswers[i] === q.correctAnswerIdx) {
                                        correctSum += 1;
                                      }
                                    });
                                    const passState = correctSum >= 7; // Needs at least 70% to pass
                                    handleQuizSubmit(correctSum, passState);
                                  }}
                                  disabled={quizSubmitting}
                                  className="bg-emerald-600 hover:bg-emerald-555 text-white font-mono font-black text-[10px] py-1.5 px-5 rounded uppercase shadow-sm"
                                >
                                  {quizSubmitting ? "Submitting..." : "Submit evaluation ✓"}
                                </button>
                              )}
                            </div>

                          </div>
                        ) : (
                          <div className="space-y-4 text-center py-6 animate-scaleUp">
                            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center border-4 border-indigo-900 bg-slate-900">
                              {quizResult?.passed ? (
                                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                              ) : (
                                <AlertTriangle className="w-10 h-10 text-rose-500" />
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <h5 className="font-sans font-black text-sm">ASSESSMENT REPORT COMPLETED</h5>
                              <p className="text-slate-400 text-xs">Operator Evaluated: <strong>{selectedEmployeeProfile?.fullName}</strong></p>
                              <p className="text-xl font-mono font-black tracking-widest text-[#0284C7] bg-slate-900 inline-block px-4 py-1.5 rounded border border-indigo-900">
                                SCORE: {quizResult?.score} / 10 ({quizResult?.score ? quizResult.score * 10 : 0}%)
                              </p>
                            </div>

                            <p className="text-[11px] text-slate-350 leading-normal max-w-sm mx-auto">
                              {quizResult?.passed 
                                ? "GREAT SUCCESS! The technician has met the compliance guidelines. The skill gap rating in their profile has automatically updated to 5/5, instantly restoring department readiness metrics." 
                                : "The technician was unable to satisfy the passing standard of 7 correct answers. Re-study the core standard manuals and trial again."
                              }
                            </p>

                            <div className="pt-4 flex gap-2 justify-center max-w-md mx-auto">
                              {!quizResult?.passed && (
                                <button
                                  onClick={() => {
                                    setQuizIndex(0);
                                    setQuizAnswers({});
                                    setQuizFinished(false);
                                    setQuizResult(null);
                                  }}
                                  className="bg-sky-600 hover:bg-sky-505 text-white font-mono text-[10px] font-bold py-2 px-5 rounded uppercase cursor-pointer"
                                >
                                  Retry Evaluation
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedCompForMitigation(null);
                                  setSelectedEmployeeProfile(null);
                                }}
                                className="bg-white hover:bg-slate-100 text-slate-800 font-mono text-[10px] py-2 px-5 rounded uppercase tracking-wider border border-slate-300"
                              >
                                Close Workspace
                              </button>
                            </div>

                          </div>
                        )}

                      </div>
                    )}

                  </div>

                </div>
              )}

            </div>
          )}

          {/* 💼 segment 2: Department and Teams Health Diagnostics */}
          {activeSubTab === "department" && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Department executive aggregate view */}
              {hawkeyeData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Department aggregates metrics */}
                  <div className="bg-white border border-slate-205 p-5 rounded-xl space-y-4 shadow-sm">
                    <h3 className="text-sm font-sans font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-sky-600" />
                      Department Readiness Dials
                    </h3>
                    <p className="text-xs text-slate-505 font-sans">Overview of certified readiness metrics by plant subdivision departments.</p>

                    <div className="space-y-3.5 pt-2.5">
                      {hawkeyeData.departments?.map((dept: any, index: number) => (
                        <div key={index} className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800 text-xs">{dept.department}</span>
                            <span className="font-mono text-xs font-black text-[#0284C7] bg-sky-50 border border-sky-100 px-2 py-0.5 rounded">
                              WRI Index: {dept.avgWri}%
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 font-mono">
                            <span>Headcount: {dept.headcount}</span>
                            <span>Finished Modules: {dept.totalCompletions}</span>
                            <span className="text-right">Risk Warning: None</span>
                          </div>

                          <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden border border-slate-200 mt-1">
                            <div className="bg-[#0284C7] h-full" style={{ width: `${dept.avgWri}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Teams / Roles capability indexes */}
                  <div className="bg-white border border-slate-205 p-5 rounded-xl space-y-4 shadow-sm">
                    <h3 className="text-sm font-sans font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-sky-600" />
                      Shift Teams Capability Analysis
                    </h3>
                    <p className="text-xs text-slate-505 font-sans">Metrics mapping of functional shift operator groups under your supervision.</p>

                    <div className="space-y-3.5 pt-2.5">
                      {hawkeyeData.teams?.map((t: any, index: number) => (
                        <div key={index} className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800 text-xs">{t.roleName} team</span>
                            <span className="font-mono text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">
                              WRI: {t.avgWri}%
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-500">
                            <span>Coached Crew Size: {t.headcount}</span>
                            <span>SOP checkoffs: {t.totalCompletions}</span>
                          </div>

                          <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden border border-slate-200 mt-1">
                            <div className="bg-amber-500 h-full" style={{ width: `${t.avgWri}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* 💼 segment 3: Retirement Repository Access to check & assign */}
          {activeSubTab === "retirement" && (
            <div className="space-y-5 animate-fadeIn">
              
              <div className="bg-white border border-slate-205 p-5 rounded-xl space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-3">
                  <div>
                    <h3 className="text-sm font-sans font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-sky-600" />
                      Elder Worker Transition & Retirement Repository
                    </h3>
                    <p className="text-[11.5px] text-slate-500 leading-relaxed max-w-2xl">
                      Audit senior plant experts (experience {">="} 15 years) nearing retirement. Assign custom wisdom-capture assessments to compile their years of shift mechanical insights into permanent digital SOPs.
                    </p>
                  </div>
                </div>

                {/* Retiree list */}
                {hawkeyeData && hawkeyeData.retirementRepository && (
                  <div className="space-y-3.5 pt-1">
                    {hawkeyeData.retirementRepository.map((retiree: any) => (
                      <div key={retiree.id} className="bg-slate-50 p-4 border border-slate-200 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1.5 max-w-xl">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-pink-500 animate-pulse"></span>
                            <span className="font-extrabold text-slate-800 text-sm block">{retiree.fullName}</span>
                            <span className="text-[9px] font-mono text-pink-600 bg-pink-50 border border-pink-100 px-2 py-0.5 rounded font-black tracking-widest uppercase">
                              RETIREMENT REPOSITORY WINDOW
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-[11px] font-mono text-slate-500 leading-normal">
                            <span>Job Role: <strong className="text-slate-800">{retiree.jobTitle}</strong></span>
                            <span>Plant Department: <strong className="text-slate-800">{retiree.department}</strong></span>
                            <span>Shift Tenure: <strong className="text-slate-800">{retiree.experienceYrs} Years Duty</strong></span>
                            <span>Legacy SOPs Transmitted: <strong className="text-sky-750">{retiree.completedSOPs} Manuals</strong></span>
                          </div>

                          {/* Render prior captured wisdom audits */}
                          {retiree.wisdomReports && retiree.wisdomReports.length > 0 && (
                            <div className="mt-3 pt-2 border-t border-slate-150 text-[10px] space-y-1.5 font-mono">
                              <span className="text-slate-400 uppercase tracking-wider font-bold">Captured Transition Wisdom Reports:</span>
                              <div className="space-y-1 max-h-24 overflow-y-auto">
                                {retiree.wisdomReports.map((report: any) => (
                                  <div key={report.id} className="flex justify-between items-center p-1 px-2.5 bg-emerald-50 border border-emerald-150 rounded">
                                    <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      {report.title}
                                    </span>
                                    <span className="text-slate-550 font-bold">Passed (WRI Score: {report.score}%)</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="shrink-0 flex flex-col items-stretch gap-2 w-full md:w-auto">
                          <div className="text-center font-mono py-1 px-3 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded text-[9.5px] font-bold">
                            Wisdom captured: {retiree.wisdomCaptured ? "✓ MET" : "🚨 UNCAPTURED GAP"}
                          </div>

                          <button
                            onClick={() => {
                              setActiveRetiree(retiree);
                              setWisdomAssessTitle(`Legacy SOP Wisdom Audit: Continuous casting & emergency thermal vacuum protocols for SMS-2 floor by ${retiree.fullName}`);
                              setRetirementModalOpen(true);
                              setWisdomSuccess("");
                            }}
                            className="bg-sky-600 hover:bg-sky-500 text-white font-sans font-bold text-xs py-2 px-4 rounded transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <PlusCircle className="w-4 h-4" />
                            <span>Assign Transition Wisdom Audit</span>
                          </button>
                        </div>
                      </div>
                    ))}

                    {hawkeyeData.retirementRepository.length === 0 && (
                      <p className="text-center py-10 font-mono text-slate-400 text-xs">No senior operators on duty are nearing the retirement tenure window ({">="} 15 years tenure) in this shift segment.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Wisdom assessment author assign wizard widget */}
              {retirementModalOpen && activeRetiree && (
                <div className="bg-slate-900 border border-slate-700 p-5 rounded-xl space-y-4 text-white animate-fadeIn">
                  <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-3">
                    <span className="font-sans font-black flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-sky-400" />
                      Author Retirement Wisdom-Capture Assessment Matrix
                    </span>
                    <button
                      onClick={() => {
                        setRetirementModalOpen(false);
                        setActiveRetiree(null);
                      }}
                      className="text-slate-400 hover:text-white font-mono text-xs cursor-pointer border border-slate-700 px-2 py-0.5 rounded"
                    >
                      ✕ Close Wizard
                    </button>
                  </div>

                  <form onSubmit={handleWisdomAssessSubmit} className="space-y-4">
                    
                    {wisdomSuccess && (
                      <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-lg text-xs text-emerald-800 font-bold mb-2">
                        {wisdomSuccess}
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-400 block uppercase">Draft Assessment Title descriptor</label>
                      <input
                        type="text"
                        value={wisdomAssessTitle}
                        onChange={(e) => setWisdomAssessTitle(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-sans focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                        placeholder="Define audit title..."
                      />
                    </div>

                    <div className="space-y-2.5">
                      <label className="text-[10px] font-mono text-slate-400 block uppercase">Configured Elder Wisdom evaluation questions list (MCQs)</label>
                      <div className="space-y-3 bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs">
                        {wisdomQuestions.map((q, i) => (
                          <div key={i} className="space-y-2 pb-3 border-b border-slate-800/65 last:border-0 last:pb-0 font-sans">
                            <p className="font-bold font-mono text-sky-450">Question {i + 1}: {q.questionText}</p>
                            <ul className="list-disc pl-4 text-slate-300 space-y-1 text-[11px]">
                              {q.options.map((opt: string, idx: number) => (
                                <li key={idx} className={idx === q.correctAnswerIdx ? "text-emerald-400 font-bold underline" : ""}>
                                  {opt} {idx === q.correctAnswerIdx ? " (Correct Answer)" : ""}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setRetirementModalOpen(false);
                          setActiveRetiree(null);
                        }}
                        className="bg-slate-800 hover:bg-slate-750 font-mono text-xs px-4 py-2 rounded text-slate-350 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold font-sans px-5 py-2 rounded transition-colors uppercase cursor-pointer"
                      >
                        Publish & Assign Audit ✓
                      </button>
                    </div>

                  </form>
                </div>
              )}

            </div>
          )}

          {/* 💼 segment 4: L&D Connect station intervention dispatch */}
          {activeSubTab === "connect" && (
            <div className="space-y-5 animate-fadeIn">
              
              <div className="bg-white border border-slate-205 p-5 rounded-xl space-y-4 shadow-sm">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-sans font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Send className="w-4 h-4 text-sky-600" />
                    Operational L&D Connect Station
                  </h3>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed">
                    Bridge key communication and structural gaps under your shift. Dispatch real-time directives, hazard safety warnings, or mandatory training module assignments to any crew member, team, or the overall department.
                  </p>
                </div>

                <form onSubmit={handleConnectSubmit} className="space-y-4">
                  {connectSuccess && (
                     <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-lg text-xs text-emerald-850 font-bold">
                       {connectSuccess}
                     </div>
                  )}

                  {connectError && (
                    <div className="bg-rose-50 border border-rose-300 p-4 rounded-lg text-xs text-rose-800 font-bold">
                      {connectError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
                    
                    <div className="space-y-1.5 text-xs">
                      <label className="text-[10.5px] font-mono text-slate-500 uppercase font-bold">1. Target Audience Scope</label>
                      <select
                        value={connectTargetType}
                        onChange={(e: any) => {
                          setConnectTargetType(e.target.value);
                          setConnectTargetId("");
                        }}
                        className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                      >
                        <option value="employee">Single Crew Member (Operator)</option>
                        <option value="team">Specific Shift Team (Job Title)</option>
                        <option value="department">Entire Plant Department</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <label className="text-[10.5px] font-mono text-slate-500 uppercase font-bold">2. Select Target Destination</label>
                      <select
                        value={connectTargetId}
                        onChange={(e) => setConnectTargetId(e.target.value)}
                        className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                      >
                        <option value="">-- Choose recipient scope --</option>
                        {connectTargetType === "employee" && team.map(u => (
                          <option key={u.id} value={u.id}>{u.fullName} ({u.jobTitle})</option>
                        ))}
                        {connectTargetType === "team" && hawkeyeData?.teams?.map((t: any, i: number) => (
                          <option key={i} value={t.roleName}>{t.roleName} team</option>
                        ))}
                        {connectTargetType === "department" && hawkeyeData?.departments?.map((d: any, i: number) => (
                          <option key={i} value={d.department}>{d.department} Division</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <label className="text-[10.5px] font-mono text-slate-500 uppercase font-bold">3. Priority level</label>
                      <select
                        value={connectType}
                        onChange={(e: any) => setConnectType(e.target.value)}
                        className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                      >
                        <option value="info">💡 Standard Informational Notice</option>
                        <option value="warning">🚨 Safety Alert Directive (Emergency)</option>
                        <option value="assign">📚 Assign Blueprint Module</option>
                      </select>
                    </div>

                  </div>

                  {connectType === "assign" && (
                    <div className="space-y-1.5 animate-fadeIn font-sans text-xs">
                      <label className="text-[10.5px] font-mono text-slate-500 uppercase font-extrabold">Assign priority learning module</label>
                      <select
                        value={connectSelectedModule}
                        onChange={(e) => setConnectSelectedModule(e.target.value)}
                        className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                      >
                        <option value="">-- Select priority manual modules blueprint --</option>
                        {myLearning.map(m => (
                          <option key={m.id} value={m.id}>[Estimated: {m.estimatedMinutes} Mins] {m.title} (#{m.id})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5 font-sans text-xs">
                    <label className="text-[10.5px] font-mono text-slate-500 uppercase font-bold">Directive message details</label>
                    <textarea
                      value={connectMsg}
                      onChange={(e) => setConnectMsg(e.target.value)}
                      rows={4}
                      className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:ring-2 focus:ring-sky-500 rounded-lg p-3 text-xs focus:outline-hidden"
                      placeholder="Type priority directives details here... e.g., 'Due to vacuum gauge anomaly at SMS-2 floor, verify sliding-gate valve purging settings immediately.'"
                    />
                  </div>

                  <button
                    type="submit"
                    className="bg-sky-600 hover:bg-sky-500 text-white font-sans font-bold text-xs py-2.5 px-6 rounded-lg transition-all shadow-3xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    <span>Dispatch Connect Intervention Directive &rarr;</span>
                  </button>

                </form>
              </div>

            </div>
          )}

          {/* 💼 segment 5: Expert Mentors Queue approvals */}
          {activeSubTab === "mentors" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn items-start">
              
              {/* Nominations approvals queue list */}
              <div className="lg:col-span-6 bg-white border border-slate-205 rounded-xl p-5 space-y-4 shadow-sm">
                <h4 className="text-xs font-sans font-extrabold text-slate-800 uppercase tracking-widest pb-2 border-b border-slate-100">
                  ⚔️ Expert Mentors Self-Nominations Queue
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                  Highly proficient veterans self-nominate to act as on-site shift coaches. Authorize credentials to register them on the matchmaking directories.
                </p>

                <div className="space-y-3 pt-1">
                  {nominations.filter(n => n.nomination.status === "pending").map((nom) => (
                    <div key={nom.nomination.id} className="bg-slate-50 border border-slate-202 p-4.5 rounded-xl space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <strong className="block font-black text-slate-800 text-xs">{nom.employeeName || nom.user?.fullName}</strong>
                          <span className="text-[10px] font-mono text-[#0284C7] bg-sky-50 border border-sky-100 px-1.5 py-0.5 rounded font-black uppercase">
                            EXP: {nom.nomination.yearsExp} Years
                          </span>
                        </div>
                        <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-[#FAF5FF] border border-[#E9D5FF] text-[#A855F7] rounded animate-pulse">
                          Awaiting authorization
                        </span>
                      </div>

                      <div className="space-y-1.5 text-[10.5px]">
                        <span className="text-slate-400 block font-mono text-[9px]">NOMINATED SKILLSETS:</span>
                        <div className="flex flex-wrap gap-1">
                          {nom.competenciesDetail.map((c: any) => (
                            <span key={c.id} className="inline-block px-1.5 py-0.5 text-[9px] font-mono bg-sky-50 border border-sky-100 text-[#0284C7] rounded">
                              #{c.code}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-slate-200">
                        <button
                          onClick={() => handleApproveNomination(nom.nomination.id, "approved")}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold text-[10px] py-1.5 rounded transition-colors uppercase cursor-pointer"
                        >
                          Authorize
                        </button>
                        <button
                          onClick={() => handleApproveNomination(nom.nomination.id, "rejected")}
                          className="flex-1 bg-white hover:bg-slate-105 text-slate-600 font-sans text-[10px] py-1.5 rounded transition-colors uppercase border border-slate-200 cursor-pointer"
                        >
                          Refuse
                        </button>
                      </div>
                    </div>
                  ))}

                  {nominations.filter(n => n.nomination.status === "pending").length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-[11px] text-slate-400 font-mono">Pending authorization queue is completely cleared.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Plant live mentoring session activities log */}
              <div className="lg:col-span-6 bg-white border border-slate-205 rounded-xl p-5 space-y-4 shadow-sm">
                <h4 className="text-xs font-sans font-extrabold text-slate-800 uppercase tracking-widest pb-2 border-b border-slate-100">
                  📋 Live Mentoring Logs
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                  Real-time status of shift tutorials and legacy knowledge captures mapped on-site.
                </p>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {sessions.map((sess) => (
                    <div key={sess.session.id} className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1.5 text-[11px] font-sans">
                      <div className="flex justify-between items-center text-slate-505 font-mono text-[9px]">
                        <span className="font-bold text-[#0284C7]">Coach: {sess.mentorName}</span>
                        <span>{new Date(sess.session.scheduledAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-800 font-bold">Trainee operator: {sess.employeeName}</p>
                      <p className="text-slate-605 font-serif whitespace-pre-wrap italic leading-relaxed text-[10.5px]">Notes: "{sess.session.sessionNotes}"</p>
                      {sess.session.capturedKnowledge && (
                        <div className="mt-2 p-1.5 bg-emerald-50 text-[9.5px] rounded border border-emerald-150 text-emerald-700 font-mono font-bold flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                          <span>Published SOP Manual mapped.</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {sessions.length === 0 && (
                    <p className="text-[11px] text-center text-slate-400 font-mono py-10">No mentoring logs captured yet in history.</p>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}

function ChevronIndicator({ trend }: { trend: "up" | "down" }) {
  return (
    <span className="font-mono text-[9px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1 py-0.5 rounded uppercase">
      ▲ REGULAR
    </span>
  );
}
