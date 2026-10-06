import type { Locale } from "@/i18n/locale";

import type { LandingNoteType } from "./landing-content";

const en = {
  metadataDescription:
    "Collect detailed, categorized feedback from your users with one script tag.",
  requestAccessSubject: "Feetback access request",
  tryTheDemo: "Try the demo",
  requestAccess: "Request access",
  heroTitle: "Feedback walks right in.",
  heroText:
    "Add one script tag to your web app. Your users get a friendly button, and you get every note sorted and ready to fix.",
  startCollecting: "Start collecting feedback",
  tryTheDemoApp: "Try the demo app",
  voicesTitle: "Many voices, one clear issue.",
  voicesText:
    "Similar notes are grouped together, so you fix the problem once and hand your coding agent a ready-made prompt.",
  sameIssueNotes: [
    "Checkout button is dead",
    "I click Pay and nothing happens",
    "Can't finish my order on iPhone",
    "Payment stuck, please help",
  ],
  issueSummary: "4 reports from 2 apps",
  issueTitle: "Checkout Pay button does nothing",
  copyPrompt: "Copy prompt for your coding agent",
  setupTitle: "Ready in a minute.",
  setupSteps: [
    {
      title: "Add your app",
      text: "Give it a name in the dashboard and get your key.",
    },
    {
      title: "Paste one script tag",
      text: "A small button shows up. Your app keeps working as before.",
    },
    {
      title: "Read and fix",
      text: "Notes arrive with a screenshot, page details, and a type.",
    },
  ],
  ctaTitle: "Your users are ready to talk.",
  madeWithLoveBy: "Made with love by",
  popoverTitle: "What's going on?",
  send: "Send",
  inboxTitle: "Your inbox",
  inboxCounterSuffix: "notes",
  noteTypeLabels: {
    bug_report: "Bug",
    improvement_suggestion: "Idea",
    question: "Question",
    performance_issue: "Speed",
  } satisfies Record<LandingNoteType, string>,
  /** Texts for the fake notes, in the same order as `NOTE_SLOTS`. */
  noteTexts: [
    "Pay button does nothing on Safari",
    "A dark mode would be lovely",
    "Where do I change my email?",
    "Search feels slow with big lists",
    "Avatar upload spins forever",
    "Let me pin my favorite reports",
    "Can I invite my whole team?",
    "Charts take 5s to show up",
  ],
};

export type LandingCopy = typeof en;

const es: LandingCopy = {
  metadataDescription:
    "Recibe feedback detallado y categorizado de tus usuarios con una sola etiqueta script.",
  requestAccessSubject: "Solicitud de acceso a Feetback",
  tryTheDemo: "Probar la demo",
  requestAccess: "Solicitar acceso",
  heroTitle: "Feedback llega de inmediato.",
  heroText:
    "Agrega una etiqueta script a tu app web. Tus usuarios obtienen un botón amigable y tú recibes cada nota ordenada y lista para resolver.",
  startCollecting: "Empieza a recibir feedback",
  tryTheDemoApp: "Probar la app demo",
  voicesTitle: "Muchas voces, un solo problema.",
  voicesText:
    "Las notas parecidas se agrupan, así arreglas el problema una sola vez y le das a tu agente de código un prompt ya listo.",
  sameIssueNotes: [
    "El botón de pago no funciona",
    "Hago clic en Pagar y no pasa nada",
    "No puedo terminar mi pedido en el iPhone",
    "El pago se queda trabado, ayuda por favor",
  ],
  issueSummary: "4 reportes de 2 apps",
  issueTitle: "El botón Pagar del checkout no hace nada",
  copyPrompt: "Copiar prompt para tu agente de código",
  setupTitle: "Listo en un minuto.",
  setupSteps: [
    {
      title: "Agrega tu app",
      text: "Dale un nombre en el panel y obtén tu clave.",
    },
    {
      title: "Pega una etiqueta script",
      text: "Aparece un botón pequeño. Tu app sigue funcionando igual.",
    },
    {
      title: "Lee y arregla",
      text: "Las notas llegan con captura de pantalla, datos de la página y un tipo.",
    },
  ],
  ctaTitle: "Tus usuarios están listos para hablar.",
  madeWithLoveBy: "Hecho con cariño por",
  popoverTitle: "¿Qué está pasando?",
  send: "Enviar",
  inboxTitle: "Tu bandeja",
  inboxCounterSuffix: "notas",
  noteTypeLabels: {
    bug_report: "Error",
    improvement_suggestion: "Idea",
    question: "Pregunta",
    performance_issue: "Velocidad",
  },
  noteTexts: [
    "El botón de pago no hace nada en Safari",
    "Un modo oscuro sería genial",
    "¿Dónde cambio mi correo?",
    "La búsqueda va lenta con listas grandes",
    "La subida del avatar nunca termina",
    "Déjame fijar mis reportes favoritos",
    "¿Puedo invitar a todo mi equipo?",
    "Los gráficos tardan 5 s en aparecer",
  ],
};

export const LANDING_COPY: Record<Locale, LandingCopy> = { en, es };
