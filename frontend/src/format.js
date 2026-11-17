export function money(value) {
  const n = Number(value || 0);
  return 'KSh ' + n.toLocaleString('en-KE', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
}

// Dates from the API are UTC midnight, so display them in UTC to avoid off-by-one days.
export function date(value) {
  return value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '-';
}

export const toInputDate = (value = new Date()) => new Date(value).toISOString().slice(0, 10);

export const label = (text) => (text ? text.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '');

// CSV download used by the Reports page.
export function downloadCsv(filename, columns, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [columns.map((c) => esc(c.header)).join(',')];
  rows.forEach((r) => lines.push(columns.map((c) => esc(c.value(r))).join(',')));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const loanCode = (id) => `L-${String(id).padStart(3, '0')}`;
