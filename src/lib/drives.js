// The place-based special drives. All work the same way: the district lists the places (settlements, landing centres or welfare institutions),
// allots them to institutions, and each institution records its visits with the volunteers who went. (The Vote Unbound call campaign, for persons with
// disabilities, is separate: it holds personal data in its own private register. The 'unbound' drive here is only the list of welfare institutions to visit.)
export const DRIVES = {
  unnathi: { name: 'Vote Unnathi', slug: 'vote-unnathi', placeholder: 'e.g. the name of the settlement', logo: '/img/drives/vote-unnathi.webp', unit: 'settlement', units: 'settlements', group: 'Scheduled Tribe settlements', blurb: 'Reach every eligible voter in the Scheduled Tribe settlements: awareness meetings, help with voter registration, and a first look at the voting machine.',
    kinds: ['Settlement (oorukoottam)', 'Colony', 'Hamlet', 'Other'],
    types: { meeting: 'Awareness meeting at the settlement', door: 'Door-to-door contact', register: 'Voter registration help (Form 6)', docs: 'Help with documents or ID', evm: 'Voting machine demonstration', followup: 'Follow-up visit', other: 'Something else' } },
  sea: { name: 'Sea Your Vote', slug: 'sea-your-vote', placeholder: 'e.g. the name of the landing centre', logo: '/img/drives/sea-your-vote.webp', unit: 'landing centre', units: 'landing centres', group: 'Fishing communities', blurb: 'Reach voters in the coastal and fishing communities: awareness at the landing centres, help with voter registration, and a first look at the voting machine.',
    kinds: ['Landing centre', 'Harbour', 'Coastal settlement', 'Fishing village', 'Other'],
    types: { meeting: 'Awareness session at the landing centre', door: 'House-to-house contact', register: 'Voter registration help (Form 6)', docs: 'Help with documents or ID', evm: 'Voting machine demonstration', away: 'Follow-up for voters away at sea', other: 'Something else' } },
  unbound: { name: 'Vote Unbound', slug: 'vote-unbound-institutions', placeholder: 'e.g. the name of the welfare home or BRC', pop: 'Residents or members (approx.)', unit: 'institution', units: 'welfare institutions', group: 'Persons with disabilities and the elderly',
    logo: '/img/drives/vote-unbound.webp', blurb: 'Visit the welfare institutions allotted to you (welfare homes, old age homes, BRCs, Buds and special schools): awareness on the facilities for voters with disabilities, help with voter registration, and a first look at the voting machine.',
    kinds: ['Welfare home', 'Old age home', 'BRC (Block Resource Centre)', 'Buds school / special school', 'Rehabilitation or day care centre', 'Other'],
    types: { meeting: 'Awareness session at the institution', facility: 'Explained voting facilities (ramp, wheelchair, home voting)', register: 'Voter registration help (Form 6)', docs: 'Help with documents or ID', evm: 'Voting machine demonstration', followup: 'Follow-up visit', other: 'Something else' } },
};
export const STATUS = { todo: 'Not started', doing: 'In progress', done: 'Completed' };
