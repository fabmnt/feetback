// Builds the decision request for one Feedback Item and turns the model's
// answers into a triage result. Pure functions: no I/O.
import {
  FEEDBACK_TYPES,
  type FeedbackItemType,
  type FeedbackType,
} from "../../src/lib/feedback-types";
import type { Id } from "../_generated/dataModel";
import type { DecisionAnswer, DecisionQuestion } from "./gemini";
import { CONFIDENCE_THRESHOLD } from "./triageConfig";

// Decision API sorts option keys alphabetically; "other" must sort after
// "issue_*".
const NO_MATCH_KEY = "other";
const CANDIDATE_KEY_PREFIX = "issue_";

const FEEDBACK_TYPE_CRITERIA: Record<FeedbackType, string> = {
  bug_report:
    "Something in the product does not work as expected or shows wrong results.",
  complaint:
    "Dissatisfaction with pricing, policy, support, or the service in general, not a product defect.",
  security_concern:
    "Possible exposure of private data, access to data of other accounts, or a session or permission problem that lets the wrong person see or change data.",
  improvement_suggestion:
    "A request for a new feature or a change to how the product works.",
  performance_issue: "The product works but is slow, freezes, or lags.",
  question: "The Reporter asks how to do something or asks for information.",
  other: "Praise, test messages, or anything that fits no other category.",
};

export type TriageItem = {
  content: string;
  pageUrl?: string;
  reporterType: FeedbackItemType;
};

export type CandidateIssue = {
  issueId: Id<"feedbackIssues">;
  examples: string[];
};

export type TriageQuestionKey = "feedback_type" | "same_issue";

export type TriageResult = {
  type: FeedbackType;
  typeConfidence: number;
  targetIssueId: Id<"feedbackIssues"> | null;
  groupingConfidence?: number;
  needsReview: boolean;
};

export function buildDecisionRequest(
  item: TriageItem,
  candidates: CandidateIssue[],
) {
  const reporterHint =
    item.reporterType === "uncategorized" ? "none" : item.reporterType;
  const input = [
    `Feedback: ${item.content}`,
    `Page: ${item.pageUrl ?? "unknown"}`,
    `Reporter-selected type (may be wrong or missing): ${reporterHint}`,
  ].join("\n");

  const questions: Partial<Record<TriageQuestionKey, DecisionQuestion>> = {
    feedback_type: {
      type: "choice",
      instructions:
        "Which category best describes the main point of this feedback? The Reporter-selected type is only a hint and can be wrong.",
      criteria: FEEDBACK_TYPE_CRITERIA,
    },
  };

  if (candidates.length > 0) {
    const criteria: Record<string, string> = {};
    candidates.forEach((candidate, index) => {
      const examples = candidate.examples
        .map((example) => `"${example}"`)
        .join(" / ");
      criteria[`${CANDIDATE_KEY_PREFIX}${index + 1}`] =
        `Existing issue reported as: ${examples}`;
    });
    criteria[NO_MATCH_KEY] =
      "A different problem or request than all the existing issues.";

    questions.same_issue = {
      type: "choice",
      instructions:
        "Does this feedback describe the same underlying problem or request as one of the existing issues? Only pick an issue if fixing that issue would also resolve this feedback.",
      criteria,
    };
  }

  return { input, questions };
}

// Low-confidence answers are never applied silently: the item keeps its own
// issue (or the Reporter's type) and the issue is flagged for review.
export function interpretAnswers(
  answers: Partial<Record<TriageQuestionKey, DecisionAnswer>>,
  item: TriageItem,
  candidates: CandidateIssue[],
): TriageResult {
  const typeAnswer = answers.feedback_type;
  const modelType = FEEDBACK_TYPES.find((type) => type === typeAnswer?.choice);

  if (!typeAnswer || !modelType) {
    throw new Error(
      `Unexpected Feedback Type answer: ${typeAnswer?.choice ?? "none"}`,
    );
  }

  const isTypeConfident = typeAnswer.confidence >= CONFIDENCE_THRESHOLD;
  const reporterType = FEEDBACK_TYPES.find(
    (type) => type === item.reporterType,
  );
  const type = isTypeConfident || !reporterType ? modelType : reporterType;

  const issueAnswer = answers.same_issue;
  const isGroupingConfident =
    !issueAnswer || issueAnswer.confidence >= CONFIDENCE_THRESHOLD;
  const chosenIndex = issueAnswer?.choice.startsWith(CANDIDATE_KEY_PREFIX)
    ? Number(issueAnswer.choice.slice(CANDIDATE_KEY_PREFIX.length)) - 1
    : -1;
  const targetIssueId = isGroupingConfident
    ? (candidates[chosenIndex]?.issueId ?? null)
    : null;

  return {
    type,
    typeConfidence: typeAnswer.confidence,
    targetIssueId,
    groupingConfidence: issueAnswer?.confidence,
    needsReview: !isTypeConfident || !isGroupingConfident,
  };
}
