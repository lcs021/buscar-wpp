// Prefixos de fórmula precisam ser neutralizados antes de abrir uma exportação
// em Excel/LibreOffice. Aspas CSV, sozinhas, não impedem a execução da fórmula.
export function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@]/u.test(text.trimStart())) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
