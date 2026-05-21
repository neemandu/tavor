export type Role = "student" | "admin";

export type UserProfile = {
  id: string;
  name: string;
  role: Role;
  created_at: string;
};

export type Course = {
  id: string;
  name: string;
  type: "year" | "8_weeks" | "5_weeks";
  is_active: boolean;
  created_at: string;
};

export type Handbook = {
  id: string;
  course_id: string;
  file_path: string;
  file_name: string;
  uploaded_by: string;
  created_at: string;
};

export type VocabularyCategory =
  | "security"
  | "daily"
  | "checkpoint"
  | "interrogation"
  | "other";

export const CATEGORY_LABELS: Record<VocabularyCategory, string> = {
  security: "ביטחוני",
  daily: "יומיומי",
  checkpoint: "מחסום",
  interrogation: "חקירה",
  other: "אחר",
};

export type VocabularyWord = {
  id: string;
  arabic_text: string;
  transliteration: string | null;
  hebrew_translation: string;
  inflections: Record<string, string> | null;
  category: VocabularyCategory | null;
  recording_path: string | null;
  created_by: string;
  created_at: string;
};

export type Exam = {
  id: string;
  course_id: string;
  name: string;
  file_path: string;
  due_date: string | null;
  uploaded_by: string;
  created_at: string;
};

export type ExamSubmission = {
  id: string;
  exam_id: string;
  user_id: string;
  submitted_at: string;
  email_sent_at: string | null;
};

export type Grade = {
  id: string;
  exam_id: string;
  user_id: string;
  score: number;
  entered_by: string;
  created_at: string;
};

export type ScenarioDifficulty = "easy" | "medium" | "hard";
export type ScenarioCategory =
  | "checkpoint"
  | "interrogation"
  | "market"
  | "prison"
  | "other";

export const DIFFICULTY_LABELS: Record<ScenarioDifficulty, string> = {
  easy: "קל",
  medium: "בינוני",
  hard: "קשה",
};

export const SCENARIO_CATEGORY_LABELS: Record<ScenarioCategory, string> = {
  checkpoint: "מחסום",
  interrogation: "חקירה",
  market: "שוק",
  prison: "בית כלא",
  other: "אחר",
};

export type Scenario = {
  id: string;
  name: string;
  student_description: string | null;
  student_role: string | null;
  ai_instructions: string | null;
  voice_instructions: string | null;
  hints: string[] | null;
  difficulty: ScenarioDifficulty | null;
  category: ScenarioCategory | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
};

export type SessionType =
  | "scenario"
  | "free_practice"
  | "free_conversation";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AISession = {
  id: string;
  user_id: string;
  scenario_id: string | null;
  session_type: SessionType;
  messages: ChatMessage[] | null;
  feedback_text: string | null;
  tokens_used: number;
  started_at: string;
  ended_at: string | null;
};

export type AICredits = {
  id: string;
  user_id: string;
  monthly_limit: number;
  current_month_usage: number;
  last_reset_date: string;
};
