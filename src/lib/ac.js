// Assembly Constituencies (ACs) of Kozhikode district, and the district office's list of which AC(s) each college works in (from its assigned villages).
// The first AC listed is taken as the institution's own AC for the quiz and essay rounds; the super admin can change it.
export const ACS = ['Vadakara', 'Kuttiady', 'Nadapuram', 'Koyilandy', 'Perambra', 'Balussery', 'Elathur', 'Kozhikode North', 'Kozhikode South', 'Beypore', 'Kunnamangalam', 'Koduvally', 'Thiruvambady'];

export const AC_LIST = [
  ['Al Irshad Arts and Science College for Women, Thechiyad', ['Koduvally']],
  ['Alphonsa College, Thiruvambady', ['Thiruvambady']],
  ['AV Abdurahman Haji Arts and Science College, Payyoli', ['Perambra']],
  ['AWH Special College, Kallai', ['Kozhikode North']],
  ['Baithul Izza Arts and Science College, Narikkuni', ['Koduvally']],
  ['Bhavans Ramakrishnan Institute of Teacher Education', ['Beypore']],
  ['C K G M Government College, Perambra', ['Perambra']],
  ['CHMKM Government Arts and Science College, Koduvally', ['Koduvally']],
  ['Cooperative Arts and Science College, Kurukkilad, Vatakara', ['Vadakara']],
  ["CSI Christian Muller Women's College, Chombala", ['Vadakara']],
  ['Darul Huda Arts and Science College, Nadapuram', ['Nadapuram']],
  ["Darul Ma'rifa Arabic College, Odungakkad", ['Koduvally']],
  ['Dayapuram Arts and Science College for Women', ['Kunnamangalam']],
  ['Dignity College of Arts and Science, Perambra', ['Perambra']],
  ['Don Bosco College, Mampatta, Mukkam', ['Koduvally']],
  ['Dr. B.R. Ambedkar Memorial Government Arts and Science College, Balussery', ['Balussery']],
  ['Educos Arts and Science College, Kuttiady', ['Kuttiady']],
  ['Farook College (Autonomous), Ramanattukara', ['Beypore']],
  ['Farook Training College, Ramanattukara', ['Beypore']],
  ['Golden Hills Arts and Science College, Elettil', ['Elathur', 'Balussery']],
  ['Government Arts and Science College, Meenchanda', ['Kozhikode North', 'Beypore']],
  ['Government Arts and Science College, Nadapuram', ['Kuttiady']],
  ['Government College of Teacher Education, Kozhikode', ['Kozhikode South']],
  ['Government College, Kodanchery', ['Thiruvambady']],
  ['Government College, Madappally', ['Vadakara']],
  ['Government College, Mokeri', ['Kuttiady']],
  ['Government Law College, Kozhikode', ['Kozhikode North', 'Kozhikode South']],
  ['Gurudeva College of Advanced Studies, Koyilandy', ['Perambra', 'Koyilandy']],
  ['Hi Tech Arts and Science College, Vattoli', ['Nadapuram']],
  ['Holy Cross Institute of Management and Technology (IMT), Kozhikode', ['Kozhikode North']],
  ['Ilahiya Arts and Science College, Koyilandy', ['Koyilandy']],
  ["Jalaliya Women's Arabic College, Kuttikkattoor", ['Kunnamangalam']],
  ['JDT Islam College of Arts and Science', ['Kunnamangalam']],
  ['Kadathanad Arts and Science College, Vatakara', ['Vadakara']],
  ['KMO Arts and Science College, Koduvally', ['Koduvally']],
  ['Kunnamangalam Government Arts and Science College', ['Thiruvambady']],
  ['Little Flower Institute of Social Sciences and Health', ['Koduvally']],
  ['M Dasan Arts and Science College, Ulliyeri', ['Balussery']],
  ['Mahlara Arts and Science College for Women, Mavoor', ['Kunnamangalam']],
  ['Malabar Arts and Science College for Women, Chekkiad (Nadapuram)', ['Nadapuram']],
  ['Malabar Arts and Science College, Moodadi', ['Koyilandy']],
  ['Malabar Christian College, Kozhikode', ['Kozhikode North', 'Elathur']],
  ['MAMO College, Manassery, Mukkam', ['Thiruvambady']],
  ['Markaz College of Arts and Science, Karanthoor', ['Koduvally']],
  ['Markaz Law College', ['Thiruvambady']],
  ['Meppayur Salafi College of Teacher Education, Meppayur', ['Perambra']],
  ['MES Arts and Science College, Charthamangalam', ['Kunnamangalam']],
  ['MES College, Vadakara', ['Nadapuram']],
  ['MET Arts and Science College Nadapuram', ['Kuttiady']],
  ['MH College of Arts and Science', ['Nadapuram']],
  ['MHES College of Science and Technology, Cherandathur', ['Kuttiady']],
  ['Mother Teresa College of Teacher Education, Perambra', ['Balussery']],
  ["Muslim Orphanages' College of Arts and Science, Kuruvattur", ['Elathur']],
  ['National College of Arts and Science, Puliyavu', ['Nadapuram']],
  ['Oriental College of Teacher Education, Poonath', ['Balussery']],
  ['Peekay CICS Arts and Science College, Mathara', ['Kunnamangalam']],
  ["Providence Women's College (Autonomous)", ['Kozhikode South']],
  ['PVS College of Arts and Science, Pantheerankavu', ['Kunnamangalam']],
  ['R Sankar Memorial SNDP Yogam Arts and Science College, Koyilandi', ['Koyilandy']],
  ['Rahmaniya Arabic College, Katameri', ['Kuttiady']],
  ['Rouzathul Uloom Arabic College (RUA College), Farook College, Ramanattukara', ['Beypore']],
  ['SARBTM Government College, Koyilandy', ['Koyilandy']],
  ['SIAS College, Kavilumpara', ['Nadapuram']],
  ['Silver Arts and Science College, Perambra', ['Perambra']],
  ['Sirajulhuda Arts and Science College, Nadapuram', ['Nadapuram']],
  ['SN College, Vatakara', ['Kuttiady', 'Koyilandy']],
  ['SNES College of Arts, Commerce and Management, Chethukadav', ['Kunnamangalam']],
  ['SNG College, Chelannur', ['Elathur']],
  ['Sree Gokulam Arts and Science College, Balussery', ['Elathur', 'Balussery']],
  ['Sree Narayana College of Teacher Education, Chelannur', ['Elathur']],
  ["St. Joseph's College (Autonomous), Devagiri", ['Kozhikode North']],
  ['St. Xaviers Arts and Science College', ['Elathur']],
  ['Sunniyya Arabic College, Chennamangallur', ['Thiruvambady']],
  ['TIM Training College, Nadapuram', ['Nadapuram']],
  ['VKHMO College of Arts and Science for Women, Mukkam', ['Thiruvambady']],
  ["Zamorin's Guruvayurappan College, Kozhikode", ['Kozhikode South', 'Kozhikode North']],
];

