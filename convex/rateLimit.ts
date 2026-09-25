import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

const FEEDBACK_RATE = 10;
const FEEDBACK_PERIOD = MINUTE;
const FEEDBACK_BURST_CAPACITY = 3;

export const feedbackRateLimiter = new RateLimiter(components.rateLimiter, {
  feedbackSubmission: {
    kind: "token bucket",
    rate: FEEDBACK_RATE,
    period: FEEDBACK_PERIOD,
    capacity: FEEDBACK_BURST_CAPACITY,
  },
});
