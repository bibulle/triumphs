import { useState, useCallback, useMemo } from 'react';
import { useAppData } from './hooks/useAppData';
import SectionTabs from './components/SectionTabs';
import Hero from './components/Hero';
import Toolbar from './components/Toolbar';
import TriumphTable from './components/TriumphTable';
import EmptySection from './components/EmptySection';
import { useTheme } from './hooks/useTheme';
import type { Player } from './data';

import './App.css';

export default function App() {
  const [activeSection, setActiveSection] = useState('triumphs');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [hideDone, setHideDone] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  const { groups, triumphs, players, progress, sections, loading, error } = useAppData();

  const currentSection = useMemo(
    () => sections.find(s => s.id === activeSection)!,
    [sections, activeSection]
  );

  const sectionGroups = useMemo(
    () => groups.filter(g => g.section === activeSection),
    [groups, activeSection]
  );

  const sectionTriumphs = useMemo(
    () => triumphs.filter(t => (t.section ?? 'triumphs') === activeSection),
    [triumphs, activeSection]
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

  const progressFor = useCallback((player: Player) => progress[player] ?? new Set<string>(), [progress]);

  if (loading) return <div className="loading">Chargement…</div>;
  if (error) return <div className="error">Erreur : {error}</div>;

  return (
    <div className="wrap">
      <SectionTabs
        sections={sections}
        activeId={activeSection}
        onSelect={setActiveSection}
      />

      <Hero
        sectionLabel={currentSection.label}
        hasData={currentSection.hasData}
        triumphs={sectionTriumphs}
        players={players}
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
            groups={sectionGroups}
            triumphs={sectionTriumphs}
            players={players}
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
