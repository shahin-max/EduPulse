import { request } from "@/lib/api";
import { json, query, type Paginated } from "@/lib/admin-api";

/**
 * Question bank, exams and results (staff side) of the EduPulse API. Used by both the admin and the
 * faculty portal; the API decides what each person may see and change. Marks are DECIMAL strings ("2.50").
 * Every function takes the access token first (use with `withToken`).
 */

export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export const DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

export type ExamKind = "DAILY_PRACTICE" | "CHAPTER_TEST" | "MOCK_TEST" | "OMR_PRACTICE";
export const EXAM_KINDS: ExamKind[] = ["DAILY_PRACTICE", "CHAPTER_TEST", "MOCK_TEST", "OMR_PRACTICE"];

export type ExamStatus = "DRAFT" | "PUBLISHED" | "CLOSED";
export const EXAM_STATUSES: ExamStatus[] = ["DRAFT", "PUBLISHED", "CLOSED"];

export type RankingPolicy = "FIRST" | "BEST" | "LATEST";
export const RANKING_POLICIES: RankingPolicy[] = ["FIRST", "BEST", "LATEST"];

export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "AUTO_SUBMITTED" | "INVALIDATED";
export const ATTEMPT_STATUSES: AttemptStatus[] = ["IN_PROGRESS", "SUBMITTED", "AUTO_SUBMITTED", "INVALIDATED"];

// ---- Question bank ----

export type QuestionOption = { id: number; question_id: number; option_label: string; option_text: string; is_correct: boolean; sort_order: number };

export type Question = {
  id: number;
  course_subject_id: number;
  chapter_id: number | null;
  question_text: string;
  explanation: string | null;
  difficulty: Difficulty;
  kind: "SINGLE_CHOICE";
  marks_default: string;
  is_active: boolean;
  created_by: number | null;
  created_at: string;
  question_options: QuestionOption[];
  course_subjects: {
    id: number;
    courses: { id: number; code: string; title: string };
    subjects: { id: number; code: string; name: string };
  };
  chapters: { id: number; title: string } | null;
};

export type ListQuestionsQuery = {
  page?: number; limit?: number; courseId?: number; subjectId?: number; courseSubjectId?: number; chapterId?: number;
  difficulty?: Difficulty; isActive?: boolean; search?: string;
};

/** SINGLE_CHOICE: 2-8 options, unique labels (1-8 letters/digits), exactly one with isCorrect. */
export type QuestionOptionInput = { optionLabel: string; optionText: string; isCorrect: boolean; sortOrder?: number };

export type CreateQuestionInput = {
  courseSubjectId: number;
  chapterId?: number | null;
  questionText: string;
  explanation?: string | null;
  difficulty?: Difficulty;
  marksDefault?: number;
  isActive?: boolean;
  options: QuestionOptionInput[];
};

/** The course subject cannot change after creation. `options` is refused (409) once the question appeared in an attempt. */
export type UpdateQuestionInput = Partial<Omit<CreateQuestionInput, "courseSubjectId">>;

export const questionsApi = {
  list: (token: string, params: ListQuestionsQuery = {}) => request<Paginated<Question>>(`/questions${query(params)}`, { token }),
  get: (token: string, id: number) => request<Question>(`/questions/${id}`, { token }),
  create: (token: string, input: CreateQuestionInput) => request<Question>("/questions", { token, ...json("POST", input) }),
  update: (token: string, id: number, input: UpdateQuestionInput) => request<Question>(`/questions/${id}`, { token, ...json("PATCH", input) }),
  /** 409 while the question is in an exam (deactivate it instead). Faculty can only delete their own. */
  remove: (token: string, id: number) => request<void>(`/questions/${id}`, { token, method: "DELETE" }),
};

// ---- Exams ----

export type Exam = {
  id: number;
  course_id: number;
  subject_id: number | null;
  title: string;
  kind: ExamKind;
  duration_minutes: number;
  /** Sum of the exam's question marks; the API recomputes it, it cannot be set. */
  total_marks: string;
  negative_marks_per_wrong: string;
  max_attempts: number;
  opens_at: string | null;
  closes_at: string | null;
  results_release_at: string | null;
  answer_review_release_at: string | null;
  ranking_attempt_policy: RankingPolicy;
  show_result_immediately: boolean;
  status: ExamStatus;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  courses: { id: number; code: string; title: string };
  subjects: { id: number; code: string; name: string } | null;
  exam_batches: { batches: { id: number; code: string; name: string } }[];
  _count: { exam_questions: number; exam_attempts: number };
};

export type ExamQuestion = {
  exam_id: number;
  question_id: number;
  sort_order: number;
  marks: string;
  negative_marks: string;
  questions: Omit<Question, "course_subjects" | "chapters">;
};

export type ExamDetail = Exam & { exam_questions: ExamQuestion[] };

export type ListExamsQuery = { page?: number; limit?: number; courseId?: number; batchId?: number; status?: ExamStatus };

export type ExamSettingsInput = {
  subjectId?: number | null;
  title?: string;
  kind?: ExamKind;
  durationMinutes?: number;
  negativeMarksPerWrong?: number;
  maxAttempts?: number;
  opensAt?: string | null;
  closesAt?: string | null;
  resultsReleaseAt?: string | null;
  answerReviewReleaseAt?: string | null;
  rankingAttemptPolicy?: RankingPolicy;
  showResultImmediately?: boolean;
};

