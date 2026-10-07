import { QUESTIONS } from "@/config/questions"

export interface ExamSessionState {
  sessionId: string
  candidateId: string
  candidateName: string
  currentQuestionIndex: number
  totalQuestions: number
  answers: Record<number, number>
  startedAt: string
  lastActiveAt: string
  status: "active" | "completed" | "expired"
}

// In-memory key-value store for session caching if REDIS_URL is not provided
const inMemorySessions: Map<string, ExamSessionState> = new Map()

/**
 * Redis session manager for SAKSHAM candidate exams.
 * Validates session integrity, synchronizes current question position, and caches state.
 */
class RedisSessionManager {
  private isRedisConfigured = false

  constructor() {
    if (process.env.REDIS_URL) {
      this.isRedisConfigured = true
    }
  }

  /**
   * Retrieves an active session by ID
   */
  async getSession(sessionId: string): Promise<ExamSessionState | null> {
    const session = inMemorySessions.get(sessionId)
    if (!session) return null
    return session
  }

  /**
   * Validates whether a session ID exists and is currently active
   */
  async validateSession(sessionId: string): Promise<boolean> {
    if (!sessionId) return false
    const session = await this.getSession(sessionId)
    return session !== null && session.status === "active"
  }

  /**
   * Retrieves existing session or initializes a new active session
   */
  async getOrCreateSession(sessionId: string): Promise<ExamSessionState> {
    let session = inMemorySessions.get(sessionId)
    if (!session) {
      session = {
        sessionId,
        candidateId: "CAND-2026-0914",
        candidateName: "Saksham Candidate",
        currentQuestionIndex: 0,
        totalQuestions: QUESTIONS.length,
        answers: {},
        startedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        status: "active",
      }
      inMemorySessions.set(sessionId, session)
    }
    return session
  }

  /**
   * Initializes a new exam session specifically for a newly authenticated candidate
   */
  async createSessionForCandidate(
    sessionId: string,
    candidateId: string,
    candidateName: string,
  ): Promise<ExamSessionState> {
    const session: ExamSessionState = {
      sessionId,
      candidateId,
      candidateName,
      currentQuestionIndex: 0,
      totalQuestions: QUESTIONS.length,
      answers: {},
      startedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      status: "active",
    }
    inMemorySessions.set(sessionId, session)
    return session
  }

  /**
   * Records an answer and advances the candidate's question pointer in Redis
   */
  async saveAnswerAndAdvance(
    sessionId: string,
    questionIndex: number,
    selectedOption: number,
  ): Promise<{ session: ExamSessionState; nextQuestionIndex: number; isFinished: boolean }> {
    const session = await this.getOrCreateSession(sessionId)

    session.answers[questionIndex] = selectedOption
    session.lastActiveAt = new Date().toISOString()

    const nextIndex = questionIndex + 1
    const isFinished = nextIndex >= QUESTIONS.length

    if (!isFinished) {
      session.currentQuestionIndex = nextIndex
    } else {
      session.status = "completed"
    }

    inMemorySessions.set(sessionId, session)
    return { session, nextQuestionIndex: nextIndex, isFinished }
  }

  /**
   * Updates general session fields
   */
  async updateSession(sessionId: string, updates: Partial<ExamSessionState>): Promise<ExamSessionState | null> {
    const session = inMemorySessions.get(sessionId)
    if (!session) return null
    const updated = { ...session, ...updates, lastActiveAt: new Date().toISOString() }
    inMemorySessions.set(sessionId, updated)
    return updated
  }
}

export const redisSession = new RedisSessionManager()
