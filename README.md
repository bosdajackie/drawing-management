# Drawing Management Software

A web-based application for managing technical drawings and their associated dimensions. This system allows users to search for parts, view their dimensions, and manage technical drawings.

## Features

- **Part Search**: Search parts by part number and part type
- **Dimension Management**: 
  - Each part type has its own set of dimensions
  - Dimensions are displayed with their units
  - Values can be stored for each dimension per part
- **Drawing Viewer**: View technical drawings associated with parts
- **Responsive UI**: Modern, responsive interface built with React and Tailwind CSS

## Tech Stack

### Frontend
- React
- TypeScript
- Tailwind CSS
- React Router for navigation

### Backend
- FastAPI (Python)
- SQLAlchemy for ORM
- SQLite database

## Project Structure

```
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.tsx
│   ├── package.json
│   └── tsconfig.json
│
└── backend/
    ├── app/
    │   ├── models.py      # Database models
    │   ├── schemas.py     # Pydantic schemas
    │   └── main.py        # FastAPI application
    └── requirements.txt
```

## Setup

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Windows:
     ```bash
     .\venv\Scripts\activate
     ```
   - Unix/MacOS:
     ```bash
     source venv/bin/activate
     ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Run the backend server:
   ```bash
   uvicorn app.main:app --reload
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

3. Start the development server:
   ```bash
   npm start
   ```

## Database Schema

### Tables

- **part_types**: Stores different types of parts
  - id: Primary key
  - name: Name of the part type

- **dimensions**: Stores dimension definitions
  - id: Primary key
  - name: Name of the dimension
  - unit: Unit of measurement

- **part_type_dimensions**: Associates dimensions with part types
  - part_type_id: Foreign key to part_types
  - dimension_id: Foreign key to dimensions

- **parts**: Stores individual parts
  - id: Primary key
  - part_number: Unique identifier for the part
  - description: Part description
  - part_type_id: Foreign key to part_types

- **dimension_values**: Stores actual dimension values for parts
  - id: Primary key
  - part_id: Foreign key to parts
  - dimension_id: Foreign key to dimensions
  - value: The actual measurement value

## API Endpoints

- `GET /part-types/`: Get all part types with their dimensions
- `GET /part-types/{part_type_id}/dimensions`: Get dimensions for a specific part type
- `GET /search/`: Search parts with optional filters for part type and part number

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 