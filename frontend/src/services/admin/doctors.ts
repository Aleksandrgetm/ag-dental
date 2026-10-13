export const editorialDoctorKey = 'clinic.doctorBio';
export function unifiedDoctors(rows: any[], editorial: any) {
  const linked = rows.filter(r => r.data.editorial_key === editorialDoctorKey);
  // Never infer identity from names. Database enforces one explicit link.
  const cards = rows.map(row => ({id: row.id, row, editorial: row.data.editorial_key === editorialDoctorKey ? editorial : null}));
  if (editorial && !linked.length) cards.unshift({id: editorialDoctorKey, row: null, editorial});
  return cards;
}
