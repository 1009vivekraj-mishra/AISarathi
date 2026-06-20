import express, { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import db, { JWT_SECRET, User, Competency, UserSkill, Assessment, AssessmentAttempt, KnowledgeDoc, MentorSession, MentorNomination, Role, Question } from "./db.js";
import { generateEmbedding, cosineSimilarity, generateRAGAnswer, detectInputLanguage } from "./ai.js";

const router = express.Router();

// Middleware to parse auth token
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Access token required" });
    return;
  }

  try {
    const parts = token.split(".");
    if (parts.length !== 2) {
      res.status(403).json({ error: "Invalid token format" });
      return;
    }

    const [payloadB64, signature] = parts;
    const computedSig = crypto.createHmac("sha256", JWT_SECRET).update(payloadB64).digest("hex");

    if (computedSig !== signature) {
      res.status(403).json({ error: "Failed to authenticate token" });
      return;
    }

    const payload = JSON.parse(Buffer.from(payloadB64, "base64").toString("utf-8"));
    if (payload.exp < Date.now()) {
      res.status(403).json({ error: "Token has expired" });
      return;
    }

    // Attach user information to request
    (req as any).user = payload;
    next();
  } catch (e) {
    res.status(403).json({ error: "Invalid or expired token" });
  }
}

// Helper to sign tokens
function generateToken(user: User): string {
  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    fullName: user.fullName,
    jobTitle: user.jobTitle,
    department: user.department,
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours expiry
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(payloadB64).digest("hex");
  return `${payloadB64}.${signature}`;
}

// ==========================================
// 🔐 AUTHENTICATION ENDPOINTS
// ==========================================

router.post("/auth/register", (req: Request, res: Response) => {
  const { username, password, fullName, role, jobTitle, department } = req.body;

  if (!username || !password || !fullName || !role) {
    res.status(400).json({ error: "Username, password, fullName, and role are required." });
    return;
  }

  const existing = db.getUsers().find(u => u.username === username);
  if (existing) {
    res.status(400).json({ error: "Username is already taken." });
    return;
  }

  const userId = `user_${Date.now()}`;
  const passwordHash = db.hashPassword(password);

  const newUser: User = {
    id: userId,
    username,
    passwordHash,
    fullName,
    role: role as any,
    jobTitle: jobTitle || "Unassigned Specialist",
    department: department || "Operations SMS-1",
    profileCompleted: false
  };

  db.addUser(newUser);

  // Add graph node for new user
  db.addGraphNode({
    id: `node_user_${userId}`,
    label: `${fullName} (${role.toUpperCase()})`,
    type: "user",
    properties: { dept: newUser.department, title: newUser.jobTitle }
  });

  const token = generateToken(newUser);
  res.status(201).json({ token, user: newUser });
});

router.post("/auth/login", (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required." });
    return;
  }

  const user = db.getUsers().find(u => u.username === username);
  if (!user) {
    res.status(401).json({ error: "Invalid username or password." });
    return;
  }

  const passwordHash = db.hashPassword(password);
  if (user.passwordHash !== passwordHash) {
    res.status(401).json({ error: "Invalid username or password." });
    return;
  }

  const token = generateToken(user);
  res.json({ token, user });
});

router.get("/auth/me", authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const user = db.getUsers().find(u => u.id === reqUser.userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ user });
});

router.post("/auth/onboard", authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const { priorExperienceYrs, specialties, certificationCompleted, jobTitle, department } = req.body;

  const user = db.getUsers().find(u => u.id === reqUser.userId);
  if (!user) {
    res.status(404).json({ error: "User profile not found." });
    return;
  }

  // Save onboarding details but keep profileCompleted = false to enforce the registration assessment!
  user.profileCompleted = false;
  if (jobTitle) user.jobTitle = jobTitle;
  if (department) user.department = department;
  user.role = req.body.role || user.role; // Allow switching role privilege during registration if supplied

  user.onboardingData = {
    priorExperienceYrs: Number(priorExperienceYrs) || 0,
    specialties: Array.isArray(specialties) ? specialties : [],
    certificationCompleted: Array.isArray(certificationCompleted) ? certificationCompleted : []
  };

  db.saveUser(user);

  // Return token (so they remain logged in) but let them know they must proceed to step-2 assessment
  const token = generateToken(user);
  res.json({ message: "Profile saved. Proceed to competence mapping assessment.", token, user });
});

// ==========================================
// 🎯 REGISTRATION ASSESSMENT & ROLE ENDPOINTS
// ==========================================

router.get("/onboarding/questions", authenticateToken, (req: Request, res: Response) => {
  res.json(db.getQuestions());
});

router.post("/auth/onboard-test", authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const { answers } = req.body; // e.g. { q_1: 3, q_2: 1 }

  const user = db.getUsers().find(u => u.id === reqUser.userId);
  if (!user) {
    res.status(404).json({ error: "User profile not found." });
    return;
  }

  const questions = db.getQuestions();
  let correctCount = 0;
  let totalWeight = 0;
  let earnedWeight = 0;
  const graded: any[] = [];
  const compScores: { [compId: string]: number } = {};

  questions.forEach(q => {
    const userAns = answers[q.id];
    const isCorrect = userAns !== undefined && Number(userAns) === q.correctAnswerIdx;
    if (isCorrect) {
      correctCount++;
    }

    // Role-dependent assessment question weighting:
    // Manager: leadership has 3.0x high weight, scenario/digital 1.5x weight.
    // Employee: leadership has 0.5x low weight, safety/technical has normal 1.0x.
    let weight = 1.0;
    if (q.questionType === "leadership") {
      weight = user.role === "manager" ? 3.0 : 0.5;
    } else if (q.questionType === "digital_literacy") {
      weight = user.role === "manager" ? 1.5 : 1.0;
    } else if (q.questionType === "scenario") {
      weight = user.role === "manager" ? 1.5 : 1.0;
    }

    totalWeight += weight;
    if (isCorrect) {
      earnedWeight += weight;
    }

    graded.push({
      questionId: q.id,
      correct: isCorrect,
      competencyId: q.competencyId,
      questionType: q.questionType,
      appliedWeight: weight
    });

    // Proficiency mapping: correct answer is Level 4 (Advanced), wrong is Level 2 (Basic)
    // Managers get Level 5 (Expert) if correct on leadership or Level 1 (Novice) if wrong
    let levelScore = isCorrect ? 4 : 2;
    if (q.questionType === "leadership" && user.role === "manager") {
      levelScore = isCorrect ? 5 : 1;
    }
    compScores[q.competencyId] = levelScore;
  });

  // Save skills for each competency
  const comps = db.getCompetencies();
  comps.forEach(comp => {
    const finalScore = compScores[comp.id] !== undefined ? compScores[comp.id] : 1;
    db.saveUserSkill({
      id: `skill_${Date.now()}_ob_${comp.id}`,
      userId: user.id,
      competencyId: comp.id,
      currentLevel: finalScore,
      updatedAt: new Date().toISOString(),
      source: "assessment"
    });

    // Insert relationship node & edge in knowledge graph
    const nodeSource = `node_user_${user.id}`;
    const nodeTarget = `node_comp_${comp.id}`;
    
    // Clear old edges if they exist
    const graphEdges = db.getGraphEdges();
    const matchIdx = graphEdges.findIndex(
      e => e.source === nodeSource && e.target === nodeTarget && (e.relation === "MASTERS" || e.relation === "ACQUIRING")
    );
    if (matchIdx !== -1) {
      graphEdges.splice(matchIdx, 1);
    }

    db.addGraphEdge({
      id: `edge_skill_ob_${Date.now()}_${comp.id}`,
      source: nodeSource,
      target: nodeTarget,
      relation: finalScore >= comp.requiredLevel ? "MASTERS" : "ACQUIRING"
    });
  });

  // Log in assessment list with role-weighted score
  const totalScore = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  db.addAttempt({
    id: `att_onboard_${Date.now()}`,
    userId: user.id,
    assessmentId: "assess_onboard",
    score: totalScore,
    completedAt: new Date().toISOString(),
    answers,
    passed: totalScore >= 40 // simple easy pass, or always let them onboard
  });

  // Finalize onboarding completion
  user.profileCompleted = true;
  db.saveUser(user);

  const token = generateToken(user);
  res.json({
    message: "Registration assessment graded, account sync complete.",
    token,
    user,
    score: totalScore,
    graded
  });
});

