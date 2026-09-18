import {
  Exam,
  AnswerKeyItem,
  Student,
  Registration,
  Result,
  ResultRow,
  ResultsSummary,
  QuestionStat,
  ImportResult,
} from './types';

const STORAGE_API_KEY = 'exam_ocr_api_url';

export function getApiBaseUrl(): string {
  const custom = localStorage.getItem(STORAGE_API_KEY);
  if (custom && custom.trim() !== '') {
    return custom.trim().replace(/\/+$/, '');
  }
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return 'http://127.0.0.1:8000';
}

export function setApiBaseUrl(url: string): void {
  if (!url || url.trim() === '') {
    localStorage.removeItem(STORAGE_API_KEY);
  } else {
    localStorage.setItem(STORAGE_API_KEY, url.trim().replace(/\/+$/, ''));
  }
}

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Only set Content-Type if body is not FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Tarmoq xatosi';
    throw new ApiError(
      0,
      `Serverga ulanib bo'lmadi (${baseUrl}). Backend ishlayotganini tekshiring. (${errorMsg})`
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    let errorDetail = `So'rov muvaffaqiyatsiz tugadi (Status ${response.status})`;
    try {
      if (contentType.includes('application/json')) {
        const errJson = await response.json();
        if (errJson.detail) {
          if (typeof errJson.detail === 'string') {
            errorDetail = errJson.detail;
          } else if (Array.isArray(errJson.detail)) {
            // Pydantic validation error format
            errorDetail = errJson.detail.map((d: { msg?: string; loc?: string[] }) => `${d.loc ? d.loc.join('.') + ': ' : ''}${d.msg || JSON.stringify(d)}`).join('; ');
          } else {
            errorDetail = JSON.stringify(errJson.detail);
          }
        } else if (errJson.message) {
          errorDetail = errJson.message;
        }
      } else {
        const text = await response.text();
        if (text) errorDetail = text.slice(0, 300);
      }
    } catch {
      // Keep default errorDetail
    }
    throw new ApiError(response.status, errorDetail);
  }

  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text() as unknown as T;
}

