# Feetback

Feetback is a product for collecting, organizing, and reviewing feedback from users inside customer web applications.

## Language

**Feetback**:
The whole product: embeddable feedback script, customer dashboard, and public landing page.
_Avoid_: The app, platform

**Builder**:
The AI agent helping build and shape Feetback with the product owner.
_Avoid_: Assistant, bot

**Customer**:
A company, team, or person that installs Feetback in their web application and owns the collected feedback.
_Avoid_: Client, tenant

**Customer App**:
A Customer-owned web application where the Feetback script is installed.
_Avoid_: Project, website

**Client Key**:
A public identifier used by the Feetback script to associate Feedback Items with a Customer App.
_Avoid_: Site key, public key, app key

**Allowed Origin**:
A Customer-approved web origin from which a Client Key is allowed to send Feedback Submissions.
_Avoid_: Domain whitelist, URL allowlist

**Feetback Settings**:
The browser configuration object provided by a Customer App before the Feetback script loads.
_Avoid_: Config, options

**Feetback API**:
The runtime browser API exposed as `window.feetback` for Customer Apps to control or identify the Script UI.
_Avoid_: Widget API, SDK

**Reporter**:
An end-user inside a Customer App who sends feedback through Feetback.
_Avoid_: End user, visitor

**Reporter Identity**:
Optional identifying information about a Reporter provided by the Customer App, such as an internal user id, email, or display name.
_Avoid_: Account, login

**User**:
A person from the Customer who logs into the Feetback dashboard to review and manage feedback, often a developer or operator responsible for Customer Apps.
_Avoid_: Team Member, admin

**Feedback Item**:
One submission sent by a Reporter from a Customer App; after entering the dashboard it belongs to exactly one Feedback Issue.
_Avoid_: Ticket, response, message

**Feedback Issue**:
A developer-facing unit of work representing one underlying product problem, request, or question described by one or more related Feedback Items; it may span multiple Customer Apps owned by the same Customer, but never spans Customers.
_Avoid_: Ticket, task, thread

**Issue Signal**:
Evidence used to rank and explain the likely importance of a Feedback Issue, such as frequency, recency, affected Customer Apps, Feedback Types, context richness, or severity hints.
_Avoid_: Priority, score, weight

**Priority**:
A Customer-chosen indication of how soon a Feedback Issue should be addressed.
_Avoid_: Issue Signal, importance score, severity

**Issue Status**:
The Customer-visible lifecycle state of a Feedback Issue, such as open, planned, in progress, resolved, or closed.
_Avoid_: State, lane, stage

**Implementation Prompt**:
A text-only developer-facing prompt generated for a Feedback Issue that helps a coding agent understand the problem, evidence, expected behavior, and relevant context from related Feedback Items; it excludes Reporter Identity and visual media payloads.
_Avoid_: Agent prompt, AI prompt, fix prompt

**Feedback Submission**:
The act of sending a Feedback Item from the Script UI to Feetback.
_Avoid_: Save, publish

**Feedback Type**:
The optional primary category assigned to a Feedback Item, such as bug report, complaint, security concern, improvement suggestion, performance issue, question, or other.
_Avoid_: Kind, topic

**Primary Feedback Type**:
The main Feedback Type assigned to a Feedback Issue, derived from its Feedback Items and adjustable by a User.
_Avoid_: Issue type, category, label

**Uncategorized**:
The state of a Feedback Item when no Feedback Type has been selected or assigned.
_Avoid_: Other, unknown

**Feedback Button**:
The default floating control that opens Feetback inside a Customer App.
_Avoid_: Widget button, launcher

**Feedback Popover**:
The compact chatbot-like surface opened by the Feedback Button for creating a Feedback Item while keeping the Customer App visible; it presents available feedback inputs together rather than as a step-by-step form.
_Avoid_: Modal, dialog, chat

**Script UI**:
The browser interface rendered by the Feetback script inside a Customer App, including the Feedback Button and Feedback Popover.
_Avoid_: Widget, embed UI

**Shadow DOM Boundary**:
The isolation boundary around the Script UI that prevents Customer App styles from breaking Feetback and prevents Feetback styles from leaking into the Customer App.
_Avoid_: iframe, style wrapper

**Feedback Content**:
The Reporter's written description of the Feedback Item and the only required Reporter-provided input in the v1 Feedback Popover.
_Avoid_: Message, comment

**Activation**:
The moment a Reporter opens Feetback, either through the default Feedback Button or through a Customer-owned control.
_Avoid_: Launch, trigger

**Screenshot**:
A best-effort visual capture attached to a Feedback Item from the Reporter's current page; in v1 it is enabled by default, visibly removable before submission, and should not require a browser permission prompt.
_Avoid_: Snapshot, screen grab

**Uploaded Image**:
An image file attached by the Reporter to add context beyond the automatic Screenshot.
_Avoid_: Attachment, photo

**Selected Element**:
A page element chosen by the Reporter to provide precise visual and contextual focus for a Feedback Item.
_Avoid_: Target, selection

**Element Context**:
Lightweight details about a Selected Element, such as tag name, visible label, bounding box, selector path, and visual highlight; it excludes raw HTML.
_Avoid_: Element HTML, DOM dump

**Element Selection Mode**:
The temporary Script UI mode where a Reporter can hover and choose a page element for a Feedback Item, cancel with Escape, and return to the Feedback Popover after choosing.
_Avoid_: Inspect mode, picker

**Page Context**:
Basic information about where a Feedback Item was sent from, such as page URL, viewport size, browser, device, and timestamp.
_Avoid_: Metadata, telemetry

**Privacy Mask**:
A Customer-defined mark that prevents sensitive parts of a Customer App from appearing in screenshots or selected element details.
_Avoid_: Redaction, hidden field
