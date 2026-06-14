export const FEEDBACK_TYPES = [
  "bug_report",
  "complaint",
  "security_concern",
  "improvement_suggestion",
  "performance_issue",
  "question",
  "other",
] as const;

export const UNCATEGORIZED_FEEDBACK_TYPE = "uncategorized";

export type FeedbackType = (typeof FEEDBACK_TYPES)[number];
export type FeedbackItemType =
  | FeedbackType
  | typeof UNCATEGORIZED_FEEDBACK_TYPE;

export type ReporterIdentity = {
  id?: string;
  email?: string;
  name?: string;
};

export type PageContext = {
  url?: string;
  title?: string;
  userAgent?: string;
  timestamp?: string;
  viewport?: {
    width: number;
    height: number;
  };
};

export type ElementContext = {
  tagName: string;
  label?: string;
  selectorPath?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  highlightContext?: string;
};

export type ScreenshotAttachment = {
  dataUrl: string;
  capturedAt: string;
  width?: number;
  height?: number;
};

export type UploadedImage = {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

export type FeedbackSubmission = {
  clientKey: string;
  content: string;
  type?: FeedbackType | "";
  reporterIdentity?: ReporterIdentity;
  pageContext?: PageContext;
  screenshot?: ScreenshotAttachment | null;
  selectedElement?: ElementContext | null;
  uploadedImages?: UploadedImage[];
};

export type FeedbackItem = {
  id: string;
  clientKey: string;
  content: string;
  type: FeedbackItemType;
  reporterIdentity?: ReporterIdentity;
  pageContext?: PageContext;
  screenshot?: ScreenshotAttachment | null;
  selectedElement?: ElementContext | null;
  uploadedImages: UploadedImage[];
  submittedAt: string;
};