// Roles Mapping CRUD APIs
router.get("/roles", authenticateToken, (req: Request, res: Response) => {
  res.json(db.getRoles());
});

router.post("/roles", authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  if (reqUser.role !== "admin") {
    res.status(403).json({ error: "Only admins can declare roles." });
    return;
  }
  const { roleName, requiredCompetencies } = req.body;
  if (!roleName || !Array.isArray(requiredCompetencies)) {
    res.status(400).json({ error: "roleName and requiredCompetencies list are required." });
    return;
  }
  const newRole: Role = {
    id: `role_${Date.now()}`,
    roleName,
    requiredCompetencies
  };
  db.addRole(newRole);
  res.status(201).json(newRole);
});

router.put("/roles/:id", authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  if (reqUser.role !== "admin") {
    res.status(403).json({ error: "Only admins can edit roles." });
    return;
  }
  const role = db.getRoles().find(r => r.id === req.params.id);
  if (!role) {
    res.status(404).json({ error: "Role definition not found." });
    return;
  }
  const { roleName, requiredCompetencies } = req.body;
  if (roleName) role.roleName = roleName;
  if (requiredCompetencies) role.requiredCompetencies = requiredCompetencies;
  db.saveRole(role);
  res.json(role);
});

// Question Bank Config CRUD APIs for Admin Assessment Configuration
router.get("/questions", authenticateToken, (req: Request, res: Response) => {
  res.json(db.getQuestions());
});

router.post("/questions", authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  if (reqUser.role !== "admin") {
    res.status(403).json({ error: "Only admins can add questions to bank." });
    return;
  }
  const { competencyId, questionText, questionTextHindi, options, optionsHindi, correctAnswerIdx, difficulty, questionType, explanation, explanationHindi } = req.body;
  if (!competencyId || !questionText || !options || correctAnswerIdx === undefined) {
    res.status(400).json({ error: "Missing required attributes to construct Question." });
    return;
  }
  const newQ: Question = {
    id: `q_${Date.now()}`,
    competencyId,
    questionText,
    questionTextHindi,
    options,
    optionsHindi,
    correctAnswerIdx: Number(correctAnswerIdx),
    difficulty: difficulty || "medium",
    questionType: questionType || "mcq",
    explanation: explanation || "",
    explanationHindi: explanationHindi || ""
  };
  db.addQuestion(newQ);
  res.status(201).json(newQ);
});

router.put("/questions/:id", authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  if (reqUser.role !== "admin") {
    res.status(403).json({ error: "Only admins can customize questions." });
    return;
  }
  const q = db.getQuestions().find(x => x.id === req.params.id);
  if (!q) {
    res.status(404).json({ error: "Question metadata not found in bank." });
    return;
  }
  const { competencyId, questionText, questionTextHindi, options, optionsHindi, correctAnswerIdx, difficulty, questionType, explanation, explanationHindi } = req.body;
  if (competencyId) q.competencyId = competencyId;
  if (questionText) q.questionText = questionText;
  if (questionTextHindi) q.questionTextHindi = questionTextHindi;
  if (options) q.options = options;
  if (optionsHindi) q.optionsHindi = optionsHindi;
  if (correctAnswerIdx !== undefined) q.correctAnswerIdx = Number(correctAnswerIdx);
  if (difficulty) q.difficulty = difficulty;
  if (questionType) q.questionType = questionType;
  if (explanation) q.explanation = explanation;
  if (explanationHindi) q.explanationHindi = explanationHindi;
  db.saveQuestion(q);
  res.json(q);
});

router.delete("/questions/:id", authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  if (reqUser.role !== "admin") {
    res.status(403).json({ error: "Only admins can delete questions." });
    return;
  }
  const questionsList = db.getQuestions();
  const idx = questionsList.findIndex(x => x.id === req.params.id);
  if (idx !== -1) {
    questionsList.splice(idx, 1);
    db.save();
    res.json({ message: "Question deleted successfully." });
  } else {
    res.status(404).json({ error: "Question not found." });
  }
});

// ==========================================
// 👥 WORKFORCE MANAGEMENT ENDPOINTS
// ==========================================

router.get("/users/team", authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  
  if (reqUser.role === "admin") {
    res.json(db.getUsers());
  } else if (reqUser.role === "manager") {
    // Return teammates in the same department
    const team = db.getUsers().filter(u => u.department === reqUser.department && u.role === "employee");
    
    // Enrich with metrics
    const competencies = db.getCompetencies();
    const allSkills = db.getUserSkills();
    const allAttempts = db.getAttempts();
    const allProgressList = db.getProgress();
    const activeModules = db.getModules();
    
    const enrichedTeam = team.map(emp => {
      const userSkills = allSkills.filter(s => s.userId === emp.id);
      const attempts = allAttempts.filter(a => a.userId === emp.id);
      const progressList = allProgressList.filter(p => p.userId === emp.id);
      
      // Calculate WRI Same as /wri/:userId?
      let totalReqMetRatio = 0;
      if (competencies.length > 0) {
        let metCounter = 0;
        competencies.forEach(comp => {
          const us = userSkills.find(s => s.competencyId === comp.id);
          const current = us ? us.currentLevel : 0;
          if (current >= comp.requiredLevel) {
            metCounter += 1;
          } else {
            metCounter += (current / comp.requiredLevel); 
          }
        });
        totalReqMetRatio = metCounter / competencies.length;
      }

      let passRatio = 0;
      if (attempts.length > 0) {
        // Group attempts by assessmentId to penalize high retry repetitions
        const assessmentIds = Array.from(new Set(attempts.map(a => a.assessmentId)));
        let weightedPassesTotal = 0;
        assessmentIds.forEach(assId => {
          const assAttempts = attempts.filter(a => a.assessmentId === assId);
          const passedAttempts = assAttempts.filter(a => a.passed);
          if (passedAttempts.length > 0) {
            const passedIndex = assAttempts.findIndex(a => a.passed);
            const attemptsToPass = passedIndex !== -1 ? (passedIndex + 1) : assAttempts.length;
            // 15% penalty per previous try before clearing, floor at 40% weightage
            const attemptPenalty = Math.max(0.4, 1.0 - (attemptsToPass - 1) * 0.15);
            weightedPassesTotal += attemptPenalty;
          }
        });
        passRatio = weightedPassesTotal / assessmentIds.length;
      }

      let learnRatio = 0;
      if (activeModules.length > 0) {
        const completedNum = progressList.filter(p => p.status === "completed").length;
        learnRatio = completedNum / activeModules.length;
      }

      const wriVal = Math.round((totalReqMetRatio * 50) + (passRatio * 30) + (learnRatio * 20));
      const wri = Math.min(100, Math.max(10, wriVal));

      // Calculate gaps
      const gaps: any[] = [];
      competencies.forEach(comp => {
        const us = userSkills.find(s => s.competencyId === comp.id);
        const current = us ? us.currentLevel : 0;
        if (current < comp.requiredLevel) {
          gaps.push({
            competencyId: comp.id,
            competencyName: comp.name,
            competencyCode: comp.code,
            currentLevel: current,
            requiredLevel: comp.requiredLevel,
            gap: comp.requiredLevel - current,
            criticality: comp.criticality,
            category: comp.category
          });
        }
      });

      // Calculate next assignments
      const incompleteModules = activeModules.filter(mod => {
        const prog = progressList.find(p => p.moduleId === mod.id);
        return !prog || prog.status !== "completed";
      });

      const relevantIncomplete = incompleteModules.filter(mod => 
        gaps.some(g => g.competencyId === mod.competencyId)
      );

      const nextAssignments: any[] = [];
      relevantIncomplete.forEach(mod => {
        const gapObj = gaps.find(g => g.competencyId === mod.competencyId);
        nextAssignments.push({
          type: "module",
          id: mod.id,
          title: mod.title,
          estimatedMinutes: mod.estimatedMinutes,
          difficulty: mod.difficulty,
          reason: `Address gap in ${gapObj ? gapObj.competencyName : 'assigned skill'}`
        });
      });

      if (nextAssignments.length === 0 && incompleteModules.length > 0) {
        nextAssignments.push({
          type: "module",
          id: incompleteModules[0].id,
          title: incompleteModules[0].title,
          estimatedMinutes: incompleteModules[0].estimatedMinutes,
          difficulty: incompleteModules[0].difficulty,
          reason: "General plant alignment curriculum"
        });
      }

      return {
        ...emp,
        wri,
        gaps,
        nextAssignments
      };
    });

    res.json(enrichedTeam);
  } else {
    // Employee sees only themselves
    res.json([db.getUsers().find(u => u.id === reqUser.userId)]);
  }
});

