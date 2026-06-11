import axios from "axios";

// Use Vercel proxy instead of direct EC2 URL
const API_URL = "/api";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
});

export interface HealthResponse {
  status: string;
  documents?: number;
  total_documents?: number;
  total_chunks?: number;
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

  upload: async (
    file: File,
    onProgress?: (pct: number) => void
  ) => {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await api.post("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (event) => {
        if (event.total && onProgress) {
          onProgress(
            Math.round((event.loaded * 100) / event.total)
          );
        }
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
    const { data } = await api.delete(
      `/documents/${encodeURIComponent(filename)}`
    );
    return data;
  },

  query: async (question: string): Promise<QueryResponse> => {
    const { data } = await api.post("/query", {
      question,
      top_k: 5,
    });

    return {
      answer: data.answer || "",
      sources: data.sources || [],
    };
  },
};

export default ragApi;
export { API_URL };