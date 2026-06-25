import { useState, useCallback, useMemo } from 'react';
import { useAppData } from './hooks/useAppData';
import SectionTabs from './components/SectionTabs';
import Hero from './components/Hero';
import Toolbar from './components/Toolbar';
import TriumphTable from './components/TriumphTable';
import EmptySection from './components/EmptySection';
import LangPicker from './components/LangPicker';
import { useTheme } from './hooks/useTheme';
import { useLocaleState } from './hooks/useLocale';
import { LocaleContext, useLocale } from './i18n';
import type { Player } from './data';

import './App.css';

function AppInner() {
  const [activeSection, setActiveSection] = useState('triumphs');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [hideDone, setHideDone] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();
  const { t, locale } = useLocale();

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
    () => triumphs.filter(tr => (tr.section ?? 'triumphs') === activeSection),
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
  const collapseAll = useCallback(
    () => setCollapsed(new Set(sectionGroups.map(g => g.groupKey))),
    [sectionGroups]
  );

  const progressFor = useCallback((player: Player) => progress[player] ?? new Set<string>(), [progress]);

  if (loading) return <div className="loading">{t.loading}</div>;
  if (error) return <div className="error">{t.error} : {error}</div>;

  const sectionLabel = currentSection ? (t.sections[currentSection.id] ?? currentSection.label) : '';

  return (
    <div className="wrap">
      <div className="topbar">
        <SectionTabs
          sections={sections}
          activeId={activeSection}
          onSelect={setActiveSection}
        />
        <LangPicker />
      </div>

      <Hero
        sectionLabel={sectionLabel}
        hasData={currentSection?.hasData ?? false}
        triumphs={sectionTriumphs}
        players={players}
        progressFor={progressFor}
      />

      {currentSection?.hasData ? (
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
            locale={locale}
          />
        </>
      ) : (
        <EmptySection label={sectionLabel} />
      )}

      <footer className="footer">
        Monument of Triumph est un contenu du jeu Destiny 2 (Bungie). Noms FR provisoires — descriptions à venir.
      </footer>
    </div>
  );
}

export default function App() {
  const localeState = useLocaleState();
  return (
    <LocaleContext.Provider value={localeState}>
      <AppInner />
    </LocaleContext.Provider>
  );
}
