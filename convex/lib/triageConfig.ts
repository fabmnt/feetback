// Values validated by the offline evaluation in scripts/ai-eval (60 items,
// plus 200 distractor issues). Changing the embedding model or its dimensions
// requires re-embedding every stored Feedback Item.
export const EMBEDDING_MODEL = "gemini-embedding-2";
export const EMBEDDING_DIMENSIONS = 768;
// Recommended task prefix for symmetric clustering with gemini-embedding-2.
export const EMBEDDING_PREFIX = "task: clustering | query: ";
export const DECISION_MODEL = "gemini-decision-1";

// Existing issues offered to the decision model; 5 missed the right issue
// once a Customer had ~200 issues.
export const CANDIDATE_ISSUE_LIMIT = 10;
// Similar items fetched to find the candidate issues (several items can share
// one issue).
export const SIMILAR_ITEM_LIMIT = 40;
export const EXAMPLES_PER_CANDIDATE = 2;
// Below this, answers are not applied automatically and the issue is flagged
// for review.
export const CONFIDENCE_THRESHOLD = 0.7;
