// The two settlement-based special drives. Both work the same way: the district lists the places (settlements or landing centres), allots them to institutions,
// and each institution records its visits. (Vote Unbound, for persons with disabilities, is separate: it holds personal data in its own private register.)
export const DRIVES = {
  unnathi: { name: 'Vote Unnathi', logo: '/img/drives/vote-unnathi.webp', unit: 'settlement', units: 'settlements', group: 'Scheduled Tribe settlements', blurb: 'Reach every eligible voter in the Scheduled Tribe settlements: awareness meetings, help with voter registration, and a first look at the voting machine.',
    kinds: ['Settlement (oorukoottam)', 'Colony', 'Hamlet', 'Other'],
    types: { meeting: 'Awareness meeting at the settlement', door: 'Door-to-door contact', register: 'Voter registration help (Form 6)', docs: 'Help with documents or ID', evm: 'Voting machine demonstration', followup: 'Follow-up visit', other: 'Something else' } },
  sea: { name: 'Sea Your Vote', logo: '/img/drives/sea-your-vote.webp', unit: 'landing centre', units: 'landing centres', group: 'Fishing communities', blurb: 'Reach voters in the coastal and fishing communities: awareness at the landing centres, help with voter registration, and a first look at the voting machine.',
    kinds: ['Landing centre', 'Harbour', 'Coastal settlement', 'Fishing village', 'Other'],
    types: { meeting: 'Awareness session at the landing centre', door: 'House-to-house contact', register: 'Voter registration help (Form 6)', docs: 'Help with documents or ID', evm: 'Voting machine demonstration', away: 'Follow-up for voters away at sea', other: 'Something else' } },
};
export const STATUS = { todo: 'Not started', doing: 'In progress', done: 'Completed' };
