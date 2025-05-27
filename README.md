# Drawing Management Software (Internal)

Internal tool for managing technical drawings and their associated dimensions. This system allows engineers and technicians to search for parts, view their dimensions, and manage technical drawings.

## Quick Start

1. Clone the repository:
   ```bash
   git clone [internal-repo-url]
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

## Database Structure

### Included Tables
- `part_types`: Part type definitions
- `dimensions`: Standard dimension definitions
- `part_type_dimensions`: Mapping between part types and their dimensions
- `parts`: Part information
- `dimension_values`: Actual dimension measurements

### Default Data
The SQL dump includes:
- Standard part types used in the company
- Common dimensions and their units
- Part type-dimension associations
- Sample parts for testing

## Usage Guidelines

### Part Search
1. Select part type from dropdown
2. Enter part number (optional)
3. Results will show:
   - Part number
   - All dimensions associated with the part type
   - Link to technical drawing

### Adding New Parts
1. Use the Part Entry form
2. Required fields:
   - Part number (must be unique)
   - Part type
   - All dimensions marked as required

## Troubleshooting

### Common Issues

1. Database Connection Error
   ```
   Solution: Verify sql_app.db exists in backend directory
   If missing: Re-run sqlite3 sql_app.db < database_dump.sql
   ```

2. Missing Environment Variables
   ```
   Solution: Copy .env.example to .env
   Default values are configured for internal network
   ```

3. Port Conflicts
   ```
   Backend (8000): uvicorn app.main:app --port [new-port] --reload
   Frontend (3000): Update package.json "start" script with PORT=[new-port]
   ```

## Internal Support

- Technical Issues: IT Support Desk (ext. 555)
- Data Questions: Engineering Database Team (ext. 556)
- Feature Requests: Software Development Team (ext. 557)

## Maintenance

### Database Backup
The database is automatically backed up daily to the internal server.
Manual backup:
```bash
# In backend directory
sqlite3 sql_app.db .dump > backup_$(date +%Y%m%d).sql
```

### Updating Part Types/Dimensions
New part types and dimensions should be added through the database team to ensure consistency across all systems.

## Security Notes

- Do not share the .env file or database credentials
- All API requests are logged for audit purposes
- Drawing files are stored on internal secure storage
- Access is restricted to internal network only 