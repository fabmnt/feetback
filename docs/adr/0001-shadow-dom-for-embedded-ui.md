# Use Shadow DOM for embedded UI

Feetback's Script UI will render inside a Shadow DOM Boundary so the Feedback Button and Feedback Popover behave predictably across Customer Apps. This adds some styling and focus-management complexity, but it protects Feetback from arbitrary Customer App CSS and protects Customer Apps from Feetback styles, which is central to the "works by adding a script tag" promise.
