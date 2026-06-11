import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://43.205.198.95:8000";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
});

export interface HealthResponse {
  status: string;
  documents?: number;
  chunks?: number;
  [key: string]: unknown;
}

export interface DocumentItem {
  filename: string;
  chunks?: number;
  size?: number;
  uploaded_at?: string;
  [key: string]: unknown;
}

export interface Source {
  filename: string;
  chunk_index: number;
  excerpt: string;
  score?: number;
}

export interface QueryResponse {
  answer: string;
  sources: Source[];
}

export const ragApi = {
  health: async (): Promise<HealthResponse> => {
    const { data } = await api.get("/health");
    return data;
  },
  upload: async (file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post("/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
    return data;
  },
  listDocuments: async (): Promise<DocumentItem[]> => {
    const { data } = await api.get("/documents");
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.documents)) return data.documents;
    return [];
  },
  deleteDocument: async (filename: string) => {
    const { data } = await api.delete(`/documents/${encodeURIComponent(filename)}`);
    return data;
  },
  query: async (question: string): Promise<QueryResponse> => {
    const { data } = await api.post("/query", { query: question, question });
    return {
      answer: data.answer || data.response || data.result || "",
      sources: data.sources || data.citations || [],
    };
  },
};

export { API_URL };