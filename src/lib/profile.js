// Everything the district office keeps about an institution besides its name and address: the ELC coordinator and the head of the institution.
// One set of fields, used by the staff Colleges / Schools pages and by the institution's own Profile page.
import { str, emailOk } from './util.js';

export const EXTRA = ['coord_phone', 'coord_email', 'designation', 'head_name', 'head_phone', 'inst_type', 'inst_code'];
const PROFILE_PARTS = [['address', 'Address'], ['phone', 'Contact number'], ['email', 'Email'], ['coordinator', 'Coordinator name'], ['designation', 'Coordinator designation'], ['coord_phone', 'Coordinator phone'], ['coord_email', 'Coordinator email'], ['head_name', 'Head of institution'], ['head_phone', 'Head of institution phone'], ['inst_type', 'Type of institution'], ['inst_code', 'Institution code']];
export function profileStatus(c) {
  const missing = PROFILE_PARTS.filter(([k]) => !String(c[k] ?? '').trim()).map(([, l]) => l);
  return { pct: Math.round((PROFILE_PARTS.length - missing.length) / PROFILE_PARTS.length * 100), missing };
}
export const INST_TYPES = ['Government', 'Aided', 'Unaided / self-financing', 'Autonomous', 'Other'];
export function extraBody(b) {
  return {
    coord_phone: str(b.coord_phone, 30), coord_email: b.coord_email ? emailOk(b.coord_email, 'Coordinator email') : '', designation: str(b.designation, 80),
    head_name: str(b.head_name, 100), head_phone: str(b.head_phone, 30), inst_type: INST_TYPES.includes(b.inst_type) ? b.inst_type : '', inst_code: str(b.inst_code, 40),
  };
}