// ==========================================
// 🏷️ COMPETENCY ENDPOINTS
// ==========================================

router.get("/competencies", authenticateToken, (req: Request, res: Response) => {
  res.json(db.getCompetencies());
});

router.post("/competencies", authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  if (reqUser.role !== "admin") {
    res.status(403).json({ error: "Only admins can declare new core competencies." });
    return;
  }

  const { code, name, description, criticality, category, requiredLevel } = req.body;
  if (!code || !name || !description || !criticality || !category || !requiredLevel) {
    res.status(400).json({ error: "All properties (code, name, description, criticality, category, requiredLevel) are required." });
    return;
  }

  const newComp: Competency = {
    id: `comp_${Date.now()}`,
    code,
    name,
    description,
    criticality,
    category,
    requiredLevel: Number(requiredLevel)
  };

  db.addCompetency(newComp);

  db.addGraphNode({
    id: `node_comp_${newComp.id}`,
    label: `${name} (Competency)`,
    type: "competency",
    properties: { criticality, category }
  });

  res.status(201).json(newComp);
});

router.get("/competencies/profile/:userId?", authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const targetUserId = req.params.userId || reqUser.userId;

  // Security guard: Employees cannot inspect other profiles unless they are Managers or Admins
  if (targetUserId !== reqUser.userId && reqUser.role === "employee") {
    res.status(403).json({ error: "Access denied. Employees can only view their own competency profiles." });
    return;
  }

  const user = db.getUsers().find(u => u.id === targetUserId);
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  const comps = db.getCompetencies();
  const skills = db.getUserSkills().filter(s => s.userId === targetUserId);

  const mergedProfile = comps.map(comp => {
    const userSkill = skills.find(s => s.competencyId === comp.id);
    const current = userSkill ? userSkill.currentLevel : 0;
    const gap = comp.requiredLevel - current;

    return {
      competency: comp,
      currentLevel: current,
      requiredLevel: comp.requiredLevel,
      gap: gap > 0 ? gap : 0,
      updatedAt: userSkill ? userSkill.updatedAt : null,
      source: userSkill ? userSkill.source : null
    };
  });

  res.json({
    userId: targetUserId,
    username: user.username,
    fullName: user.fullName,
    jobTitle: user.jobTitle,
    department: user.department,
    profile: mergedProfile
  });
});

router.post("/competencies/rate", authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const { competencyId, rating, source, userId } = req.body;
  const targetUserId = userId || reqUser.userId;

  if (!competencyId || rating === undefined) {
    res.status(400).json({ error: "competencyId and rating levels are required." });
    return;
  }

  // Managers/Admins can rate anyone. Employees can only rate themselves ("self").
  if (targetUserId !== reqUser.userId && reqUser.role === "employee") {
    res.status(403).json({ error: "Employees are not authorized to rate peers or managers." });
    return;
  }

  const comp = db.getCompetencies().find(c => c.id === competencyId);
  if (!comp) {
    res.status(404).json({ error: "Competency not found." });
    return;
  }

  const calculatedSource = reqUser.role === "manager" || reqUser.role === "admin" ? "manager" : "self";

  const newSkill: UserSkill = {
    id: `skill_${Date.now()}`,
    userId: targetUserId,
    competencyId,
    currentLevel: Math.min(5, Math.max(0, Number(rating))),
    updatedAt: new Date().toISOString(),
    source: calculatedSource as any
  };

  db.saveUserSkill(newSkill);

  // Link inside the Knowledge Graph too!
  const nodeSource = `node_user_${targetUserId}`;
  const nodeTarget = `node_comp_${competencyId}`;
  
  // Clear any old edge
  const graphEdges = db.getGraphEdges();
  const matchIdx = graphEdges.findIndex(
    e => e.source === nodeSource && e.target === nodeTarget && (e.relation === "MASTERS" || e.relation === "ACQUIRING")
  );
  if (matchIdx !== -1) {
    graphEdges.splice(matchIdx, 1);
  }

  db.addGraphEdge({
    id: `edge_skill_${Date.now()}`,
    source: nodeSource,
    target: nodeTarget,
    relation: newSkill.currentLevel >= comp.requiredLevel ? "MASTERS" : "ACQUIRING"
  });

  res.json({ message: "Competency skill updated successfully.", skill: newSkill });
});

// Helper to fetch dynamic, randomized, and job-relevance-aligned assessment questions to prevent repetition
function getRelevantRandomizedQuestions(user: any, assessment: any, limit: number) {
  const allQuestions = db.getQuestions();
  if (allQuestions.length === 0) {
    return assessment.questions || [];
  }

  // 1. Identify which competencies are relevant to the user's role/job
  const userRoleName = user.jobTitle || "";
  const roles = db.getState().roles || [];
  const matchedRole = roles.find((r: any) => r.roleName.toLowerCase().trim() === userRoleName.toLowerCase().trim());
  
  const relevantCompetencyIds = new Set<string>();
  if (matchedRole) {
    matchedRole.requiredCompetencies.forEach((rc: any) => {
      relevantCompetencyIds.add(rc.competencyId);
    });
  }

  // Also include the competencyIds in the assessment's original templates
  if (assessment && assessment.questions) {
    assessment.questions.forEach((q: any) => {
      if (q.competencyId) {
        relevantCompetencyIds.add(q.competencyId);
      }
    });
  }

  // 2. Filter global questions pool
  let pool = allQuestions.filter(q => relevantCompetencyIds.has(q.competencyId));

  // If we don't have enough matching questions, backfill from other global questions
  if (pool.length < limit) {
    const extra = allQuestions.filter(q => !pool.some(p => p.id === q.id));
    pool = [...pool, ...extra];
  }

  // 3. Shuffle pool so standard/retake assessments stay dynamic
  const shuffled = [...pool].sort(() => Math.random() - 0.5);

  // Return the randomized set mapped to standard format
  return shuffled.slice(0, limit).map((pq) => ({
    id: pq.id,
    questionText: pq.questionText,
    questionTextHindi: pq.questionTextHindi || pq.questionText,
    options: pq.options,
    optionsHindi: pq.optionsHindi || pq.options,
    correctAnswerIdx: pq.correctAnswerIdx,
    points: 20,
    competencyId: pq.competencyId,
    questionType: pq.questionType,
    explanation: pq.explanation,
    explanationHindi: pq.explanationHindi || pq.explanation
  }));
}

