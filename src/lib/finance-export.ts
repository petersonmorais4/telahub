type Row = Record<string, string | number | null>;

export async function exportFinanceXlsx(year: string, costs: Row[], revenues: Row[]) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const add = (name: string, rows: Row[], money: string) => {
    const ws = wb.addWorksheet(name);
    const keys = rows[0] ? Object.keys(rows[0]) : ["Sem dados"];
    ws.columns = keys.map((k) => ({ header: k, key: k, width: Math.max(14, k.length + 4) }));
    rows.forEach((r) => ws.addRow(r));
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
    const col = keys.indexOf(money) + 1;
    if (col > 0 && rows.length) {
      ws.getColumn(col).numFmt = '"R$" #,##0.00';
      const L = ws.getColumn(col).letter;
      const t = ws.addRow({ [keys[0]]: "TOTAL" });
      t.getCell(col).value = { formula: `SUM(${L}2:${L}${rows.length + 1})` };
      t.font = { bold: true };
    }
  };
  add("Custos", costs, "Valor");
  add("Receitas", revenues, "Valor");
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `financeiro-telahub-${year}.xlsx`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
