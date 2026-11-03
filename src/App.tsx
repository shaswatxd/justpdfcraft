import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { Hero } from './components/home/Hero';
import { ToolGrid } from './components/home/ToolGrid';
import { FeatureBanners } from './components/home/FeatureBanners';
import { ToolWorkspace } from './components/workspace/ToolWorkspace';
import { TOOLS } from './config/tools';
import { ToolId } from './types/pdf';

export function App() {
  const [currentToolId, setCurrentToolId] = useState<ToolId | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync with URL Hash for seamless linking
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as ToolId;
      if (TOOLS.some(t => t.id === hash)) {
        setCurrentToolId(hash);
      } else {
        setCurrentToolId(null);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSelectTool = (id: ToolId | null) => {
    setCurrentToolId(id);
    if (id) {
      window.location.hash = id;
    } else {
      window.location.hash = '';
    }
  };

  const activeTool = TOOLS.find(t => t.id === currentToolId);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-800">
      <Navbar currentToolId={currentToolId} onSelectTool={handleSelectTool} />

      <main className="flex-1">
        {activeTool ? (
          <ToolWorkspace
            tool={activeTool}
            onBack={() => handleSelectTool(null)}
            onSelectTool={handleSelectTool}
          />
        ) : (
          <div className="space-y-8 pb-12">
            <Hero searchQuery={searchQuery} onSearchChange={setSearchQuery} />
            <ToolGrid
              tools={TOOLS}
              searchQuery={searchQuery}
              onSelectTool={handleSelectTool}
            />
            {!searchQuery && <FeatureBanners />}
          </div>
        )}
      </main>

      <Footer onSelectTool={handleSelectTool} />
    </div>
  );
}

export default App;