// Exam API
export const api = {
  // Exams
  async getExams(): Promise<Exam[]> {
    return request<Exam[]>('/api/exams');
  },

  async createExam(data: {
    title: string;
    subject: string;
    exam_date: string;
    template_name?: string;
    question_count: number;
    pass_percent: number;
  }): Promise<Exam> {
    return request<Exam>('/api/exams', {
      method: 'POST',
      body: JSON.stringify({
        template_name: 'A',
        ...data,
      }),
    });
  },

  async getExam(id: number): Promise<Exam> {
    return request<Exam>(`/api/exams/${id}`);
  },

  async updateExam(
    id: number,
    data: {
      title?: string;
      subject?: string;
      exam_date?: string;
      question_count?: number;
      pass_percent?: number;
    }
  ): Promise<Exam> {
    return request<Exam>(`/api/exams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteExam(id: number): Promise<void> {
    await request<void>(`/api/exams/${id}`, {
      method: 'DELETE',
    });
  },

  async lockExam(id: number): Promise<Exam> {
    return request<Exam>(`/api/exams/${id}/lock`, {
      method: 'POST',
    });
  },

  async unlockExam(id: number): Promise<Exam> {
    return request<Exam>(`/api/exams/${id}/unlock`, {
      method: 'POST',
    });
  },

  async regradeExam(id: number): Promise<{ regraded: number }> {
    return request<{ regraded: number }>(`/api/exams/${id}/regrade`, {
      method: 'POST',
    });
  },

  // Answer key
  async getAnswerKey(examId: number): Promise<AnswerKeyItem[]> {
    return request<AnswerKeyItem[]>(`/api/exams/${examId}/answer-key`);
  },

  async replaceAnswerKey(
    examId: number,
    items: AnswerKeyItem[]
  ): Promise<AnswerKeyItem[]> {
    return request<AnswerKeyItem[]>(`/api/exams/${examId}/answer-key`, {
      method: 'PUT',
      body: JSON.stringify({ items }),
    });
  },

  async patchAnswerKey(
    examId: number,
    items: Array<{
      question_number: number;
      correct_answer?: string;
      match_mode?: string;
      tolerance?: number;
      points?: number;
    }>
  ): Promise<{ items: AnswerKeyItem[]; regraded: number }> {
    return request<{ items: AnswerKeyItem[]; regraded: number }>(
      `/api/exams/${examId}/answer-key`,
      {
        method: 'PATCH',
        body: JSON.stringify({ items }),
      }
    );
  },

  // Students
  async getStudents(params?: {
    search?: string;
    group_name?: string;
    limit?: number;
    offset?: number;
  }): Promise<Student[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.group_name) query.set('group_name', params.group_name);
    if (params?.limit !== undefined) query.set('limit', String(params.limit));
    if (params?.offset !== undefined) query.set('offset', String(params.offset));
    const qs = query.toString();
    return request<Student[]>(`/api/students${qs ? `?${qs}` : ''}`);
  },

  async createStudent(data: {
    full_name: string;
    external_id: string;
    group_name: string;
  }): Promise<Student> {
    return request<Student>('/api/students', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getStudentGroups(): Promise<string[]> {
    return request<string[]>('/api/students/groups');
  },

  async deleteStudent(id: number): Promise<void> {
    await request<void>(`/api/students/${id}`, {
      method: 'DELETE',
    });
  },

  async importStudents(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return request<ImportResult>('/api/students/import', {
      method: 'POST',
      body: formData,
    });
  },

  // Registrations
  async getRegistrations(examId: number): Promise<Registration[]> {
    return request<Registration[]>(`/api/exams/${examId}/registrations`);
  },

  async registerStudents(
    examId: number,
    data: { student_ids?: number[]; group_name?: string }
  ): Promise<Registration[]> {
    return request<Registration[]>(`/api/exams/${examId}/registrations`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteRegistration(registrationId: number): Promise<void> {
    await request<void>(`/api/registrations/${registrationId}`, {
      method: 'DELETE',
    });
  },

  async setAbsent(
    registrationId: number,
    absent: boolean
  ): Promise<Registration> {
    return request<Registration>(
      `/api/registrations/${registrationId}/absent?absent=${absent}`,
      {
        method: 'POST',
      }
    );
  },

  // Answers & Grading
  async submitAnswers(
    registrationId: number,
    answers: Record<string, string>,
    confidence?: number
  ): Promise<Result> {
    return request<Result>(`/api/registrations/${registrationId}/answers`, {
      method: 'POST',
      body: JSON.stringify({ answers, confidence }),
    });
  },

  async getResults(examId: number): Promise<ResultRow[]> {
    return request<ResultRow[]>(`/api/exams/${examId}/results`);
  },

  async getResultsSummary(examId: number): Promise<ResultsSummary> {
    return request<ResultsSummary>(`/api/exams/${examId}/results/summary`);
  },

  async getQuestionStats(examId: number): Promise<QuestionStat[]> {
    return request<QuestionStat[]>(`/api/exams/${examId}/question-stats`);
  },

  // Downloads
  async downloadExamSheetsPdf(examId: number, filename = 'varaqalar.pdf'): Promise<void> {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/exams/${examId}/sheets.pdf`;
    const response = await fetch(url);
    if (!response.ok) {
      let detail = `PDF yuklab olishda xatolik yuz berdi (${response.status})`;
      try {
        const err = await response.json();
        if (err.detail) detail = err.detail;
      } catch {
        // fallback
      }
      throw new ApiError(response.status, detail);
    }
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  },

  async downloadRegistrationSheetPdf(
    registrationId: number,
    filename = 'varaq.pdf'
  ): Promise<void> {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/registrations/${registrationId}/sheet.pdf`;
    const response = await fetch(url);
    if (!response.ok) {
      let detail = `Varaqani yuklab olishda xatolik yuz berdi (${response.status})`;
      try {
        const err = await response.json();
        if (err.detail) detail = err.detail;
      } catch {
        // fallback
      }
      throw new ApiError(response.status, detail);
    }
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  },

  async downloadResultsExcel(examId: number, filename = 'natijalar.xlsx'): Promise<void> {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/exams/${examId}/results.xlsx`;
    const response = await fetch(url);
    if (!response.ok) {
      let detail = `Excel yuklab olishda xatolik yuz berdi (${response.status})`;
      try {
        const err = await response.json();
        if (err.detail) detail = err.detail;
      } catch {
        // fallback
      }
      throw new ApiError(response.status, detail);
    }
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  },
};