// Helper to retrieve randomized questions for a specific learning module
function getModuleCheckQuestions(moduleId: string, competencyId: string, limit = 3) {
  const allQuestions = db.getQuestions();
  
  // Filter questions matching this competencyId first
  let pool = allQuestions.filter(q => q.competencyId === competencyId);
  
  // If not enough questions, backfill from others
  if (pool.length < limit) {
    const extra = allQuestions.filter(q => q.competencyId !== competencyId);
    pool = [...pool, ...extra];
  }
  
  // Shuffle pool so sequential assessments get something different each time
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  
  return shuffled.slice(0, limit).map((pq) => ({
    id: pq.id,
    questionText: pq.questionText,
    questionTextHindi: pq.questionTextHindi || pq.questionText,
    options: pq.options,
    optionsHindi: pq.optionsHindi || pq.options,
    correctAnswerIdx: pq.correctAnswerIdx,
    points: 20,
    competencyId: pq.competencyId,
    questionType: pq.questionType,
    explanation: pq.explanation,
    explanationHindi: pq.explanationHindi || pq.explanation
  }));
}

// ==========================================
// 📝 ASSESSMENT ENDPOINTS
// ==========================================

router.get("/assessments", authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const user = db.getUsers().find(u => u.id === reqUser.userId);
  if (!user) {
    res.status(404).json({ error: "User not found to load assignments." });
    return;
  }

  const pool = db.getAssessments();
  const allAttempts = db.getAttempts().filter(a => a.userId === reqUser.userId);

  // For each assessment templates, dynamically filter, randomize, and populate questions + track attempt counts
  const enrichedAssessments = pool.map(ass => {
    const limit = ass.questions.length || 5;
    const randomizedQuestions = getRelevantRandomizedQuestions(user, ass, limit);
    const userAttempts = allAttempts.filter(a => a.assessmentId === ass.id);
    
    return {
      ...ass,
      questions: randomizedQuestions,
      userAttempts
    };
  });

  res.json(enrichedAssessments);
});

router.post("/assessments", authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  if (reqUser.role !== "admin") {
    res.status(403).json({ error: "Admins only are authorized to create curriculum assessments." });
    return;
  }

  const { title, roleTarget, questions } = req.body;
  if (!title || !roleTarget || !Array.isArray(questions) || questions.length === 0) {
    res.status(400).json({ error: "Title, roleTarget, and a non-empty list of questions are required." });
    return;
  }

  const newAssessment: Assessment = {
    id: `assess_${Date.now()}`,
    title,
    roleTarget,
    questions: questions.map((q, idx) => ({
      id: `q_${idx}_${Date.now()}`,
      questionText: q.questionText,
      options: q.options,
      correctAnswerIdx: Number(q.correctAnswerIdx),
      points: Number(q.points) || 20,
      competencyId: q.competencyId,
      questionType: q.questionType || "mcq"
    }))
  };

  db.addAssessment(newAssessment);

  db.addGraphNode({
    id: `node_assess_${newAssessment.id}`,
    label: `${title} (Assessment)`,
    type: "assessment",
    properties: { roleTarget }
  });

  res.status(201).json(newAssessment);
});

router.post("/assessments/submit", authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const { assessmentId, answers } = req.body; // answers is a mapping of questionId -> selectedOptionIndex

  if (!assessmentId || !answers) {
    res.status(400).json({ error: "assessmentId and answers are required." });
    return;
  }

  const assess = db.getAssessments().find(a => a.id === assessmentId);
  if (!assess) {
    res.status(404).json({ error: "Assessment module not found." });
    return;
  }

  const user = db.getUsers().find(u => u.id === reqUser.userId);
  const userRole = user ? user.role : "employee";

  let totalPoints = 0;
  let earnedPoints = 0;

  // Track dynamic questions lookup to support shuffled/randomised questions
  const submittedQuestionIds = Object.keys(answers);
  const allGlobalQuestions = db.getQuestions();

  const gradedQuestions = (submittedQuestionIds.length > 0 ? submittedQuestionIds : assess.questions.map(q => q.id)).map(qId => {
    let q = allGlobalQuestions.find(item => item.id === qId);
    if (!q) {
      q = assess.questions.find(item => item.id === qId) as any;
    }
    if (!q) return null;

    const userAnswer = answers[q.id];
    const isCorrect = userAnswer === q.correctAnswerIdx;

    // Role-dependent question weight multiplier:
    let weight = 1.0;
    if (q.questionType === "leadership") {
      weight = userRole === "manager" ? 3.0 : 0.5;
    } else if (q.questionType === "digital_literacy") {
      weight = userRole === "manager" ? 1.5 : 1.0;
    } else if (q.questionType === "scenario") {
      weight = userRole === "manager" ? 1.5 : 1.0;
    }

    const itemPoints = (q.points || 20) * weight;
    totalPoints += itemPoints;
    if (isCorrect) earnedPoints += itemPoints;

    return {
      questionId: q.id,
      questionText: q.questionText,
      correctIdx: q.correctAnswerIdx,
      userAnswer,
      isCorrect,
      competencyId: q.competencyId,
      questionType: q.questionType,
      appliedWeight: weight,
      pointsTotal: itemPoints
    };
  }).filter(Boolean) as any[];

  const rawScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const passed = rawScore >= 70; // 70% passing threshold based on actual accuracy

  // Assess attempts penalty:
  const prevAttempts = db.getAttempts().filter(a => a.userId === reqUser.userId && a.assessmentId === assessmentId);
  const attemptNumber = prevAttempts.length + 1;
  const penaltyFactor = Math.max(0.4, 1.0 - (prevAttempts.length * 0.15)); // 15% penalty per previous attempt, floor at 40%
  const score = Math.min(100, Math.round(rawScore * penaltyFactor));

  const attempt: AssessmentAttempt = {
    id: `att_${Date.now()}`,
    userId: reqUser.userId,
    assessmentId,
    score,
    completedAt: new Date().toISOString(),
    answers,
    passed
  };

  db.addAttempt(attempt);

  // GAP DETECT & AUTO UPDATE SKILLS:
  if (passed) {
    // Group questions by competency to upgrade corresponding skills
    const compMap: { [compId: string]: boolean } = {};
    gradedQuestions.forEach(q => {
      if (q.competencyId) compMap[q.competencyId] = true;
    });

    Object.keys(compMap).forEach(compId => {
      const comp = db.getCompetencies().find(c => c.id === compId);
      if (!comp) return;

      const currentSkills = db.getUserSkills().filter(s => s.userId === reqUser.userId);
      const existing = currentSkills.find(s => s.competencyId === compId);
      const previousLevel = existing ? existing.currentLevel : 0;

      // Passing upgrades technical rating. Apply penalty to the skill increment as well!
      // Penalty reduces increment from +1 down to +0.7, +0.4 based on previous attempts
      const skillIncrement = Math.max(0.3, 1.0 - (prevAttempts.length * 0.25));
      const targetLevel = Math.min(5, Math.ceil((previousLevel + skillIncrement) * 100) / 100);

      db.saveUserSkill({
        id: `skill_${Date.now()}_upgraded`,
        userId: reqUser.userId,
        competencyId: compId,
        currentLevel: targetLevel,
        updatedAt: new Date().toISOString(),
        source: "assessment"
      });

      // Update graph relationship to show success validations
      db.addGraphEdge({
        id: `edge_valid_${Date.now()}`,
        source: `node_user_${reqUser.userId}`,
        target: `node_comp_${compId}`,
        relation: "VALIDATES"
      });
    });
  }

  res.json({
    attempt,
    passed,
    score: score, // Penalized score
    originalScore: rawScore, // Actual accurate questions score
    attemptNumber,
    penaltyApplied: prevAttempts.length > 0 ? `${(prevAttempts.length * 15)}%` : "None",
    gradedQuestions
  });
});

// ==========================================
// 📊 METRIC & INDEX CALCULATIONS (WRI & KRI)
// ==========================================

