// Shift roster logic. Every village a college holds needs 2 student volunteers on each of 15 days.
// The college keeps one list of students (its "pool"); the roster hands them out so that
//   - a student works only one village on any given day (the pool is split into one group per village),
//   - inside a group the students form pairs and each pair works `shiftLen` days in a row, then the next pair takes over,
//   - when every pair has had a turn the cycle repeats ("those who repeat").

// the next `count` calendar dates from `start` (YYYY-MM-DD), optionally leaving out Sundays
export function workingDates(start, count, skipSundays) {
  const out = [];
  const [y, m, d] = start.split('-').map(Number);
  for (let t = Date.UTC(y, m - 1, d); out.length < count && out.length < 400; t += 864e5) {
    const dt = new Date(t);
    if (skipSundays && dt.getUTCDay() === 0) continue;
    out.push(dt.toISOString().slice(0, 10));
  }
  return out;
}

// split the pool into one group per village, dealing students out like cards so groups stay balanced
export function splitPool(pool, villageCount) {
  const groups = Array.from({ length: villageCount }, () => []);
  pool.forEach((s, i) => groups[i % villageCount].push(s));
  return groups;
}

// pairs inside a group: (1,2) (3,4) ... ; an odd student out is paired with the first one so nobody is left behind
export function pairsOf(group) {
  if (group.length === 0) return [];
  if (group.length === 1) return [[group[0]]];
  const pairs = [];
  for (let i = 0; i < group.length; i += 2) pairs.push([group[i], group[(i + 1) % group.length]]);
  return pairs;
}

// who works day number `dayIndex` (0-based) of a village whose group is `group`
export function whoWorks(group, dayIndex, shiftLen) {
  const pairs = pairsOf(group);
  if (!pairs.length) return [];
  return pairs[Math.floor(dayIndex / Math.max(1, shiftLen)) % pairs.length];
}

// full plan for one college: villageDays = [{ villageId, days: [{dayId, date}] }]  ->  [{ dayId, students: [...] }]
export function planRoster(pool, villageDays, shiftLen) {
  const groups = splitPool(pool, villageDays.length || 1);
  const plan = [], warnings = [];
  villageDays.forEach((v, vi) => {
    const group = groups[vi] || [];
    if (group.length < 2) warnings.push({ villageId: v.villageId, have: group.length, need: 2 });
    [...v.days].sort((a, b) => a.date.localeCompare(b.date)).forEach((day, i) => plan.push({ dayId: day.dayId, villageId: v.villageId, students: whoWorks(group, i, shiftLen) }));
  });
  return { plan, warnings, needTotal: 2 * villageDays.length };
}
