import { NextResponse } from "next/server"
import { examDb } from "@/lib/db/mongodb"
import { redisSession } from "@/lib/db/redis"
import type { AnswerSubmissionPayload, AnswerSubmissionResponse } from "@/types"

/**
 * POST /api/exam/answer
 *
 * 1. Validates the candidate's exam session in Redis.
 * 2. Checks and logs the answer against MongoDB.
 * 3. Flags gesture-mode answers for human invigilator review.
 * 4. Advances candidate state in Redis to the next question and returns it.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<AnswerSubmissionPayload>
    const { sessionId, questionId, selectedOption, mode, confidence, metadata } = body

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: "Missing required field: sessionId" },
        { status: 400 },
      )
    }

    if (questionId === undefined || selectedOption === undefined) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: questionId or selectedOption" },
        { status: 400 },
      )
    }

    // Step 1: Validate session in Redis (initializes or verifies active state)
    const session = await redisSession.getOrCreateSession(sessionId)
    if (session.status !== "active") {
      return NextResponse.json(
        { success: false, message: `Session is ${session.status}. Submissions not accepted.` },
        { status: 403 },
      )
    }

    const currentQIndex =
      typeof questionId === "number" ? questionId : parseInt(questionId, 10) || 0

    // Step 2: Check the answer and record submission in MongoDB
    // Automatically flags gesture/sign mode answers for human invigilator review
    const submission = await examDb.recordSubmission({
      sessionId,
      questionId: currentQIndex,
      selectedOption: Number(selectedOption),
      mode: mode || "sign",
      confidence: confidence ?? 0.95,
      metadata,
    })

    // Step 3: Advance session state in Redis to next question
    const { nextQuestionIndex, isFinished } = await redisSession.saveAnswerAndAdvance(
      sessionId,
      currentQIndex,
      Number(selectedOption),
    )

    // Retrieve next question details from MongoDB
    let nextQuestionData = undefined
    if (!isFinished) {
      const nextQ = await examDb.getQuestionById(nextQuestionIndex)
      if (nextQ) {
        nextQuestionData = {
          ...nextQ,
          id: nextQuestionIndex,
          questionNumber: nextQuestionIndex + 1,
        }
      }
    }

    const responseData: AnswerSubmissionResponse = {
      success: true,
      saved: true,
      questionId: currentQIndex,
      selectedOption: Number(selectedOption),
      nextQuestion: nextQuestionData,
      isFinished,
      flaggedForReview: submission.requiresHumanReview,
      reviewReason: submission.reviewReason,
      message: submission.requiresHumanReview
        ? "Answer saved and flagged for invigilator review (gesture mode)."
        : "Answer recorded successfully.",
    }

    return NextResponse.json(responseData, { status: 200 })
  } catch (error) {
    console.error("[/api/exam/answer] Error handling answer submission:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error processing answer." },
      { status: 500 },
    )
  }
}
