import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import PartSearch from './pages/PartSearch';
import ManageParts from './pages/ManageParts';
import AddDrawings from './pages/AddDrawings';
import DrawingLabelingPage from './pages/DrawingLabelingPage';
import PartDetail from './pages/PartDetail';
import SearchResults from './pages/SearchResults';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/search" />} />
          <Route path="/search" element={<PartSearch />} />
          <Route path="/search/results" element={<SearchResults />} />
          <Route path="/drawings">
            <Route path="add" element={<AddDrawings />} />
            <Route path="labeling" element={<DrawingLabelingPage />} />
            <Route path="labeling/complete" element={<Navigate to="/manage" />} />
          </Route>
          <Route path="/manage" element={<ManageParts />} />
          <Route path="/part/:id" element={<PartDetail />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
