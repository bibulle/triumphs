import { useState, useCallback, useMemo } from 'react';
import { SECTIONS, buildInitialProgress } from './data';
import SectionTabs from './components/SectionTabs';
import Hero from './components/Hero';
import Toolbar from './components/Toolbar';
import TriumphTable from './components/TriumphTable';
import EmptySection from './components/EmptySection';
import { useTheme } from './hooks/useTheme';
import type { Player } from './data';

import './App.css';

export default function App() {
  const [activeSection, setActiveSection] = useState('monument');
  const [progress] = useState(() => buildInitialProgress());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [hideDone, setHideDone] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  const currentSection = useMemo(
    () => SECTIONS.find(s => s.id === activeSection)!,
    [activeSection]
  );

  const toggleGroup = useCallback((groupKey: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => setCollapsed(new Set()), []);
  const collapseAll = useCallback((keys: string[]) => setCollapsed(new Set(keys)), []);

  const progressFor = useCallback((player: Player) => progress[player], [progress]);

  return (
    <div className="wrap">
      <SectionTabs
        sections={SECTIONS}
        activeId={activeSection}
        onSelect={setActiveSection}
      />

      <Hero
        sectionLabel={currentSection.label}
        hasData={currentSection.hasData}
        progressFor={progressFor}
      />

      {currentSection.hasData ? (
        <>
          <Toolbar
            search={search}
            onSearch={setSearch}
            hideDone={hideDone}
            onToggleDone={() => setHideDone(h => !h)}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
          <TriumphTable
            collapsed={collapsed}
            onToggleGroup={toggleGroup}
            search={search}
            hideDone={hideDone}
            progressFor={progressFor}
          />
        </>
      ) : (
        <EmptySection label={currentSection.label} />
      )}

      <footer className="footer">
        Monument of Triumph est un contenu du jeu Destiny 2 (Bungie). Noms FR provisoires — descriptions à venir.
      </footer>
    </div>
  );
}
