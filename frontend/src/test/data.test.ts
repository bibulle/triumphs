import { describe, it, expect } from 'vitest';
import { DATA, GROUPS, CAT_FR, SUB_FR } from '../data';

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

  it('groupKey matches section|cat|sub', () => {
    DATA.forEach(d => {
      expect(d.groupKey).toBe(`${d.section}|${d.cat}|${d.sub}`);
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

  it('has a French label for every cat|sub present in DATA', () => {
    const keys = new Set(DATA.map(d => `${d.cat}|${d.sub}`));
    keys.forEach(key => expect(SUB_FR[key]).toBeTruthy());
  });
});