/** New exams always start as DRAFT (status is not accepted on create). */
export type CreateExamInput = ExamSettingsInput & { courseId: number; title: string; kind: ExamKind; durationMinutes: number };
export type UpdateExamInput = ExamSettingsInput & { status?: ExamStatus };

export type AddExamQuestionInput = { questionId: number; marks?: number; negativeMarks?: number };
export type UpdateExamQuestionInput = { marks?: number; negativeMarks?: number };

export const examsApi = {
  list: (token: string, params: ListExamsQuery = {}) => request<Paginated<Exam>>(`/exams${query(params)}`, { token }),
  get: (token: string, id: number) => request<ExamDetail>(`/exams/${id}`, { token }),
  create: (token: string, input: CreateExamInput) => request<Exam>("/exams", { token, ...json("POST", input) }),
  update: (token: string, id: number, input: UpdateExamInput) => request<Exam>(`/exams/${id}`, { token, ...json("PATCH", input) }),
  /** 409 once the exam has attempts (close it instead). */
  remove: (token: string, id: number) => request<void>(`/exams/${id}`, { token, method: "DELETE" }),
  attachBatch: (token: string, id: number, batchId: number) => request<ExamDetail>(`/exams/${id}/batches/${batchId}`, { token, method: "PUT" }),
  detachBatch: (token: string, id: number, batchId: number) => request<void>(`/exams/${id}/batches/${batchId}`, { token, method: "DELETE" }),
  /** One question per call. Questions, marks and order are locked once anyone has attempted the exam. */
  addQuestion: (token: string, id: number, input: AddExamQuestionInput) => request<ExamDetail>(`/exams/${id}/questions`, { token, ...json("POST", input) }),
  updateQuestion: (token: string, id: number, questionId: number, input: UpdateExamQuestionInput) =>
    request<ExamDetail>(`/exams/${id}/questions/${questionId}`, { token, ...json("PATCH", input) }),
  removeQuestion: (token: string, id: number, questionId: number) => request<void>(`/exams/${id}/questions/${questionId}`, { token, method: "DELETE" }),
  /** Every question id of the exam, in the new order. */
  reorder: (token: string, id: number, questionIds: number[]) => request<ExamDetail>(`/exams/${id}/questions/order`, { token, ...json("PUT", { questionIds }) }),
  attempts: (token: string, id: number, params: { page?: number; limit?: number; batchId?: number; status?: AttemptStatus } = {}) =>
    request<Paginated<ExamAttempt>>(`/exams/${id}/attempts${query(params)}`, { token }),
  leaderboard: (token: string, id: number, params: { batchId?: number; limit?: number } = {}) =>
    request<Leaderboard>(`/exams/${id}/leaderboard${query(params)}`, { token }),
};

// ---- Attempts and results ----

export type ExamAttempt = {
  id: number;
  exam_id: number;
  batch_id: number;
  enrollment_id: number;
  attempt_number: number;
  started_at: string;
  submitted_at: string | null;
  expires_at: string;
  status: AttemptStatus;
  correct_count: number;
  wrong_count: number;
  unanswered_count: number;
  score: string | null;
  max_score: string;
  percentage: string | null;
  graded_at: string | null;
  enrollments: { student_profiles: { user_id: number; admission_number: string | null; users: { full_name: string } } };
  exam_batches: { batches: { id: number; code: string } };
};

export type LeaderboardEntry = {
  rank: number;
  student_user_id: number;
  full_name: string;
  batch_id: number;
  score: string | null;
  max_score: string;
  percentage: string | null;
  submitted_at: string | null;
  attempt_id?: number;
  attempt_number?: number;
};

export type Leaderboard = { exam: { id: number; title: string; ranking_attempt_policy: RankingPolicy }; entries: LeaderboardEntry[] };

export type AttemptQuestion = {
  question_id: number;
  display_order: number;
  question_text: string;
  marks: string;
  negative_marks: string;
  options: { id: number; option_label: string; option_text: string; is_correct?: boolean }[];
  selected_option_id: number | null;
  is_marked_for_review: boolean;
  answered_at: string | null;
  is_correct?: boolean | null;
  marks_awarded?: string | null;
  explanation?: string | null;
};

export type AttemptView = {
  id: number;
  exam: { id: number; title: string; kind: ExamKind };
  batch_id: number;
  enrollment_id: number;
  attempt_number: number;
  status: AttemptStatus;
  started_at: string;
  expires_at: string;
  submitted_at: string | null;
  max_score: string;
  score?: string | null;
  percentage?: string | null;
  correct_count?: number;
  wrong_count?: number;
  unanswered_count?: number;
  graded_at?: string | null;
  results_visible: boolean;
  review_visible: boolean;
  seconds_remaining: number;
  questions: AttemptQuestion[];
};

export const attemptsApi = {
  get: (token: string, id: number) => request<AttemptView>(`/exam-attempts/${id}`, { token }),
  /** No body: the API does not record a reason. The attempt stops counting towards limits and rankings. */
  invalidate: (token: string, id: number) => request<ExamAttempt>(`/exam-attempts/${id}/invalidate`, { token, method: "POST" }),
};
