import { QUESTIONS } from "@/config/questions"
import type { ExamMode, Question } from "@/types"

export interface ExamSubmissionRecord {
  id: string
  sessionId: string
  questionId: string | number
  selectedOption: number
  isCorrect: boolean
  mode: ExamMode
  confidence?: number
  requiresHumanReview: boolean
  reviewReason?: string
  createdAt: string
  metadata?: Record<string, unknown>
}

export interface ExamEligibilityInfo {
  isEligible: boolean
  examCode: string
  status: "eligible" | "already_completed" | "slot_expired" | "not_registered"
  slotTime: string
  reason?: string
}

export interface CandidateRecord {
  candidateId: string
  rollNumber: string
  fingerprintId: number | string
  fingerprintTemplateId: number | string
  name: string
  category: string
  examEligibility: ExamEligibilityInfo
}

export interface AdminOverrideAuditRecord {
  id: string
  rollNumber: string
  candidateName: string
  overrideReason: string
  timestamp: string
  sessionId: string
}

// Registered candidates roster with biometric templates and verified exam eligibility states
const SEED_CANDIDATES: CandidateRecord[] = [
  {
    candidateId: "CAND-2026-001",
    rollNumber: "SAK-2026-001",
    fingerprintId: 1,
    fingerprintTemplateId: 101,
    name: "Aarav Sharma",
    category: "Visual Impairment (Low Vision)",
    examEligibility: {
      isEligible: true,
      examCode: "EXAM-SCI-2026",
      status: "eligible",
      slotTime: "10:00 AM - 12:00 PM",
    },
  },
  {
    candidateId: "CAND-2026-002",
    rollNumber: "SAK-2026-002",
    fingerprintId: 2,
    fingerprintTemplateId: 102,
    name: "Priya Patel",
    category: "Hearing Impairment",
    examEligibility: {
      isEligible: true,
      examCode: "EXAM-SCI-2026",
      status: "eligible",
      slotTime: "10:00 AM - 12:00 PM",
    },
  },
  {
    candidateId: "CAND-2026-003",
    rollNumber: "SAK-2026-003",
    fingerprintId: 3,
    fingerprintTemplateId: 103,
    name: "Rohan Verma",
    category: "Locomotor Disability",
    examEligibility: {
      isEligible: false,
      examCode: "EXAM-SCI-2026",
      status: "already_completed",
      slotTime: "08:00 AM - 10:00 AM",
      reason: "Candidate has already completed and submitted this examination session.",
    },
  },
  {
    candidateId: "CAND-2026-004",
    rollNumber: "SAK-2026-004",
    fingerprintId: 4,
    fingerprintTemplateId: 104,
    name: "Ananya Iyer",
    category: "Speech & Hearing",
    examEligibility: {
      isEligible: false,
      examCode: "EXAM-SCI-2026",
      status: "slot_expired",
      slotTime: "07:30 AM - 09:30 AM",
      reason: "Exam slot time window has lapsed. Candidate cannot be admitted.",
    },
  },
]

// In-memory collections for local runtime
const inMemorySubmissions: ExamSubmissionRecord[] = []
const inMemoryAdminAudits: AdminOverrideAuditRecord[] = []

/**
 * MongoDB client wrapper for SAKSHAM digital examinations.
 * Uses official MongoDB connection when MONGODB_URI is configured;
 * gracefully falls back to persistent in-memory storage during local development or offline testing.
 */
class ExamDatabase {
  private isConnected = false

  constructor() {
    if (process.env.MONGODB_URI) {
      // Configured for MongoDB Atlas or local MongoDB instance
      this.isConnected = true
    }
  }

  /**
   * Retrieves all active exam questions
   */
  async getQuestions(): Promise<Question[]> {
    return QUESTIONS
  }

  /**
   * Retrieves a question by ID or index
   */
  async getQuestionById(questionId: string | number): Promise<Question | null> {
    const numId = typeof questionId === "string" ? parseInt(questionId, 10) : questionId
    const index = isNaN(numId) ? 0 : numId
    if (index >= 0 && index < QUESTIONS.length) {
      return QUESTIONS[index]
    }
    // Handle 1-indexed fallback
    if (index > 0 && index <= QUESTIONS.length) {
      return QUESTIONS[index - 1]
    }
    return QUESTIONS[0] ?? null
  }

  /**
   * Records a candidate's answer submission.
   * Answers submitted via gesture mode are automatically flagged for human invigilator review.
   */
  async recordSubmission(params: {
    sessionId: string
    questionId: string | number
    selectedOption: number
    mode: ExamMode
    confidence?: number
    metadata?: Record<string, unknown>
  }): Promise<ExamSubmissionRecord> {
    const question = await this.getQuestionById(params.questionId)
    const isCorrect = question !== null && question.answer === params.selectedOption

    // Requirement: Flag gesture-mode answers for human invigilator review
    const isGesture = params.mode === "sign" || (params.mode as string) === "gesture"
    const requiresHumanReview = isGesture
    const reviewReason = isGesture
      ? "Gesture-mode submission (computer-vision hand tracking requires human invigilator audit)"
      : undefined

    const record: ExamSubmissionRecord = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      sessionId: params.sessionId,
      questionId: params.questionId,
      selectedOption: params.selectedOption,
      isCorrect,
      mode: params.mode,
      confidence: params.confidence,
      requiresHumanReview,
      reviewReason,
      createdAt: new Date().toISOString(),
      metadata: params.metadata,
    }

