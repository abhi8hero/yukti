import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import { Toaster } from '@/components/ui/sonner';
import AdcpApp from '@/pages/AdcpApp';

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('adcp-theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('adcp-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggleDark = () => setDarkMode((v) => !v);

  return (
    <Router>
      <IntersectObserver />
      <div className="h-screen w-screen overflow-hidden flex flex-col">
        <Routes>
          <Route path="/" element={<AdcpApp darkMode={darkMode} onToggleDark={toggleDark} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <footer className="border-t py-4 text-center bg-background"> <p> ©{' '} <strong> <a href="https://abhi8hero.github.io/portfolio-abhishek_ugare/" target="_blank" rel="noopener noreferrer" className="hover:underline" > Abhi The Great </a> </strong> </p> </footer>
      </div>
      <Toaster richColors position="top-right" />
    </Router>
  );
};

export default App;
