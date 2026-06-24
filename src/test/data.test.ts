import { describe, it, expect } from 'vitest';
import {
  DATA, GROUPS, PLAYERS, CAT_FR, SUB_FR,
  buildInitialProgress,
} from '../data';

describe('DATA', () => {
  it('has 204 triumphs', () => {
    expect(DATA).toHaveLength(204);
  });

  it('assigns unique ids', () => {
    const ids = DATA.map(d => d.id);
    expect(new Set(ids).size).toBe(DATA.length);
  });

  it('every triumph has non-empty en and fr titles', () => {
    DATA.forEach(d => {
      expect(d.en.length).toBeGreaterThan(0);
      expect(d.fr.length).toBeGreaterThan(0);
    });
  });

  it('groupKey matches cat|sub', () => {
    DATA.forEach(d => {
      expect(d.groupKey).toBe(`${d.cat}|${d.sub}`);
    });
  });
});

describe('GROUPS', () => {
  it('has 17 groups', () => {
    expect(GROUPS).toHaveLength(17);
  });

  it('all items in GROUPS match DATA', () => {
    const allFromGroups = GROUPS.flatMap(g => g.items);
    expect(allFromGroups).toHaveLength(DATA.length);
  });

  it('each group has at least one item', () => {
    GROUPS.forEach(g => expect(g.items.length).toBeGreaterThan(0));
  });
});

describe('CAT_FR / SUB_FR', () => {
  it('has a French label for every category present in DATA', () => {
    const cats = new Set(DATA.map(d => d.cat));
    cats.forEach(cat => expect(CAT_FR[cat]).toBeTruthy());
  });

  it('has a French label for every groupKey present in DATA', () => {
    const keys = new Set(DATA.map(d => d.groupKey));
    keys.forEach(key => expect(SUB_FR[key]).toBeTruthy());
  });
});

describe('buildInitialProgress', () => {
  it('returns an entry for each player', () => {
    const p = buildInitialProgress();
    PLAYERS.forEach(name => expect(p[name]).toBeInstanceOf(Set));
  });

  it('Bibullus starts with triumphs marked done:true', () => {
    const p = buildInitialProgress();
    const doneTruths = DATA.filter(d => d.done).map(d => d.id);
    doneTruths.forEach(id => expect(p.Bibullus.has(id)).toBe(true));
  });

  it('the first triumph is done for all players (demo allDone)', () => {
    const p = buildInitialProgress();
    PLAYERS.forEach(name => expect(p[name].has(DATA[0].id)).toBe(true));
  });

  it('Vincent and Guiz only have the demo triumph initially', () => {
    const p = buildInitialProgress();
    // They should only have the first triumph (added for demo)
    // unless DATA[0].done is true (Bibullus path), but for Vincent/Guiz
    // the Set should only contain DATA[0].id
    ['Vincent', 'Guiz'].forEach(name => {
      const set = p[name as 'Vincent' | 'Guiz'];
      expect(set.has(DATA[0].id)).toBe(true);
      DATA.slice(1).forEach(d => {
        // none of the non-first triumphs should be in their set
        // (the raw done flag only applies to Bibullus)
        expect(set.has(d.id)).toBe(false);
      });
    });
  });
});
