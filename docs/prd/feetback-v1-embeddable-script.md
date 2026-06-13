# PRD: Feetback v1 Embeddable Script

Issue label: `ready-for-agent`

## Problem Statement

Customers need a low-friction way to collect actionable feedback from Reporters inside any Customer App without building their own feedback UI, screenshot tooling, element selection flow, or submission pipeline. The first version of Feetback needs to prove the core product promise: a Customer can add a script tag, show a lightweight Script UI, and send a well-shaped Feedback Item to Feetback.

The v1 scope should center on the Feetback script, not the full dashboard, landing page, persistence model, or later media inputs.

## Solution

Build a framework-free, TypeScript-authored Feetback script that Customers can embed in a Customer App with Feetback Settings. The script renders an isolated Script UI inside a Shadow DOM Boundary, shows a default Feedback Button, opens a compact bottom-right Feedback Popover, accepts Feedback Content plus optional context, and sends a Feedback Submission to a basic API endpoint.

The API endpoint should not store Feedback Items yet. It should validate the request shape enough for the first slice and return the submitted Feedback Item entity so the Builder can verify that the script and API contract work end to end.

## User Stories

1. As a Customer, I want to add Feetback to my Customer App with a simple script snippet, so that I can start collecting feedback without a custom integration project.
2. As a Customer, I want to provide a Client Key through Feetback Settings, so that Feedback Submissions can be associated with the right Customer App.
3. As a Customer, I want Feetback Settings to be a single browser object, so that script configuration remains easy to copy and extend.
4. As a Customer, I want the default Feedback Button to appear automatically, so that I can get a working integration quickly.
5. As a Customer, I want to disable the default Feedback Button, so that I can open Feetback from my own Customer App UI.
6. As a Customer, I want to choose the Feedback Button position between bottom-right and bottom-left, so that Feetback can avoid existing controls in my Customer App.
7. As a Customer, I want the Script UI to be isolated from my Customer App CSS, so that my app's styles do not break Feetback.
8. As a Customer, I want Feetback styles to stay isolated from my Customer App, so that installing Feetback does not visually affect my app.
9. As a Customer, I want the Feetback API to expose open and close methods, so that my Customer App can control Activation directly.
10. As a Customer, I want the Feetback API to support optional Reporter Identity, so that authenticated Customer Apps can attach known user context.
11. As a Customer with a public website, I want Reporter Identity to be optional, so that anonymous Reporters can still submit feedback.
12. As a Customer, I want to mark sensitive areas with a Privacy Mask, so that screenshots and Element Context do not expose private information.
13. As a Customer, I want Privacy Masks to apply to Selected Elements, so that Reporters cannot accidentally submit sensitive element details.
14. As a Reporter, I want a small chatbot-like Feedback Popover, so that I can send feedback without losing sight of the Customer App.
15. As a Reporter, I want all available v1 inputs visible at once, so that I do not have to move through a step-by-step form.
16. As a Reporter, I want Feedback Content to be the only required input, so that I can submit feedback quickly.
17. As a Reporter, I want to optionally choose a Feedback Type, so that I can help the Customer understand the nature of my feedback.
18. As a Reporter, I want to skip Feedback Type, so that I am not blocked when I do not know how to classify my feedback.
19. As a User later reviewing feedback, I want skipped Feedback Type to be represented as Uncategorized, so that skipped classification is distinct from Other.
20. As a Reporter, I want Feedback Types to include bug report, complaint, security concern, improvement suggestion, performance issue, question, and other, so that common feedback categories are available.
21. As a Reporter, I want a Screenshot to be attached by default, so that my Feedback Item includes useful visual context.
22. As a Reporter, I want to remove the Screenshot before submitting, so that I can avoid sending sensitive visual context.
23. As a Reporter, I want Screenshot capture to avoid browser permission prompts, so that sending feedback feels lightweight.
24. As a Reporter, I want Screenshot capture failure not to block submission, so that I can still send Feedback Content.
25. As a Reporter, I want to select a page element, so that I can point to the exact part of the Customer App related to my feedback.
26. As a Reporter, I want Element Selection Mode to outline hovered elements, so that I know what will be selected.
27. As a Reporter, I want to cancel Element Selection Mode with Escape, so that I can back out without submitting anything.
28. As a Reporter, I want the Feedback Popover to return after selecting an element, so that I can review and submit my Feedback Item.
29. As a Reporter, I want to remove a Selected Element before submitting, so that I can correct accidental selections.
30. As a User later reviewing feedback, I want Element Context to include lightweight details, so that I can understand which element was involved.
31. As a Customer, I want Element Context to exclude raw HTML, so that Feetback does not collect unnecessary or sensitive DOM content.
32. As a Reporter, I want to upload one or more images, so that I can provide context beyond the automatic Screenshot.
33. As a Reporter, I want image previews with remove controls, so that I can verify and manage Uploaded Images before submitting.
34. As a Builder, I want the script source to be written in TypeScript, so that the script code has useful type safety while staying framework-free at runtime.
35. As a Builder, I want the script to compile to a single browser bundle, so that the Customer integration behaves like a real CDN-style script.
36. As a Builder, I want a dedicated script build command, so that the embeddable script can be built independently from the Feetback-owned Next.js surfaces.
37. As a Builder, I want the main build to include the script build, so that production builds include the latest embeddable script.
38. As a Builder, I want a demo Customer App route, so that the script can be tested through a real script-tag integration.
39. As a Builder, I want the API endpoint to echo the Feedback Item entity, so that the first slice proves the request contract without adding storage.
40. As a Builder, I want Allowed Origin validation to be deferred until real Customer App configuration exists, so that the first echo endpoint stays focused.
41. As a future User, I want the Feedback Item shape to be compatible with a later dashboard, so that the first script work does not need to be thrown away.
42. As a future Customer, I want Allowed Origins before real storage or dashboard access, so that public Client Keys cannot be reused freely by other sites.