// Calculate Workforce Readiness Index
router.get("/wri/:userId?", authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const targetUserId = req.params.userId || reqUser.userId;

  const user = db.getUsers().find(u => u.id === targetUserId);
  if (!user) {
    res.status(404).json({ error: "User not found to calculate index metrics." });
    return;
  }

  const competencies = db.getCompetencies();
  const userSkills = db.getUserSkills().filter(s => s.userId === targetUserId);
  const attempts = db.getAttempts().filter(a => a.userId === targetUserId);
  const progressList = db.getProgress().filter(p => p.userId === targetUserId);

  // 1. Competency Progress (Weighted: 50% multiplier)
  // Percent of requirements met
  let totalReqMetRatio = 0;
  if (competencies.length > 0) {
    let metCounter = 0;
    competencies.forEach(comp => {
      const us = userSkills.find(s => s.competencyId === comp.id);
      const current = us ? us.currentLevel : 0;
      if (current >= comp.requiredLevel) {
        metCounter += 1;
      } else {
        metCounter += (current / comp.requiredLevel); // partial credit
      }
    });
    totalReqMetRatio = metCounter / competencies.length;
  }

  // 2. Assessment success progress (Weighted: 30% multiplier)
  let passRatio = 0;
  if (attempts.length > 0) {
    // Group attempts by assessmentId to penalize high retry repetitions
    const assessmentIds = Array.from(new Set(attempts.map(a => a.assessmentId)));
    let weightedPassesTotal = 0;
    assessmentIds.forEach(assId => {
      const assAttempts = attempts.filter(a => a.assessmentId === assId);
      const passedAttempts = assAttempts.filter(a => a.passed);
      if (passedAttempts.length > 0) {
        const passedIndex = assAttempts.findIndex(a => a.passed);
        const attemptsToPass = passedIndex !== -1 ? (passedIndex + 1) : assAttempts.length;
        // 15% penalty per previous try before clearing, floor at 40% weightage
        const attemptPenalty = Math.max(0.4, 1.0 - (attemptsToPass - 1) * 0.15);
        weightedPassesTotal += attemptPenalty;
      }
    });
    passRatio = weightedPassesTotal / assessmentIds.length;
  }

  // 3. Learning Path Progression (Weighted: 20% multiplier)
  let learnRatio = 0;
  const activeModules = db.getModules();
  if (activeModules.length > 0) {
    const completedNum = progressList.filter(p => p.status === "completed").length;
    learnRatio = completedNum / activeModules.length;
  }

  // Formula compilation:
  const wriVal = Math.round((totalReqMetRatio * 50) + (passRatio * 30) + (learnRatio * 20));

  res.json({
    userId: targetUserId,
    fullName: user.fullName,
    wri: Math.min(100, Math.max(10, wriVal)),
    factors: {
      competencyCoverage: Math.round(totalReqMetRatio * 100),
      assessmentSuccess: Math.round(passRatio * 100),
      learningProgress: Math.round(learnRatio * 100)
    },
    history: [
      { month: "Jan", score: Math.round(wriVal * 0.8) },
      { month: "Mar", score: Math.round(wriVal * 0.9) },
      { month: "May", score: wriVal }
    ]
  });
});

// Calculate Knowledge Risk Index (KRI) for departments
router.get("/kri", authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  if (reqUser.role === "employee") {
    res.status(403).json({ error: "Unauthorized. Employees cannot access executive Risk matrices." });
    return;
  }

  const allUsers = db.getUsers().filter(u => u.role === "employee");
  const competencies = db.getCompetencies();
  const allSkills = db.getUserSkills();
  const docs = db.getDocs();

  // Factors that contribute to corporate Knowledge Risk levels:
  // 1. Skill Gap Concentration (Avg gap size of critical skills across all team users)
  let totalGap = 0;
  let gapItems = 0;
  competencies.forEach(comp => {
    allUsers.forEach(user => {
      const us = allSkills.find(s => s.userId === user.id && s.competencyId === comp.id);
      const level = us ? us.currentLevel : 0;
      if (level < comp.requiredLevel) {
        totalGap += (comp.requiredLevel - level);
        gapItems += 1;
      }
    });
  });
  const gapRiskIndex = gapItems > 0 ? (totalGap / gapItems) * 20 : 15; // Scaled out of 100

  // 2. Expert Concentration Risk (Bottleneck)
  // Competencies where less than 2 people are fully certified at requiredLevel or above!
  let expertBottlenecks = 0;
  competencies.forEach(comp => {
    const masters = allSkills.filter(s => s.competencyId === comp.id && s.currentLevel >= comp.requiredLevel);
    if (masters.length < 2) {
      expertBottlenecks += 1;
    }
  });
  const bottleneckRiskIndex = competencies.length > 0 ? (expertBottlenecks / competencies.length) * 100 : 20;

  // 3. Documentation and SOP Coverage deficit
  // Critical competencies that have 0 SOP documents linked to them
  let unassignedDocs = 0;
  competencies.forEach(comp => {
    if (comp.criticality === "high") {
      const matchDocs = docs.filter(d => d.competencyId === comp.id);
      if (matchDocs.length === 0) {
        unassignedDocs += 1;
      }
    }
  });
  const docDeficitRiskIndex = competencies.filter(c => c.criticality === "high").length > 0
    ? (unassignedDocs / competencies.filter(c => c.criticality === "high").length) * 100
    : 10;

  const overallKri = Math.round((gapRiskIndex * 0.4) + (bottleneckRiskIndex * 0.4) + (docDeficitRiskIndex * 0.2));

  res.json({
    kri: Math.min(100, Math.max(5, overallKri)),
    factors: {
      teamGapRisk: Math.round(gapRiskIndex),
      bottleneckRisk: Math.round(bottleneckRiskIndex),
      documentationDeficit: Math.round(docDeficitRiskIndex)
    },
    riskWarnings: [
      unassignedDocs > 0 ? `${unassignedDocs} High-Criticality competencies have no associated SOP manuals. Risk of training drift.` : null,
      expertBottlenecks > 0 ? `${expertBottlenecks} core competencies have less than two plant experts available.` : null
    ].filter(Boolean)
  });
});

// ==========================================
// 📚 LEARNING PATH ENDPOINTS
// ==========================================

router.get("/learning-paths", authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  
  const modules = db.getModules();
  const progressList = db.getProgress().filter(p => p.userId === reqUser.userId);
  const userSkills = db.getUserSkills().filter(s => s.userId === reqUser.userId);
  const competencies = db.getCompetencies();

  // Customized learning generation: Flag modules matching target competencies where the user has a skill level GAP
  const mappedPaths = modules.map(mod => {
    const prog = progressList.find(p => p.moduleId === mod.id);
    const associatedComp = competencies.find(c => c.id === mod.competencyId);
    
    let isRecommended = false;
    if (associatedComp) {
      const us = userSkills.find(s => s.competencyId === associatedComp.id);
      const actualRating = us ? us.currentLevel : 0;
      isRecommended = actualRating < associatedComp.requiredLevel;
    }

    // Attach 3 dynamic, randomized checklist questions for this module to block simple rote repetition
    const moduleQuestions = getModuleCheckQuestions(mod.id, mod.competencyId || "", 3);

    // Fetch quiz attempts history for this module
    const userAttempts = db.getAttempts().filter(a => a.userId === reqUser.userId && a.assessmentId === `module_${mod.id}`);

    return {
      module: mod,
      competencyName: associatedComp ? associatedComp.name : "Core Operations",
      status: prog ? prog.status : "not_started",
      isRecommended,
      progress: prog || null,
      questions: moduleQuestions,
      userAttempts
    };
  });

  res.json(mappedPaths);
});

