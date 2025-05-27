# Drawing Management Software (Internal)

Internal tool for managing technical drawings and their associated dimensions. This system allows engineers and technicians to search for parts, view their dimensions, and manage technical drawings.

## Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/bosdajackie/drawing-management.git
   cd drawing-management-software
   ```

2. Import the database:
   ```bash
   # Navigate to backend directory
   cd backend
   
   # Create a new SQLite database from the dump
   sqlite3 sql_app.db < database_dump.sql
   ```

3. Set up environment variables:
   ```bash
   # In backend directory
   cp .env.example .env
   ```
   Note: The default settings in `.env.example` are configured for internal use.

## Detailed Setup

### Backend Setup (Python 3.11+)

1. Create and activate virtual environment:
   ```bash
   # In backend directory
   python -m venv venv
   
   # Windows
   .\venv\Scripts\activate
   
   # Unix/MacOS
   source venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Start the backend server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The API will be available at http://localhost:8000

### Frontend Setup (Node.js 16+)

1. Install dependencies:
   ```bash
   # In frontend directory
   cd frontend
   npm install
   ```

2. Start development server:
   ```bash
   npm start
   ```
   The application will be available at http://localhost:3000