## Implementation Decisions

- Build the v1 around the embeddable Feetback script and a simple API endpoint. The dashboard, landing page, and durable feedback storage are later work.
- Author the script in TypeScript and compile it into a single framework-free browser bundle.
- Use a separate script build command. The main application build should run the script build before building the Feetback-owned Next.js application.
- Use esbuild for the first script build because it is lightweight and well-suited to compiling a single TypeScript browser entrypoint.
- The script runtime must not embed React or another UI framework. This follows the accepted framework-free script runtime decision.
- Render the Script UI inside a Shadow DOM Boundary. This follows the accepted Shadow DOM decision for embedded UI isolation.
- Expose preload configuration through `window.FeetbackSettings`.
- Expose runtime controls through `window.feetback`.
- The initial Feetback API should support opening, closing, and identifying the Reporter.
- The default Feedback Button should be enabled by default, with limited v1 customization: enabled or disabled, and bottom-right or bottom-left position.
- The Feedback Popover should be compact, bottom-corner, and chatbot-like. It should not be a modal and should not use a step-by-step form.
- The Feedback Popover should show all v1 inputs together. Feedback Content is the only required Reporter-provided input.
- Feedback Type should be visible but optional. If omitted, the Feedback Item is Uncategorized.
- V1 Feedback Types are bug report, complaint, security concern, improvement suggestion, performance issue, question, and other.
- Screenshots should be attached by default, visibly removable, best-effort, and captured without a browser permission prompt.
- Screenshot capture may use html2canvas behind a small internal wrapper so the capture implementation can be replaced later.
- Screenshot capture failure must not block Feedback Submission.
- Privacy Masks should be declared by the Customer App using a simple HTML marker and must prevent sensitive areas from appearing in screenshots or Element Context.
- Element Selection Mode should temporarily let the Reporter hover and select page elements, outline candidates, support Escape cancellation, and return to the Feedback Popover after selection.
- Selected Element data should include visual context and lightweight Element Context: tag name, visible label when safe, bounding box, selector-ish path, and highlight context.
- Selected Element data must not include raw HTML.
- Uploaded Images should support common web image formats, previews, removal, and reasonable file size limits.
- The API endpoint should accept a Feedback Submission and return the Feedback Item entity. It should not persist Feedback Items in this PRD.
- The API endpoint should include the Client Key in the request contract, but strict Allowed Origin validation is out of scope until real Customer App configuration exists.
- A demo Customer App route should embed the built script using a real script tag and Feetback Settings, rather than importing the script source directly.

## Testing Decisions

- Good tests should verify externally visible behavior and contracts, not private implementation details. For the script, tests should behave like a Customer App and a Reporter would: configure settings, load the script, interact with the Script UI, and inspect resulting Feedback Submissions.
- The highest-value seam is an integration test around the demo Customer App route loading the compiled script through a script tag.
- The next seam is the API contract: submit a valid Feedback Item payload and assert the echoed entity shape; submit invalid required data and assert a useful failure.
- Script UI tests should verify that the Feedback Button appears by default, can be disabled through Feetback Settings, respects supported positions, and opens/closes the Feedback Popover.
- Feedback Popover tests should verify that Feedback Content is required, Feedback Type is optional, omitted type becomes Uncategorized, and all v1 inputs are available at once.
- Element Selection Mode tests should verify activation, hover outline behavior, Escape cancellation, selection, return to the popover, and selected-element removal from the pending Feedback Item.
- Privacy Mask tests should verify that masked elements are not exposed in Element Context and are hidden or omitted from screenshot-related output.
- Screenshot tests should assert behavior around default attachment, removal, and non-blocking failure. They should not require pixel-perfect image assertions.
- Uploaded Image tests should verify accepted image formats, preview/removal behavior, and rejection of unsupported or oversized files.
- Build tests should verify that the script build produces the public browser bundle and that the main build includes the script build.
- Existing prior art is limited because this is a fresh Next.js starter. New tests should establish the first seams for script integration and API contract testing.

## Out of Scope

- Durable persistence of Feedback Items.
- Full Feetback dashboard.
- Feedback Inbox, statuses, filters, assignment, comments, duplicate detection, priorities, or integrations.
- Public landing page.
- Customer onboarding UI for creating Client Keys or Allowed Origins.
- Strict Allowed Origin validation for the first echo endpoint.
- Authentication for Customers, Users, or Reporters.
- Video input.
- Voice input.
- AI-generated summaries or classification.
- Session replay.
- Console log or network log capture.
- Raw HTML capture.
- Pixel-perfect screenshot guarantees.
- Full theming or color customization of the Script UI.
- Drag-and-drop upload polish unless it falls out naturally during implementation.

## Further Notes

- Feetback currently has a domain glossary and two accepted ADRs for the Shadow DOM Boundary and framework-free script runtime. The implementation should use that vocabulary consistently.
- The first implementation should prove the core loop: Customer App loads script, Reporter opens Feedback Popover, Reporter submits Feedback Content with optional context, API returns the Feedback Item entity.
- Allowed Origins are intentionally named now but deferred until the product has real Customer App configuration and storage.
- The first slice should be small but real. It should avoid console-only or local-only prototypes because the core Feetback promise depends on a Customer App sending feedback to Feetback through an embedded script.
