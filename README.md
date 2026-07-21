# Data Integrity Risk Assessment Platform

An AI-Enhanced web-based decision support platform for data integrity risk assessment in pharmaceutical environments

## Architecture

- **Frontend**: TypeScript + Preact + Chart.js (port 5173)
- **Backend**: Python + FastAPI (port 8000)
- **Database**: PostgreSQL (external)
- **AI**: GPT-4o + text-embedding-3-large + ChromaDB + LangChain

## Features

- System inventory management and risk assessment
- Multi-level dashboards and data visualization
- RAG-based conversational assistant grounded in a regulatory knowledge base
- Automated generation of action plans for identified data integrity gaps

## Prerequisites

- Docker and Docker Compose
- A running PostgreSQL instance
- An OpenAI-compatible API key

## Setup

1. Clone the repository

   ```
   git clone https://github.com/yessinehammami/AI Enhanced Platform for Data Integrity Risk Assessment.git
   cd AI Enhanced Platform for Data Integrity Risk Assessment
   ```

2. Configure environment variables

   Backend — create `backend/.env` (see `backend/.env.example`):

   ```
   OPENAI_API_KEY=your_api_key_here
   LLM_MODEL=gpt-4o
   EMBEDDING_MODEL=text-embedding-3-large
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   ```

   Frontend — create `frontend/.env` (see `frontend/.env.example`):

   ```
   VITE_BACKEND_URL=http://localhost:8000
   ```

3. Initialize the database

   ```
   cd backend/app
   python -c "from db.db import db_init; db_init()"
   ```

4. Build the RAG knowledge base

   ```
   cd backend/app/RAG
   python embedding.py
   ```

   This generates the ChromaDB vector store used by both the action planning
   assistant and the data integrity chatbot.

5. Run with Docker Compose

   ```
   docker compose up --build
   ```

   - Frontend: http://localhost:5173
   - Backend API docs: http://localhost:8000/docs

## Notes

This is a portfolio version of a project originally developed in a professional
context. LLM API credentials, database credentials have been excluded.

## License

MIT