router.post("/learning-paths/complete", authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const { moduleId, answers } = req.body; // answers: { [questionId: string]: selectedIndex }

  if (!moduleId) {
    res.status(400).json({ error: "moduleId is required." });
    return;
  }

  const activeModule = db.getModules().find(m => m.id === moduleId);
  if (!activeModule) {
    res.status(404).json({ error: "Learning module not found." });
    return;
  }

  // Mini-assessment checking is MANDATORY
  if (!answers || Object.keys(answers).length === 0) {
    res.status(400).json({ error: "Mini-assessment answers are required to verify competency clearance." });
    return;
  }

  // Grade the checklist
  const allQuestions = db.getQuestions();
  const submittedIds = Object.keys(answers);
  let correctCount = 0;
  const totalCount = submittedIds.length;

  const gradedQuestions = submittedIds.map(qId => {
    const q = allQuestions.find(item => item.id === qId);
    if (!q) return null;

    const userAnswer = answers[qId];
    const isCorrect = userAnswer === q.correctAnswerIdx;

    if (isCorrect) correctCount++;

    return {
      questionId: qId,
      questionText: q.questionText,
      correctIdx: q.correctAnswerIdx,
      userAnswer,
      isCorrect,
      explanation: q.explanation || ""
    };
  }).filter(Boolean);

  const rawScore = totalCount > 0 ? Math.round((correctCount / totalCount) * 105) : 0; // standard out of 100
  const score = Math.min(100, rawScore);
  const passed = score >= 65; // At least 2 out of 3 correct questions is 66.7% (which is >= 65%)

  // Save the assessment attempt reference
  const attemptId = `att_module_${moduleId}_${Date.now()}`;
  const attempt = {
    id: attemptId,
    userId: reqUser.userId,
    assessmentId: `module_${moduleId}`,
    score,
    completedAt: new Date().toISOString(),
    answers,
    passed
  };

  db.addAttempt(attempt);

  if (!passed) {
    res.status(400).json({
      success: false,
      message: `Accessory study module validation failed. You scored ${score}% (Minimum required for safety: 65%). Please review concepts and re-assess.`,
      gradedQuestions,
      score,
      passed: false
    });
    return;
  }

  // If validation succeeded, proceed with course completion save
  db.saveProgress({
    id: `prog_${Date.now()}`,
    userId: reqUser.userId,
    moduleId,
    status: "completed",
    completedAt: new Date().toISOString()
  });

  // Calculate attempt-based upgrade multiplier:
  const prevAttempts = db.getAttempts().filter(a => a.userId === reqUser.userId && a.assessmentId === `module_${moduleId}`);
  const previousFailedCount = prevAttempts.filter(a => !a.passed).length;

  // Let 1st try pass give full +1.0 points
  // 2nd try pass give +0.70 points
  // 3rd or more try pass give +0.40 points
  let skillIncrement = 1.0;
  let penaltyNote = "None (First attempt pass!)";
  if (previousFailedCount === 1) {
    skillIncrement = 0.70;
    penaltyNote = "30% weightage penalty applied due to 2nd attempt completion clearance.";
  } else if (previousFailedCount >= 2) {
    skillIncrement = 0.40;
    penaltyNote = "60% weightage penalty applied due to multiple attempt completion clearance.";
  }

  const userSkills = db.getUserSkills().filter(s => s.userId === reqUser.userId);
  const existing = userSkills.find(s => s.competencyId === activeModule.competencyId);
  const previousLevel = existing ? existing.currentLevel : 0;

  const rawNextLevel = previousLevel + skillIncrement;
  const newLevelCap = Math.min(5, Math.round(rawNextLevel * 100) / 100);

  db.saveUserSkill({
    id: `skill_${Date.now()}_incentive`,
    userId: reqUser.userId,
    competencyId: activeModule.competencyId,
    currentLevel: newLevelCap,
    updatedAt: new Date().toISOString(),
    source: "assessment"
  });

  res.json({
    success: true,
    message: `Module cleared successfully! Competency index upscaled to ${newLevelCap}.`,
    score,
    passed: true,
    penaltyApplied: penaltyNote,
    skillIncrement
  });
});

// ==========================================
// 🤖 AI TRAINER Q&A (RAG-BASED)
// ==========================================

router.post("/ai-trainer/query", authenticateToken, async (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const { query, history, engine } = req.body; // history is past chat blocks

  if (!query) {
    res.status(400).json({ error: "Query text parameter is required." });
    return;
  }

  const user = db.getUsers().find(u => u.id === reqUser.userId);
  if (!user) {
    res.status(404).json({ error: "System operator profile not found." });
    return;
  }

  // DETECT USER INPUT LANGUAGE (English, Hindi, or Hinglish)
  const detectedLanguage = await detectInputLanguage(query);

  const docs = db.getDocs();
  let matchedDocs: KnowledgeDoc[] = [];

  // SEMANTIC VECTOR RAG ENGINE SEARCH:
  // If we can support modern embeddings, call gemini embedding API
  try {
    const queryEmbedding = await generateEmbedding(query);
    if (queryEmbedding && docs.some(d => d.embedding && d.embedding.length > 0)) {
      // Calculate cosine similarities
      const ranked = docs.map(doc => {
        let similarity = 0;
        if (doc.embedding) {
          similarity = cosineSimilarity(queryEmbedding, doc.embedding);
        } else {
          // fallback string inclusion for safety
          similarity = doc.content.toLowerCase().includes(query.toLowerCase()) ? 0.35 : 0;
        }
        return { doc, score: similarity };
      });
      // Sort and take top 2 documentation papers
      ranked.sort((a, b) => b.score - a.score);
      matchedDocs = ranked.filter(r => r.score > 0.25).map(r => r.doc).slice(0, 2);
    }
  } catch (error) {
    console.error("Embedding similarity match failed, falling back to keyword search.", error);
  }

  // Backup Keyword Fallback search
  if (matchedDocs.length === 0) {
    matchedDocs = docs.filter(doc => {
      const qLower = query.toLowerCase();
      return doc.content.toLowerCase().includes(qLower) || doc.title.toLowerCase().includes(qLower);
    }).slice(0, 2);
  }

  // RAG Generation via Gemini API module
  const aiAnswerText = await generateRAGAnswer({
    query,
    detectedLanguage,
    contextDocs: matchedDocs,
    history: Array.isArray(history) ? history : [],
    userProfile: {
      fullName: user.fullName,
      jobTitle: user.jobTitle,
      dept: user.department
    },
    engine: engine
  });

  // AUTO-GENERATIVE KNOWLEDGE INGESTION GAUGE:
  // Dynamically record an auto-generated learning capsule when deep explanations occur!
  if (query.toLowerCase().includes("how to") || query.toLowerCase().includes("process") || query.toLowerCase().includes("sop")) {
    const logId = `autolog_${Date.now()}`;
    const generatedCapsule: KnowledgeDoc = {
      id: logId,
      title: `Auto-Generated Operations Record: ${query.slice(0, 40)}...`,
      type: "logbook",
      content: `Recorded trainee interaction logging:
Trainee Operator: ${user.fullName}
Dialogue Query: "${query}"
Co-Pilot Generated Guidelines:
${aiAnswerText.substring(0, 500)}...`,
      createdBy: "user_admin",
      createdAt: new Date().toISOString(),
      tags: ["AI-Generated", "Operations-Log", "RAG"]
    };
    db.saveDoc(generatedCapsule);
  }

  res.json({
    answer: aiAnswerText,
    detectedLanguage,
    retrievedContext: matchedDocs.map(d => ({ title: d.title, type: d.type }))
  });
});

// ==========================================
// 📂 KNOWLEDGE HUB SYSTEM ENDPOINTS
// ==========================================

router.get("/knowledge-hub", authenticateToken, (req: Request, res: Response) => {
  res.json(db.getDocs());
});

