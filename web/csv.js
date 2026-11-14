// Prefixos de fórmula precisam ser neutralizados antes de abrir uma exportação
// em Excel/LibreOffice. Aspas CSV, sozinhas, não impedem a execução da fórmula.
export function csvCell(value) {
  let text = String(value ?? "");
  let prefix = 0;
  while (
    prefix < text.length &&
    (text[prefix].trim() === "" || text.charCodeAt(prefix) <= 0x20)
  ) prefix++;
  if (text[prefix] && "=+-@".includes(text[prefix])) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
