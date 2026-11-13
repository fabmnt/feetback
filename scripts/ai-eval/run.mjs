// Offline evaluation of AI grouping and classification for Feedback Items.
// Calls the Gemini API (gemini-embedding-2 + gemini-decision-1) with the key in .env.local.
// Usage: node scripts/ai-eval/run.mjs [--out results.json] [--distractors distractors.json] [--candidates 10]
// Distractors are pre-existing single-item issues ({ id, content }) the test items must not join.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const EMBEDDING_MODEL = "gemini-embedding-2";
const EMBEDDING_DIMENSIONS = 768;
// Recommended task prefix for symmetric clustering with gemini-embedding-2.
const EMBEDDING_PREFIX = "task: clustering | query: ";
const DECISION_MODEL = "gemini-decision-1";
const DEFAULT_CANDIDATE_LIMIT = 10;
const EXAMPLES_PER_CANDIDATE = 2;
const CONFIDENCE_THRESHOLD = 0.7;
const EMBEDDING_ONLY_THRESHOLDS = [0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9];
// Decision API sorts option keys alphabetically; "other" must sort after "issue_*".
const NO_MATCH_KEY = "other";

const FEEDBACK_TYPE_CRITERIA = {
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

const scriptDir = dirname(fileURLToPath(import.meta.url));
const dataset = JSON.parse(
  readFileSync(join(scriptDir, "dataset.json"), "utf8"),
);

process.loadEnvFile(join(scriptDir, "../../.env.local"));
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing in .env.local");
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

const outPath = argValue("--out");
const distractorsPath = argValue("--distractors");
const CANDIDATE_LIMIT = Number(
  argValue("--candidates") ?? DEFAULT_CANDIDATE_LIMIT,
);

// Free tier returns 429 with a retryDelay, and a newly enabled API can return
// sporadic 403s for a few minutes while the activation propagates.
const RETRYABLE_STATUSES = new Set([403, 429, 500, 503]);
const MAX_ATTEMPTS = 6;
// Free tier counts every text in a batch as one embed request (100 per minute).
const EMBEDDING_BATCH_SIZE = 50;
const DEFAULT_RETRY_DELAY_MS = 10_000;
const MAX_RETRY_DELAY_MS = 120_000;

function retryDelayMs(errorText) {
  const match = errorText.match(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/);
  return match ? Number(match[1]) * 1000 + 1000 : DEFAULT_RETRY_DELAY_MS;
}

const REQUEST_TIMEOUT_MS = 30_000;

async function callGemini(path, body) {
  for (let attempt = 1; ; attempt++) {
    const startedAt = performance.now();
    const response = await fetch(`${API_BASE}/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }).catch((error) => {
      if (error.name !== "TimeoutError" || attempt >= MAX_ATTEMPTS) {
        throw error;
      }
      return null;
    });
    const latencyMs = Math.round(performance.now() - startedAt);

    if (!response) {
      process.stdout.write("[timeout, retrying]");
      continue;
    }

    if (response.ok) {
      return { json: await response.json(), latencyMs };
    }

    const errorText = await response.text();
    const delay = retryDelayMs(errorText);
    // Daily quotas answer with retry delays of hours; fail instead of hanging.
    const canRetry =
      RETRYABLE_STATUSES.has(response.status) &&
      attempt < MAX_ATTEMPTS &&
      delay <= MAX_RETRY_DELAY_MS;

    if (!canRetry) {
      throw new Error(
        `Gemini ${path} failed (${response.status}): ${errorText}`,
      );
    }

    process.stdout.write(`[${response.status}, retry in ${delay / 1000}s]`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

async function embedAll(items) {
  const embeddings = [];
  for (let start = 0; start < items.length; start += EMBEDDING_BATCH_SIZE) {
    const { json } = await callGemini(
      `models/${EMBEDDING_MODEL}:batchEmbedContents`,
      {
        requests: items
          .slice(start, start + EMBEDDING_BATCH_SIZE)
          .map((item) => ({
            model: `models/${EMBEDDING_MODEL}`,
            content: {
              parts: [{ text: `${EMBEDDING_PREFIX}${item.content}` }],
            },
            output_dimensionality: EMBEDDING_DIMENSIONS,
          })),
      },
    );
    embeddings.push(...json.embeddings.map((embedding) => embedding.values));
  }
  return embeddings;
}

function cosine(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / Math.sqrt(normA * normB);
}

// Best similarity per predicted group, using the closest item of each group.
function rankGroups(itemIndex, groups, embeddings) {
  return groups
    .map((group, groupIndex) => ({
      groupIndex,
      similarity: Math.max(
        ...group.map((member) =>
          cosine(embeddings[itemIndex], embeddings[member]),
        ),
      ),
    }))
    .sort((a, b) => b.similarity - a.similarity);
}

function buildInput(item) {
  return [
    `Feedback: ${item.content}`,
    `Page: ${item.pageUrl}`,
    `Reporter-selected type (may be wrong or missing): ${item.reporterType ?? "none"}`,
  ].join("\n");
}

function buildQuestions(candidates, groups, items) {
  const questions = {
    feedback_type: {
      type: "choice",
      instructions:
        "Which category best describes the main point of this feedback? The Reporter-selected type is only a hint and can be wrong.",
      criteria: FEEDBACK_TYPE_CRITERIA,
    },
  };

  if (candidates.length === 0) {
    return questions;
  }

  const criteria = {};
  candidates.forEach((candidate, index) => {
    const examples = groups[candidate.groupIndex]
      .slice(0, EXAMPLES_PER_CANDIDATE)
      .map((member) => `"${items[member].content}"`)
      .join(" / ");
    criteria[`issue_${index + 1}`] = `Existing issue reported as: ${examples}`;
  });
  criteria[NO_MATCH_KEY] =
    "A different problem or request than all the existing issues.";

  questions.same_issue = {
    type: "choice",
    instructions:
      "Does this feedback describe the same underlying problem or request as one of the existing issues? Only pick an issue if fixing that issue would also resolve this feedback.",
    criteria,
  };
  return questions;
}

function majorityExpectedGroup(group, items) {
  const counts = new Map();
  for (const member of group) {
    const key = items[member].expectedGroup;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function isTypeCorrect(item, type) {
  return (
    type === item.expectedType || (item.acceptableTypes ?? []).includes(type)
  );
}

function pairwiseScores(assignments, items) {
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const predictedSame = assignments[i] === assignments[j];
      const expectedSame = items[i].expectedGroup === items[j].expectedGroup;
      if (predictedSame && expectedSame) truePositives++;
      if (predictedSame && !expectedSame) falsePositives++;
      if (!predictedSame && expectedSame) falseNegatives++;
    }
  }
  const precision = truePositives / (truePositives + falsePositives || 1);
  const recall = truePositives / (truePositives + falseNegatives || 1);
  const f1 = (2 * precision * recall) / (precision + recall || 1);
  return { precision, recall, f1 };
}

function embeddingOnlyGrouping(threshold, items, embeddings) {
  const groups = [];
  const assignments = [];
  items.forEach((_, index) => {
    const [best] = rankGroups(index, groups, embeddings);
    if (best && best.similarity >= threshold) {
      groups[best.groupIndex].push(index);
      assignments.push(best.groupIndex);
      return;
    }
    groups.push([index]);
    assignments.push(groups.length - 1);
  });
  return { assignments, groupCount: groups.length };
}

const distractors = distractorsPath
  ? JSON.parse(readFileSync(distractorsPath, "utf8")).map((distractor) => ({
      ...distractor,
      expectedGroup: distractor.id,
    }))
  : [];
const testItems = dataset.items;
const items = [...distractors, ...testItems];
const embeddings = await embedAll(items);

const groups = distractors.map((_, index) => [index]);
const assignments = [];
const records = [];

for (const [testIndex, item] of testItems.entries()) {
  const index = distractors.length + testIndex;
  const ranked = rankGroups(index, groups, embeddings);
  const candidates = ranked.slice(0, CANDIDATE_LIMIT);
  const { json, latencyMs } = await callGemini("decisions", {
    model: DECISION_MODEL,
    input: buildInput(item),
    questions: buildQuestions(candidates, groups, items),
  });

  const typeAnswer = json.answers.feedback_type;
  const issueAnswer = json.answers.same_issue;
  // Low-confidence answers never join an issue: the item starts a new issue
  // flagged for review, so a wrong guess can't silently merge two problems.
  const needsReview = Boolean(
    issueAnswer && issueAnswer.confidence < CONFIDENCE_THRESHOLD,
  );
  const chosenCandidate =
    issueAnswer && issueAnswer.choice !== NO_MATCH_KEY && !needsReview
      ? candidates[Number(issueAnswer.choice.replace("issue_", "")) - 1]
      : null;
  const appliedChoice = chosenCandidate ? issueAnswer.choice : NO_MATCH_KEY;

  const matchingGroupIndex = groups.findIndex(
    (group) => majorityExpectedGroup(group, items) === item.expectedGroup,
  );
  const correctCandidate = candidates.findIndex(
    (candidate) => candidate.groupIndex === matchingGroupIndex,
  );
  const expectedChoice =
    matchingGroupIndex === -1
      ? NO_MATCH_KEY
      : correctCandidate === -1
        ? "retrieval_miss"
        : `issue_${correctCandidate + 1}`;

  if (chosenCandidate) {
    groups[chosenCandidate.groupIndex].push(index);
    assignments.push(chosenCandidate.groupIndex);
  } else {
    groups.push([index]);
    assignments.push(groups.length - 1);
  }

  records.push({
    id: item.id,
    lang: item.lang,
    hard: Boolean(item.note),
    content: item.content,
    reporterType: item.reporterType,
    expectedType: item.expectedType,
    predictedType: typeAnswer.choice,
    typeConfidence: typeAnswer.confidence,
    typeCorrect: isTypeCorrect(item, typeAnswer.choice),
    expectedGroup: item.expectedGroup,
    issueChoice: issueAnswer?.choice ?? null,
    issueConfidence: issueAnswer?.confidence ?? null,
    needsReview,
    appliedChoice,
    expectedChoice,
    groupingDecisionCorrect:
      issueAnswer === undefined ? null : appliedChoice === expectedChoice,
    joinedDistractor:
      chosenCandidate && chosenCandidate.groupIndex < distractors.length
        ? distractors[chosenCandidate.groupIndex].content
        : null,
    topSimilarity: ranked[0]?.similarity ?? null,
    latencyMs,
    inputTokens: json.usage?.total_input_tokens ?? null,
  });
  process.stdout.write(".");
}
process.stdout.write("\n");

function percent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function share(list, predicate) {
  return list.length === 0 ? 0 : list.filter(predicate).length / list.length;
}

const reporterWrong = records.filter(
  (record, index) =>
    record.reporterType !== null &&
    !isTypeCorrect(testItems[index], record.reporterType),
);
const confident = records.filter(
  (record) => record.typeConfidence >= CONFIDENCE_THRESHOLD,
);
const decisions = records.filter(
  (record) => record.groupingDecisionCorrect !== null,
);
const confidentDecisions = decisions.filter(
  (record) => record.issueConfidence >= CONFIDENCE_THRESHOLD,
);
const latencies = records
  .map((record) => record.latencyMs)
  .sort((a, b) => a - b);
const pipeline = pairwiseScores(assignments, testItems);
const testEmbeddings = embeddings.slice(distractors.length);

const summary = {
  classification: {
    accuracy: share(records, (record) => record.typeCorrect),
    accuracyEnglish: share(
      records.filter((record) => record.lang === "en"),
      (record) => record.typeCorrect,
    ),
    accuracySpanish: share(
      records.filter((record) => record.lang === "es"),
      (record) => record.typeCorrect,
    ),
    accuracyHard: share(
      records.filter((record) => record.hard),
      (record) => record.typeCorrect,
    ),
    reporterWrongCount: reporterWrong.length,
    reporterWrongFixed: reporterWrong.filter((record) => record.typeCorrect)
      .length,
    confidentShare: share(
      records,
      (record) => record.typeConfidence >= CONFIDENCE_THRESHOLD,
    ),
    confidentAccuracy: share(confident, (record) => record.typeCorrect),
  },
  grouping: {
    distractorCount: distractors.length,
    expectedGroupCount: new Set(testItems.map((item) => item.expectedGroup))
      .size,
    predictedGroupCount: new Set(assignments).size,
    joinedDistractors: records.filter((record) => record.joinedDistractor)
      .length,
    pairwise: pipeline,
    decisionAccuracy: share(
      decisions,
      (record) => record.groupingDecisionCorrect,
    ),
    retrievalMisses: decisions.filter(
      (record) => record.expectedChoice === "retrieval_miss",
    ).length,
    confidentDecisionShare: share(
      decisions,
      (record) => record.issueConfidence >= CONFIDENCE_THRESHOLD,
    ),
    confidentDecisionAccuracy: share(
      confidentDecisions,
      (record) => record.groupingDecisionCorrect,
    ),
  },
  embeddingOnly: EMBEDDING_ONLY_THRESHOLDS.map((threshold) => {
    const result = embeddingOnlyGrouping(threshold, testItems, testEmbeddings);
    return {
      threshold,
      groupCount: result.groupCount,
      ...pairwiseScores(result.assignments, testItems),
    };
  }),
  cost: {
    decisionInputTokens: records.reduce(
      (total, record) => total + (record.inputTokens ?? 0),
      0,
    ),
    latencyMedianMs: latencies[Math.floor(latencies.length / 2)],
    latencyP90Ms: latencies[Math.floor(latencies.length * 0.9)],
  },
};

const { classification, grouping } = summary;
console.log("\nClassification (gemini-decision-1)");
console.log(
  `  accuracy: ${percent(classification.accuracy)} (en ${percent(classification.accuracyEnglish)}, es ${percent(classification.accuracySpanish)}, hard ${percent(classification.accuracyHard)})`,
);
console.log(
  `  wrong Reporter types fixed: ${classification.reporterWrongFixed}/${classification.reporterWrongCount}`,
);
console.log(
  `  confidence >= ${CONFIDENCE_THRESHOLD}: ${percent(classification.confidentShare)} of items, ${percent(classification.confidentAccuracy)} correct`,
);
console.log(
  `\nGrouping (embeddings top-${CANDIDATE_LIMIT} + gemini-decision-1, ${grouping.distractorCount} distractor issues)`,
);
console.log(
  `  groups: ${grouping.predictedGroupCount} predicted vs ${grouping.expectedGroupCount} expected`,
);
console.log(
  `  pairwise precision ${percent(grouping.pairwise.precision)}, recall ${percent(grouping.pairwise.recall)}, F1 ${percent(grouping.pairwise.f1)}`,
);
console.log(
  `  decision accuracy: ${percent(grouping.decisionAccuracy)}, retrieval misses: ${grouping.retrievalMisses}, joined a distractor: ${grouping.joinedDistractors}`,
);
console.log(
  `  applied automatically (confidence >= ${CONFIDENCE_THRESHOLD}): ${percent(grouping.confidentDecisionShare)} of decisions, ${percent(grouping.confidentDecisionAccuracy)} correct; the rest start a new issue flagged for review`,
);
console.log("\nEmbedding-only grouping (join best group above threshold)");
for (const row of summary.embeddingOnly) {
  console.log(
    `  ${row.threshold.toFixed(2)}: groups ${row.groupCount}, precision ${percent(row.precision)}, recall ${percent(row.recall)}, F1 ${percent(row.f1)}`,
  );
}
console.log("\nCost");
console.log(
  `  decision input tokens: ${summary.cost.decisionInputTokens}, latency median ${summary.cost.latencyMedianMs} ms, p90 ${summary.cost.latencyP90Ms} ms`,
);

if (outPath) {
  writeFileSync(outPath, JSON.stringify({ summary, records }, null, 2));
  console.log(`\nDetails written to ${outPath}`);
}
