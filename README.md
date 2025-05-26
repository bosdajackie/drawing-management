# Drawing Management Software

A web application for managing technical drawings with dimension search capabilities.

## Project Structure
```
drawing-management-software/
├── backend/               # FastAPI backend
│   ├── app/              # Application code
│   ├── venv/             # Python virtual environment
│   └── requirements.txt  # Python dependencies
└── frontend/             # React frontend
    ├── src/              # Source code
    ├── public/           # Static files
    └── package.json      # Node.js dependencies
```

## Prerequisites

- Python 3.11
- Node.js
- MySQL Server (8.0 recommended)
- Git (optional)

## Setup Instructions

### MySQL Setup

1. Start MySQL Server:
   ```bash
   # On Windows:
   # Method 1: Using Services
   # 1. Press Win + R
   # 2. Type 'services.msc'
   # 3. Find 'MySQL80' or similar
   # 4. Click 'Start'

   # Method 2: Using Command Prompt (as Administrator)
   net start MySQL80

   # On macOS:
   brew services start mysql

   # On Linux:
   sudo systemctl start mysql
   ```

2. Verify MySQL is running:
   ```bash
   # Connect to MySQL
   mysql -u your_username -p
   # Enter your password when prompted
   ```

3. Create the database:
   ```sql
   CREATE DATABASE drawing_management;
   ```

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Activate the virtual environment:
   ```bash
   # On Windows
   .\venv\Scripts\activate

   # On macOS/Linux
   source venv/bin/activate
   ```

3. Create a `.env` file in the backend directory with your MySQL credentials:
   ```env
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=drawing_management
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Application

### 1. Start MySQL Server
Make sure your MySQL server is running:
- On Windows: Check Services (services.msc) > MySQL80 is "Running"
- On macOS: `brew services list` should show mysql as "started"
- On Linux: `systemctl status mysql` should show "active (running)"

### 2. Start Backend Server
```bash
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --reload
```
The backend will run on http://localhost:8000

### 3. Start Frontend Server
In a new terminal:
```bash
cd frontend
npm start
```
The frontend will run on http://localhost:3000

## Features

- Search parts by dimensions
- Upload and process technical drawings
- Manage parts database
- Dynamic dimension fields based on database configuration

## Troubleshooting

### Common Issues

1. **ModuleNotFoundError**:
   - Make sure you've activated the virtual environment
   - Verify all dependencies are installed: `pip install -r requirements.txt`

2. **Database Connection Error**:
   - Check if MySQL is running using the commands above
   - Try connecting directly with `mysql -u your_username -p`
   - Verify credentials in `.env` file
   - Ensure database exists: `drawing_management`
   - Common MySQL error fixes:
     ```bash
     # If MySQL won't start, try:
     # 1. Check error logs:
     #    - Windows: C:\ProgramData\MySQL\MySQL Server 8.0\Data\COMPUTER_NAME.err
     #    - Linux/Mac: /var/log/mysql/error.log
     # 2. Reset MySQL password if needed:
     #    https://dev.mysql.com/doc/refman/8.0/en/resetting-permissions.html
     ```

3. **Frontend Can't Connect to Backend**:
   - Verify both servers are running
   - Check if ports 3000 and 8000 are available
   - Look for CORS errors in browser console

### Port Issues
- Backend default port: 8000
- Frontend default port: 3000
- If these ports are in use, you'll need to modify the configuration

## Development Notes

- Backend API documentation available at http://localhost:8000/docs
- Frontend uses TypeScript and Tailwind CSS
- Database schema managed through SQLAlchemy models 