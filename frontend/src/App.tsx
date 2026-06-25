import { useCallback, useMemo } from 'react';
import { useAppData } from './hooks/useAppData';
import SectionTabs from './components/SectionTabs';
import Hero from './components/Hero';
import Toolbar from './components/Toolbar';
import TriumphTable from './components/TriumphTable';
import EmptySection from './components/EmptySection';
import LangPicker from './components/LangPicker';
import { useTheme } from './hooks/useTheme';
import { useLocaleState } from './hooks/useLocale';
import { useNavState } from './hooks/useNavState';
import { LocaleContext, useLocale } from './i18n';
import type { Player } from './data';
import { useState } from 'react';

import './App.css';

function AppInner() {
  const { navState, setTab, toggleGroup: navToggleGroup, closeAll, openFirst } = useNavState();
  const activeSection = navState.tab;
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

  // Derive collapsed Set: all groups except the one currently open
  const openGroup = navState.openGroups[activeSection] ?? null;
  const collapsed = useMemo(() => {
    const all = new Set(sectionGroups.map(g => g.groupKey));
    if (openGroup) all.delete(openGroup);
    return all;
  }, [sectionGroups, openGroup]);

  const toggleGroup = useCallback((groupKey: string) => {
    navToggleGroup(activeSection, groupKey);
  }, [navToggleGroup, activeSection]);

  const collapseAll = useCallback(() => closeAll(activeSection), [closeAll, activeSection]);
  const expandAll = useCallback(() => {
    const first = sectionGroups[0]?.groupKey;
    if (first) openFirst(activeSection, first);
  }, [openFirst, activeSection, sectionGroups]);

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
          onSelect={setTab}
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