// ---- matching the names in the list to the names registered in the portal (spelling differs a little: "Collage", "Co operative", missing commas) ----
const fixWord = w => ({ collage: 'college', colleges: 'college', govt: 'government', gov: 'government', koyilandi: 'koyilandy', quilandy: 'koyilandy', kurukkilad: 'kurikkilad', vatakara: 'vadakara' })[w] || w;
const GENERIC = new Set(['the', 'of', 'and', 'for', 'college', 'school', 'arts', 'art', 's', 'science', 'sc', 'autonomous', 'higher', 'secondary', 'hss', 'vhse', 'hs', 'ghss', 'women', 'womens', 'kozhikode', 'calicut']);
// letters are compared by sound: doubled letters count once and 'oo' is 'u' (Kuttikkattoor = Kuttikattur); "co operative" is one word
const canon = w => fixWord(w).replace(/oo/g, 'u').replace(/(.)\1+/g, '$1');
const joinCo = s => String(s || '').toLowerCase().replace(/\bco[\s-]+operative/g, 'cooperative');
export const keyWords = s => [...new Set(joinCo(s).replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).map(canon).filter(w => w && !GENERIC.has(w)))];
export const normName = s => joinCo(s).replace(/&/g, ' and ').replace(/\b(the|of)\b/g, ' ').split(/[^a-z0-9]+/).map(canon).join('');
const editOne = (a, b) => { if (a.length < b.length) [a, b] = [b, a]; let i = 0; while (i < b.length && a[i] === b[i]) i++; return a.length === b.length ? a.slice(i + 1) === b.slice(i + 1) : a.slice(i + 1) === b.slice(i); };
const sameWord = (a, b) => a === b || (a.length >= 5 && b.length >= 5 && Math.abs(a.length - b.length) <= 1 && editOne(a, b));
// the portal institution a listed name stands for: the same name when spelled alike, else the one clearly closest; null when unsure
export function matchInstitution(name, institutions) {
  const n = normName(name), exact = institutions.find(c => normName(c.name) === n);
  if (exact) return exact;
  const w = keyWords(name); if (!w.length) return null;
  const scored = institutions.map(c => { const cw = keyWords(c.name); if (!cw.length) return { c, s: 0, hit: 0 }; const hit = w.filter(x => cw.some(y => sameWord(x, y))).length; return { c, hit, s: hit / Math.max(w.length, cw.length) * 0.5 + hit / Math.min(w.length, cw.length) * 0.5 }; }).sort((a, b) => b.s - a.s);
  const a = scored[0], b = scored[1];
  return a && a.hit >= 1 && a.s >= 0.75 && (!b || a.s - b.s >= 0.15) ? a.c : null;
}
