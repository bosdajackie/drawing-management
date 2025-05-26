import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaSearch, FaCog, FaPlus } from 'react-icons/fa';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-[#2D2B43] text-white">
        <nav className="mt-8">
          <Link
            to="/search"
            className={`block px-6 py-3 text-lg flex items-center ${
              location.pathname === '/search'
                ? 'bg-[#413E5B]'
                : 'hover:bg-[#413E5B]'
            }`}
          >
            {FaSearch({ size: 20, className: "mr-3" })}
            <span>Part Search</span>
          </Link>
          <Link
            to="/drawings/add"
            className={`block px-6 py-3 text-lg flex items-center ${
              location.pathname.startsWith('/drawings')
                ? 'bg-[#413E5B]'
                : 'hover:bg-[#413E5B]'
            }`}
          >
            {FaPlus({ size: 20, className: "mr-3" })}
            <span>Add Drawings</span>
          </Link>
          <Link
            to="/manage"
            className={`block px-6 py-3 text-lg flex items-center ${
              location.pathname === '/manage'
                ? 'bg-[#413E5B]'
                : 'hover:bg-[#413E5B]'
            }`}
          >
            {FaCog({ size: 20, className: "mr-3" })}
            <span>Manage Parts</span>
          </Link>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout; 