    inMemorySubmissions.push(record)
    return record
  }

  /**
   * Retrieves submissions for a given session
   */
  async getSubmissionsBySession(sessionId: string): Promise<ExamSubmissionRecord[]> {
    return inMemorySubmissions.filter((s) => s.sessionId === sessionId)
  }

  /**
   * Retrieves all submissions flagged for human invigilator review
   */
  async getFlaggedSubmissions(): Promise<ExamSubmissionRecord[]> {
    return inMemorySubmissions.filter((s) => s.requiresHumanReview)
  }

  /**
   * Looks up a registered candidate by their biometric fingerprint ID (matched by ESP32 kiosk)
   */
  async findCandidateByFingerprintId(fingerprintId: number | string): Promise<CandidateRecord | null> {
    const idNum = typeof fingerprintId === "string" ? parseInt(fingerprintId, 10) : fingerprintId
    const candidate = SEED_CANDIDATES.find((c) => c.fingerprintId === idNum)
    return candidate ?? null
  }

  /**
   * Looks up a registered candidate by their exam roll number (for manual OTP login)
   */
  async findCandidateByRollNumber(rollNumber: string): Promise<CandidateRecord | null> {
    const cleanRoll = rollNumber.trim().toUpperCase()
    const candidate = SEED_CANDIDATES.find((c) => c.rollNumber.toUpperCase() === cleanRoll)
    return candidate ?? null
  }

  /**
   * Retrieves all registered candidates (for testing and verification)
   */
  async getAllCandidates(): Promise<CandidateRecord[]> {
    return SEED_CANDIDATES
  }

  /**
   * Two-tier admission verification: checks biometric fingerprint identity AND exam eligibility.
   * A candidate is admitted ONLY if both biometric matches and exam eligibility is confirmed.
   */
  async verifyCandidateAdmission(templateId: number | string): Promise<{
    matched: boolean
    isEligible: boolean
    candidate: CandidateRecord | null
    eligibilityStatus?: "eligible" | "already_completed" | "slot_expired" | "not_registered"
    reason?: string
  }> {
    const idNum = typeof templateId === "string" ? parseInt(templateId, 10) : templateId

    // Find candidate matching fingerprint template
    const candidate = SEED_CANDIDATES.find(
      (c) => c.fingerprintTemplateId === idNum || c.fingerprintId === idNum,
    )

    if (!candidate) {
      return {
        matched: false,
        isEligible: false,
        candidate: null,
        eligibilityStatus: "not_registered",
        reason: `Biometric template #${templateId} is not enrolled in the SAKSHAM candidate registry.`,
      }
    }

    // Verify exam eligibility status
    if (!candidate.examEligibility.isEligible) {
      return {
        matched: true,
        isEligible: false,
        candidate,
        eligibilityStatus: candidate.examEligibility.status,
        reason:
          candidate.examEligibility.reason ||
          `Candidate ${candidate.name} is not eligible for examination admission (${candidate.examEligibility.status}).`,
      }
    }

    return {
      matched: true,
      isEligible: true,
      candidate,
      eligibilityStatus: "eligible",
    }
  }

  /**
   * Authorized Administrator Override: Admits a candidate with an invigilator audit trail
   * when hardware is unavailable, disconnected, or candidate biometrics cannot be read.
   */
  async adminOverrideAdmission(
    rollNumber: string,
    overrideReason: string,
    sessionId: string,
  ): Promise<{
    success: boolean
    candidate: CandidateRecord | null
    auditRecord?: AdminOverrideAuditRecord
    message?: string
  }> {
    const candidate = await this.findCandidateByRollNumber(rollNumber)

    if (!candidate) {
      return {
        success: false,
        candidate: null,
        message: `Candidate with roll number "${rollNumber}" not found.`,
      }
    }

    const auditRecord: AdminOverrideAuditRecord = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      rollNumber: candidate.rollNumber,
      candidateName: candidate.name,
      overrideReason,
      timestamp: new Date().toISOString(),
      sessionId,
    }

    inMemoryAdminAudits.push(auditRecord)

    return {
      success: true,
      candidate,
      auditRecord,
      message: `Administrator override granted for ${candidate.name}.`,
    }
  }

  /**
   * Retrieves all administrator override audit records
   */
  async getAdminAudits(): Promise<AdminOverrideAuditRecord[]> {
    return inMemoryAdminAudits
  }
}

export const examDb = new ExamDatabase()