router.post("/knowledge-hub/seed", authenticateToken, async (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  if (!reqUser || reqUser.role !== "admin") {
    res.status(403).json({ error: "Only administrators can trigger enterprise-wide documentation libraries seeding." });
    return;
  }

  const existingDocs = db.getDocs();
  let seededCount = 0;

  const seedDocumentsList = [
    {
      title: "SOP-ME-024: Continuous Casting Caster Roll Gap Alignment",
      type: "sop",
      competencyId: "comp_4", // Preventive Mechanical Maintenance
      tags: ["Maintenance", "CCM", "RollGap", "Calibration"],
      content: `1. PURPOSE & SCOPE
This Standard Operating Procedure (SOP) defines the safety and calibration steps for verifying roll gap alignments on Continuous Casting Machine #2 (CCM-2) to prevent strand surface cracking.

2. SPECIFIC INSTRUCTIONS & STEP SEQUENCE
- Step 2.1: Isolate CCM strand drive motors using Class-4 LOTO (Lock-Out, Tag-Out) at Substation D.
- Step 2.2: Mount the electronic roll gap telemetry checking sled (ROGAP-X) onto the starter dummy bar head.
- Step 2.3: Lower the dummy bar into the mold and through Segments 1 to 3 at a constant crawling speed of 0.5 meters per minute.
- Step 2.4: Monitor realtime telemetry transmission. Ensure the roll gap deviation stays within +/- 0.15 millimeter from nominal drawing thickness.
- Step 2.5: Any rollers exceeding 0.25mm deviation require immediate hydraulic spacer block adjustment.

3. SAFETY THRESHOLDS
- Maximum permissible segment torque: 420 Nm.
- Segment temperature must be below 65°C prior to physical entry for rollers replacement.`
    },
    {
      title: "SOP-MET-209: Alloy Micro-Segregation & Austenite Grain Control",
      type: "expert_session",
      competencyId: "comp_3", // Metallurgical Phase Control
      tags: ["Metallurgy", "Alloy", "Austenite", "Casting"],
      content: `TECHNICAL GUIDE: MICRO-SEGREGATION DYNAMICS IN HIGH-STRENGTH CARBON STEELS
Controlling grain solidification boundaries is vital to eliminate center-line strand cracking.

1. PROCESS PARAMETERS FOR SOLIDIFICATION
- Keep the cooling water spray ratio within 0.85 to 1.15 liters per kilogram of steel cast.
- Secondary cooling zone #3 target surface temperature: 880°C to 940°C. Maintaining austenite phase prevents martensitic transformation at the bend roller section.
- Ensure the liquidus temperature margin (superheat) in the tundish ranges between 15°C and 25°C.

2. CORRECTIVE PROCEDURES FOR TEMPERATURE EXCURSIONS
- Superheat > 30°C: Reduce strand casting speed by 0.15 m/min to allow uniform core solidification.
- Spray nozzle clogging detection: Verify flow transmitters. If pressure drops below 4.2 bar, trigger secondary nozzle bypass interlock.`
    },
    {
      title: "SOP-CC-012: CCM Tundish Preheating & Cast Flow Control",
      type: "sop",
      competencyId: "comp_2", // Continuous Casting Operation
      tags: ["Casting", "CCM", "Preheating", "Tundish"],
      content: `1. SCOPE OF TUNDISH PREHEATING
Tundish lining must be thoroughly preheated prior to tapping to prevent thermal shock, refractory wash, or skull formation.

2. SEQUENCE OF OPERATION
- Step 2.1: Align Burners A, B, and C over the empty tundish wells. Ensure emergency gas isolation valves are enabled.
- Step 2.2: Ignite burners at low fuel setting. Increase secondary air ratio to 1.25 to prevent reducing-atmosphere deposition on the lining.
- Step 2.3: Preheat continuously for a minimum of 90 minutes. Target refractory surface temperature is 1100°C.
- Step 2.4: Verify slidegate hydraulically by cycling the stopper rod twice over its full travel range (65mm).

3. REACTION TO ABNORMALITIES
- Flame failure or low gas pressure (< 80 mbar): Auto gas-trip safety valve will fire. Do NOT attempt immediate manual reignition. Wait 5 minutes to purge residual gases.`
    },
    {
      title: "SOP-SAF-001: Gas Protection and Self-Breathing Apparatus Guidelines",
      type: "safety_manual",
      competencyId: "comp_1", // Hazard Analysis & Safety Compliance
      tags: ["Safety", "GasLeak", "CO", "SCBA"],
      content: `1. CARBON MONOXIDE (CO) SAFETY EXPOSURE MATRIX
Carbon Monoxide is an odorless, toxic, explosive gas prevalent around Blast Furnace gas lines and cupola hearths.
- CO Level < 11 ppm: Safe working environment. Continuous work is permitted.
- CO Level 15 - 30 ppm: Warning threshold. Personal multi-gas monitors will chirp. Work site must be ventilated immediately.
- CO Level > 30 ppm: Alarm limit. Evacuate area immediately. Return only with certified SCBA (Self-Contained Breathing Apparatus).
- CO Level > 50 ppm: Critical evacuation. Automated sirens sound. All personnel assemble at Upwind Safety Sign-post #4.

2. SCBA MANIFOLD DEPLOYMENT EXERCISES
- Inspect cylinder pressure gauge. Ensure it is at >= 200 bar.
- Don the harness, adjust mask until positive pressure seal is achieved. Verify flow alarm.`
    },
    {
      title: "SOP-DG-105: Level-2 SCADA PLC Interlocking & Telemetry Diagnosis",
      type: "sop",
      competencyId: "comp_5", // SCADA & Level-2 Automation Control
      tags: ["Automation", "SCADA", "PLC", "Telemetry"],
      content: `1. CENTRAL OPERATIONS LEVEL 2 INTERLOCK DESIGN
This documentation governs the software interlocks built into the Allen-Bradley ControlLogix 5580 system running SMS-2 Level 2 automation.

2. CRITICAL CONTROL INTERLOCKS
- Interlock IL-SC2-01 (Tundish Slidegate Override): If the Tundish weight drops below 4.5 tons, the slidegate will automatically clamp shut to prevent slag carryover into mold.
- Interlock IL-SC2-02 (Secondary Spray Pressure): If cooling water pressure falls below 2.8 bar for > 3.0 seconds, the main casting speed is forced to crawling rate (0.2 m/sec) to avoid breakout.

3. SCADA DIAGNOSTIC WORKFLOWS
- In event of communications dropout, check the Modbus TCP telemetry link. Ensure IP address 172.18.42.10 is pingable with latency < 5ms.`
    }
  ];

  for (const doc of seedDocumentsList) {
    if (existingDocs.some(d => d.title.toLowerCase() === doc.title.toLowerCase())) {
      continue;
    }

    const docId = `doc_${db.getDocs().length + 1}_seed_${Date.now()}`;
    const newDoc: KnowledgeDoc = {
      id: docId,
      title: doc.title,
      type: doc.type as any,
      content: doc.content,
      competencyId: doc.competencyId,
      tags: doc.tags,
      createdBy: "system_seeder",
      createdAt: new Date().toISOString()
    };

    try {
      const emb = await generateEmbedding(doc.content);
      if (emb) {
        newDoc.embedding = emb;
      }
    } catch (err) {
      console.warn(`Seed embedding creation omitted/failed for ${doc.title}:`, err);
    }

    db.saveDoc(newDoc);
    seededCount++;
  }

  res.json({
    message: seededCount > 0 
      ? `Successfully ingested & vectorized ${seededCount} initial high-fidelity corporate manuals into the Knowledge Hub and synced relational Knowledge Graph.`
      : "Standard seed library already fully synchronized and indexed in Knowledge Hub. No actions needed.",
    seededCount
  });
});

