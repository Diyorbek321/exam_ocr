export type ExamStatus = 'DRAFT' | 'LOCKED' | 'CLOSED';

export interface Exam {
  id: number;
  title: string;
  subject: string;
  exam_date: string;
  template_name: string;
  template_version?: string | number;
  question_count: number;
  pass_percent: number;
  status: ExamStatus;
  created_at: string;
  locked_at?: string | null;
}

export type QuestionType = 'CHOICE' | 'TEXT';
export type MatchMode = 'EXACT' | 'IGNORE_CASE' | 'FUZZY' | 'NUMERIC';

export interface AnswerKeyItem {
  question_number: number;
  qtype: QuestionType;
  correct_answer: string;
  match_mode?: MatchMode;
  tolerance?: number;
  points: number;
}

export interface Student {
  id: number;
  full_name: string;
  external_id: string;
  group_name: string;
}

export interface Registration {
  id: number;
  exam_id: number;
  student_id: number;
  sheet_code: string;
  seat?: string | number | null;
  absent: boolean;
  printed_at?: string | null;
  student: Student;
}

export interface Result {
  registration_id: number;
  correct_count: number;
  answered_count: number;
  question_count: number;
  earned_points: number;
  total_points: number;
  percent: number;
  passed: boolean;
  graded_at: string;
}

export interface ResultRow {
  registration_id: number;
  sheet_code: string;
  student_name: string;
  external_id: string;
  group_name: string;
  absent: boolean;
  result: Result | null;
}

export interface ResultsSummary {
  registered: number;
  absent: number;
  graded: number;
  pending: number;
  average_percent: number;
  highest_percent: number;
  lowest_percent: number;
  pass_percent?: number;
  passed?: number;
}

export interface QuestionStat {
  question_number: number;
  correct: number;
  answered: number;
  sat: number;
  correct_percent: number;
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
}

export interface ApiErrorResponse {
  detail?: string;
  message?: string;
}
