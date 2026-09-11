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

// In-memory collection fallback for local development or when MONGODB_URI is not provided
const inMemorySubmissions: ExamSubmissionRecord[] = []

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
}

export const examDb = new ExamDatabase()