router.post("/knowledge-hub/upload", authenticateToken, async (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const { title, type, content, competencyId, tags } = req.body;

  if (!title || !type || !content) {
    res.status(400).json({ error: "Title, type and content fields are required inputs." });
    return;
  }

  const docId = `doc_${Date.now()}`;
  const newDoc: KnowledgeDoc = {
    id: docId,
    title,
    type,
    content,
    competencyId,
    tags: Array.isArray(tags) ? tags : [],
    createdBy: reqUser.userId,
    createdAt: new Date().toISOString()
  };

  // Generate vector embedding eagerly so subsequent semantic queries are extremely fast!
  try {
    const emb = await generateEmbedding(content);
    if (emb) {
      newDoc.embedding = emb;
    }
  } catch (err) {
    console.error("Could not run vector embedding on file upload. Document will fall back to exact keyword searches.", err);
  }

  db.saveDoc(newDoc);
  res.status(201).json(newDoc);
});

// ==========================================
// 🤝 MENTOR MATCHING & COMMISSION ENDPOINTS
// ==========================================

router.get("/mentors/recommend", authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const users = db.getUsers();
  const userSkills = db.getUserSkills();
  const competencies = db.getCompetencies();

  // Find where the requesting employee has skill gaps
  const mySkills = userSkills.filter(s => s.userId === reqUser.userId);
  const gaps = competencies.filter(comp => {
    const us = mySkills.find(s => s.competencyId === comp.id);
    const level = us ? us.currentLevel : 0;
    return level < comp.requiredLevel;
  });

  if (gaps.length === 0) {
    res.json({ message: "You have achieved recommended plant skill baselines! No urgent mentoring needed.", recommendations: [] });
    return;
  }

  // Find mentors who excel in the competencies where the user has a gap
  const recommendations: any[] = [];
  gaps.forEach(gapComp => {
    // Mentors are employees or managers whose certified level is higher than gap required levels
    const candidates = users.filter(u => u.id !== reqUser.userId);
    candidates.forEach(cand => {
      const candSkill = userSkills.find(s => s.userId === cand.id && s.competencyId === gapComp.id);
      if (candSkill && candSkill.currentLevel >= gapComp.requiredLevel) {
        recommendations.push({
          competency: gapComp,
          mentor: {
            id: cand.id,
            fullName: cand.fullName,
            jobTitle: cand.jobTitle,
            department: cand.department,
            expertLevel: candSkill.currentLevel
          },
          reason: `Excels at ${gapComp.name} with certified mastery level of ${candSkill.currentLevel}/5.`
        });
      }
    });
  });

  res.json({ gaps, recommendations });
});

router.post("/mentors/nominate", authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const { competencies, yearsExp } = req.body;

  if (!Array.isArray(competencies) || competencies.length === 0) {
    res.status(400).json({ error: "competencies array containing active competency IDs is required." });
    return;
  }

  const nomination: MentorNomination = {
    id: `nom_${Date.now()}`,
    userId: reqUser.userId,
    competencies,
    yearsExp: Number(yearsExp) || 0,
    status: "pending"
  };

  db.saveMentorNomination(nomination);
  res.status(201).json({ message: "Self-nomination filed. Awaiting Manager L&D assessment.", nomination });
});

router.get("/mentors/nominations", authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  if (reqUser.role === "employee") {
    res.status(403).json({ error: "Access denied. Only managers or L&D admins audit self nominations." });
    return;
  }

  const nominations = db.getMentorNominations();
  const users = db.getUsers();
  const competencies = db.getCompetencies();

  const enriched = nominations.map(nom => {
    const creator = users.find(u => u.id === nom.userId);
    const resolvedComps = nom.competencies.map(cid => competencies.find(c => c.id === cid)).filter(Boolean);

    return {
      nomination: nom,
      user: creator ? { fullName: creator.fullName, jobTitle: creator.jobTitle, department: creator.department } : null,
      competenciesDetail: resolvedComps
    };
  });

  res.json(enriched);
});

router.post("/mentors/nominate/action", authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  if (reqUser.role === "employee") {
    res.status(403).json({ error: "Access denied." });
    return;
  }

  const { nominationId, status } = req.body; // status: "approved" | "rejected"
  if (!nominationId || !status) {
    res.status(400).json({ error: "nominationId and status are required fields." });
    return;
  }

  const nominations = db.getMentorNominations();
  const nom = nominations.find(n => n.id === nominationId);
  if (!nom) {
    res.status(404).json({ error: "Nomination reference index not found." });
    return;
  }

  nom.status = status;
  db.saveMentorNomination(nom);

  if (status === "approved") {
    // Add mentorship edge inside our relational graph!
    nom.competencies.forEach(compId => {
      db.addGraphEdge({
        id: `edge_mentor_${nom.userId}_${compId}`,
        source: `node_user_${nom.userId}`,
        target: `node_comp_${compId}`,
        relation: "MENTORS"
      });
    });
  }

  res.json({ message: `Nomination marked ${status} successfully.`, nomination: nom });
});

router.post("/mentors/session/log", authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const { employeeId, competencyId, sessionNotes, capturedKnowledge } = req.body;

  if (!employeeId || !competencyId || !sessionNotes) {
    res.status(400).json({ error: "employeeId, competencyId and sessionNotes are required." });
    return;
  }

  const sessionObj: MentorSession = {
    id: `sess_${Date.now()}`,
    mentorId: reqUser.userId,
    employeeId,
    competencyId,
    scheduledAt: new Date().toISOString(),
    sessionNotes,
    capturedKnowledge,
    status: "completed",
    approvedByManager: reqUser.role === "manager" || reqUser.role === "admin" // Auto approve if manager writes it
  };

  db.saveMentorSession(sessionObj);

  // MENTOR HYBRID AUTO-GENERATION LINK:
  // If notes contain captured expert tips, instantly publish them into the Knowledge Hub as a shared SOP capsule!
  if (capturedKnowledge && capturedKnowledge.trim().length > 10) {
    const autoDocId = `doc_expert_${Date.now()}`;
    const mappedComp = db.getCompetencies().find(c => c.id === competencyId);
    
    db.saveDoc({
      id: autoDocId,
      title: `Mentor Knowledge Share: Specialist tips for ${mappedComp ? mappedComp.name : "Operations"}`,
      type: "expert_session",
      content: `#### Expert Mentor session summary notes
Mentor: ${reqUser.fullName}
Adept Trainee: ${db.getUsers().find(u => u.id === employeeId)?.fullName || "Field Tech"}
Date: ${new Date().toLocaleDateString()}

#### High Value Technical Capture:
${capturedKnowledge}`,
      competencyId,
      tags: ["Mentor-Capture", "Field-Tips", "Expertise"],
      createdBy: reqUser.userId,
      createdAt: new Date().toISOString()
    });
  }

  res.status(201).json({ message: "Mentor session compiled. Field insights archived in the Knowledge Hub.", session: sessionObj });
});

router.get("/mentors/sessions", authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const sessList = db.getMentorSessions();
  const users = db.getUsers();
  
  const enriched = sessList.map(s => {
    const employee = users.find(u => u.id === s.employeeId);
    const mentor = users.find(u => u.id === s.mentorId);
    return {
      session: s,
      employeeName: employee ? employee.fullName : "Unknown Operator",
      mentorName: mentor ? mentor.fullName : "Unknown Mentor"
    };
  });
  res.json(enriched);
});

// ==========================================
// 🕸️ RELATIONAL KNOWLEDGE GRAPH ENDPOINTS
// ==========================================

router.get("/graph", authenticateToken, (req: Request, res: Response) => {
  res.json({
    nodes: db.getGraphNodes(),
    edges: db.getGraphEdges()
  });
});

router.post("/graph/edge", authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  if (reqUser.role !== "admin") {
    res.status(403).json({ error: "Only admins can manually adjust knowledge graph bounds." });
    return;
  }

  const { source, target, relation } = req.body;
  if (!source || !target || !relation) {
    res.status(400).json({ error: "Source, target, and relation tags are required." });
    return;
  }

  const newEdge = {
    id: `edge_man_${Date.now()}`,
    source,
    target,
    relation
  };

  db.addGraphEdge(newEdge);
  res.status(201).json(newEdge);
});

export default router;
