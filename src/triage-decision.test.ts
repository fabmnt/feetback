import { describe, expect, it } from "vitest";
import type { Id } from "../convex/_generated/dataModel";
import {
  buildDecisionRequest,
  type CandidateIssue,
  interpretAnswers,
  type TriageItem,
} from "../convex/lib/triageDecision";

const item: TriageItem = {
  content: "The Log in button does nothing on Safari",
  pageUrl: "/login",
  reporterType: "complaint",
};

const candidates: CandidateIssue[] = [
  {
    issueId: "issue_login" as Id<"feedbackIssues">,
    examples: ["Login is dead on Safari", "Can't sign in on iPad"],
  },
  {
    issueId: "issue_dark" as Id<"feedbackIssues">,
    examples: ["Please add dark mode"],
  },
];

describe("buildDecisionRequest", () => {
  it("asks only for the Feedback Type when there are no candidate issues", () => {
    const { input, questions } = buildDecisionRequest(item, []);

    expect(input).toBe(
      [
        "Feedback: The Log in button does nothing on Safari",
        "Page: /login",
        "Reporter-selected type (may be wrong or missing): complaint",
      ].join("\n"),
    );
    expect(Object.keys(questions)).toEqual(["feedback_type"]);
    expect(Object.keys(questions.feedback_type?.criteria ?? {})).toEqual([
      "bug_report",
      "complaint",
      "security_concern",
      "improvement_suggestion",
      "performance_issue",
      "question",
      "other",
    ]);
  });

  it("offers each candidate issue with its examples and a no-match option", () => {
    const { questions } = buildDecisionRequest(item, candidates);

    expect(questions.same_issue?.criteria).toEqual({
      issue_1:
        'Existing issue reported as: "Login is dead on Safari" / "Can\'t sign in on iPad"',
      issue_2: 'Existing issue reported as: "Please add dark mode"',
      other: "A different problem or request than all the existing issues.",
    });
  });

  it("marks a missing Reporter type and page as unknown hints", () => {
    const { input } = buildDecisionRequest(
      { content: "Hi", reporterType: "uncategorized" },
      [],
    );

    expect(input).toContain("Page: unknown");
    expect(input).toContain(
      "Reporter-selected type (may be wrong or missing): none",
    );
  });
});

describe("interpretAnswers", () => {
  it("applies a confident type and a confident issue match", () => {
    const result = interpretAnswers(
      {
        feedback_type: { choice: "bug_report", confidence: 0.95 },
        same_issue: { choice: "issue_1", confidence: 0.9 },
      },
      item,
      candidates,
    );

    expect(result).toEqual({
      type: "bug_report",
      typeConfidence: 0.95,
      isTypeConfident: true,
      targetIssueId: "issue_login",
      groupingConfidence: 0.9,
      needsReview: false,
    });
  });

  it("keeps the Reporter type and flags review when the type is uncertain", () => {
    const result = interpretAnswers(
      { feedback_type: { choice: "bug_report", confidence: 0.69 } },
      item,
      [],
    );

    expect(result).toMatchObject({
      type: "complaint",
      isTypeConfident: false,
      needsReview: true,
    });
  });

  it("keeps uncategorized when the type is uncertain and the Reporter chose none", () => {
    const result = interpretAnswers(
      { feedback_type: { choice: "question", confidence: 0.5 } },
      { ...item, reporterType: "uncategorized" },
      [],
    );

    expect(result.type).toBe("uncategorized");
  });

  it("applies the model type at exactly the confidence threshold", () => {
    const result = interpretAnswers(
      { feedback_type: { choice: "bug_report", confidence: 0.7 } },
      item,
      [],
    );

    expect(result).toMatchObject({ type: "bug_report", needsReview: false });
  });

  it("does not join an issue when the match is uncertain", () => {
    const result = interpretAnswers(
      {
        feedback_type: { choice: "bug_report", confidence: 0.9 },
        same_issue: { choice: "issue_1", confidence: 0.6 },
      },
      item,
      candidates,
    );

    expect(result).toMatchObject({ targetIssueId: null, needsReview: true });
  });

  it("does not join an issue for the no-match answer or an unknown option", () => {
    for (const choice of ["other", "issue_9"]) {
      const result = interpretAnswers(
        {
          feedback_type: { choice: "bug_report", confidence: 0.9 },
          same_issue: { choice, confidence: 0.9 },
        },
        item,
        candidates,
      );

      expect(result.targetIssueId).toBeNull();
    }
  });

  it("rejects a missing or unknown Feedback Type answer", () => {
    expect(() => interpretAnswers({}, item, [])).toThrow(
      "Unexpected Feedback Type answer: none",
    );
    expect(() =>
      interpretAnswers(
        { feedback_type: { choice: "uncategorized", confidence: 0.9 } },
        item,
        [],
      ),
    ).toThrow("Unexpected Feedback Type answer: uncategorized");
  });
});
