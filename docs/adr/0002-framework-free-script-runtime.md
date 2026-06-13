# Use a framework-free script runtime

Feetback's customer-facing script runtime will use framework-free browser JavaScript for v1, while Feetback-owned surfaces such as the dashboard and landing page may use React and Next.js. This keeps the embedded script smaller, reduces dependency risk inside arbitrary Customer Apps, and makes the "single script tag" integration easier to deliver, at the cost of manually managing the Script UI's small amount of state and DOM behavior.
