# 🚀 RAG Assistant

> AI-Powered Retrieval-Augmented Generation (RAG) Platform for PDF Document Intelligence

![Python](https://img.shields.io/badge/Python-3.11+-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-green)
![React](https://img.shields.io/badge/React-Frontend-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6)
![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector%20Database-orange)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED)
![AWS](https://img.shields.io/badge/AWS-EC2-FF9900)
![License](https://img.shields.io/badge/License-MIT-success)

---

## 🌟 Overview

RAG Assistant is a full-stack AI application that enables users to upload PDF documents, generate vector embeddings, store them in ChromaDB, and interact with their documents through a modern AI-powered chat interface.

The system combines semantic search, vector databases, and Large Language Models (LLMs) to provide accurate answers grounded in uploaded documents.

---

## ✨ Features

### 📄 Document Processing

* Upload PDF documents
* Automatic text extraction
* Intelligent chunking
* Vector embedding generation
* Persistent document storage

### 🔍 Retrieval-Augmented Generation

* Semantic search using ChromaDB
* Context-aware retrieval
* Relevant source selection
* Citation-based answers

### 🤖 AI Chat Interface

* ChatGPT-style UI
* Real-time responses
* Source references
* Document-aware conversations

### 🎨 Modern Frontend

* React + TypeScript
* Tailwind CSS
* Responsive design
* Dark mode support
* Dashboard analytics

### ⚡ Backend API

* FastAPI
* RESTful endpoints
* Dockerized deployment
* AWS EC2 hosting

---

## 🏗️ System Architecture

```text
User
 │
 ▼
Frontend (React + TypeScript)
 │
 ▼
FastAPI Backend
 │
 ├── PDF Processing
 ├── Embedding Generation
 ├── Semantic Search
 │
 ▼
ChromaDB Vector Store
 │
 ▼
AI Response Generation
 │
 ▼
Answer + Source Citations
```

---

## 🛠️ Tech Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* Axios

### Backend

* FastAPI
* Python
* ChromaDB
* Uvicorn

### DevOps

* Docker
* AWS EC2
* GitHub
* Vercel

---

## 📂 Project Structure

```text
project-root/
│
├── src/                # Frontend Source
├── public/             # Static Assets
│
├── rag/                # RAG Engine
├── main.py             # FastAPI Entry Point
├── requirements.txt    # Python Dependencies
├── Dockerfile
├── docker-compose.yml
│
├── package.json
├── vite.config.ts
└── README.md
```

---

## 🚀 Installation

### Frontend

```bash
npm install
npm run dev
```

Runs at:

```text
http://localhost:5173
```

---

### Backend

```bash
pip install -r requirements.txt
python main.py
```

Runs at:

```text
http://localhost:8000
```

---

## 🐳 Docker Deployment

Build:

```bash
docker build -t rag-api .
```

Run:

```bash
docker run -p 8000:8000 rag-api
```

---

## 📡 API Endpoints

### Health Check

```http
GET /health
```

### Upload Document

```http
POST /upload
```

### List Documents

```http
GET /documents
```

### Delete Document

```http
DELETE /documents/{filename}
```

### Query Documents

```http
POST /query
```

---

## 🔒 Security Notes

* Environment variables stored in `.env`
* Secrets excluded from Git
* Vector database stored locally
* Docker-ready deployment

---

## 📈 Future Improvements

* User Authentication
* Multi-document Collections
* Streaming Responses
* Role-Based Access Control
* Hybrid Search
* OpenAI / Local LLM Support
* Document Summarization

---

## 👨‍💻 Author

**Manglam**

AI • Full Stack Development • Cloud • RAG Systems

---

## ⭐ Support

If you found this project useful:

⭐ Star the repository

🍴 Fork the project

🚀 Build something amazing
