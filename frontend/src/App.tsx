import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppData } from './hooks/useAppData';
import { useVersionCheck } from './hooks/useVersionCheck';
import ProgressionModal from './components/ProgressionModal';
import SectionTabs from './components/SectionTabs';
import Hero from './components/Hero';
import Toolbar from './components/Toolbar';
import TriumphTable from './components/TriumphTable';
import MobileView from './components/MobileView';
import EmptySection from './components/EmptySection';
import LangPicker from './components/LangPicker';
import { useTheme } from './hooks/useTheme';
import { useLocaleState } from './hooks/useLocale';
import { useNavState } from './hooks/useNavState';
import { LocaleContext, useLocale } from './i18n';
import { saveAnnotations } from './api';
import type { Player, FilterState, SortState, Annotations, PrioLevel, FlagKey } from './data';
import { DEFAULT_FILTER } from './data';

import './App.css';

function AppInner() {
  const { navState, setTab, toggleGroup: navToggleGroup, closeAll, openFirst } = useNavState();
  const activeSection = navState.tab;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [sortState, setSortState] = useState<SortState>('default');
  const { theme, toggle: toggleTheme } = useTheme();
  const { t, locale } = useLocale();
  const updateAvailable = useVersionCheck();
  const [progressionOpen, setProgressionOpen] = useState(false);

  const { groups, triumphs, players, progress, progressDetail, nodes, annotations: initAnnotations, sections, loading, error, syncError, refreshProgress, nextRefreshIn } = useAppData();
  const [annotations, setAnnotations] = useState<Annotations>({});

  // Merge server annotations once loaded
  useEffect(() => {
    setAnnotations(initAnnotations);
  }, [initAnnotations]);

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
  const progressDetailFor = useCallback((player: Player) => progressDetail[player] ?? {}, [progressDetail]);

  const handleAnnotation = useCallback((player: string, id: string, prio: PrioLevel, flag: FlagKey | null) => {
    setAnnotations(prev => {
      const pa = prev[player] ?? { prio: {}, flags: {} };
      const newPrio = { ...pa.prio };
      const newFlags = { ...pa.flags };
      if (prio > 0) newPrio[id] = prio; else delete newPrio[id];
      if (flag) newFlags[id] = flag; else delete newFlags[id];
      const updated = { ...prev, [player]: { prio: newPrio, flags: newFlags } };
      saveAnnotations(player, { prio: newPrio, flags: newFlags }).catch(console.error);
      return updated;
    });
  }, []);

  if (loading) return <div className="loading">{t.loading}</div>;
  if (error) return <div className="error">{t.error} : {error}</div>;

  const sectionLabel = currentSection ? (t.sections[currentSection.id] ?? currentSection.label) : '';

  return (
    <div className="wrap">
      {updateAvailable && (
        <div className="updateBanner">
          {t.updateAvailable} &mdash;{' '}
          <button onClick={() => window.location.reload()}>{t.reload}</button>
        </div>
      )}
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
            filter={filter}
            onFilterChange={setFilter}
            sortState={sortState}
            onSortChange={setSortState}
            players={players}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
            theme={theme}
            onToggleTheme={toggleTheme}
            onRefreshProgress={refreshProgress}
            nextRefreshIn={nextRefreshIn}
            syncError={syncError}
            onShowProgression={() => setProgressionOpen(true)}
          />
          <TriumphTable
            groups={sectionGroups}
            triumphs={sectionTriumphs}
            players={players}
            collapsed={collapsed}
            onToggleGroup={toggleGroup}
            search={search}
            filter={filter}
            sortState={sortState}
            annotations={annotations}
            onAnnotation={handleAnnotation}
            progressFor={progressFor}
            progressDetailFor={progressDetailFor}
            locale={locale}
            nodes={nodes}
          />
          <MobileView
            groups={sectionGroups}
            triumphs={sectionTriumphs}
            players={players}
            search={search}
            filter={filter}
            sortState={sortState}
            annotations={annotations}
            progressFor={progressFor}
            progressDetailFor={progressDetailFor}
            nodes={nodes}
          />
        </>
      ) : (
        <EmptySection label={sectionLabel} />
      )}

      <ProgressionModal
        open={progressionOpen}
        onClose={() => setProgressionOpen(false)}
        players={players}
        sections={sections}
      />

      <footer className="footer">
        {t.footer}
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
