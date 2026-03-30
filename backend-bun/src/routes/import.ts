import Elysia from "elysia";
import { tenantMiddleware } from "../middleware/tenant";
import { authMiddleware } from "../middleware/auth";
import { rateLimit } from "../middleware/rateLimit";
import * as productRepo from "../repositories/product";
import * as catRepo from "../repositories/category";
import * as brandRepo from "../repositories/brand";
import type { ImportResult } from "../types";
import { logger } from "../logger";
import { parse } from "csv-parse/sync";

const slugRe = /[^a-z0-9]+/g;

function slugify(s: string): string {
  s = s.toLowerCase();
  s = s.replace(/[áàãâä]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[íìîï]/g, "i")
    .replace(/[óòõôö]/g, "o")
    .replace(/[úùûü]/g, "u")
    .replace(/ç/g, "c")
    .replace(/ñ/g, "n");
  s = s.replace(/[^a-z0-9\s-]/g, " ");
  s = s.replace(slugRe, "-");
  s = s.replace(/^-|-$/g, "");
  return s;
}

function mapColumns(header: string[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (let i = 0; i < header.length; i++) {
    const col = header[i].toLowerCase().trim();
    switch (col) {
      case "nome": case "name": m["nome"] = i; break;
      case "descricao": case "descrição": case "description": m["descricao"] = i; break;
      case "preco": case "preço": case "price": m["preco"] = i; break;
      case "preco_comparacao": case "preço_comparação": case "compare_price": case "preco comparacao": m["preco_comparacao"] = i; break;
      case "preco_custo": case "preço_custo": case "cost_price": case "preco custo": m["preco_custo"] = i; break;
      case "sku": m["sku"] = i; break;
      case "estoque": case "stock": m["estoque"] = i; break;
      case "categoria": case "category": m["categoria"] = i; break;
      case "marca": case "brand": m["marca"] = i; break;
      case "ativo": case "active": m["ativo"] = i; break;
      case "destaque": case "featured": m["destaque"] = i; break;
      case "imagem_url": case "image_url": case "imagem": m["imagem_url"] = i; break;
    }
  }
  return m;
}

function getCell(row: string[], colIndex: Record<string, number>, col: string): string {
  const idx = colIndex[col];
  if (idx === undefined || idx >= row.length) return "";
  return (row[idx] || "").trim();
}

async function parseCSVData(buffer: Buffer): Promise<string[][]> {
  const text = buffer.toString("utf-8").replace(/^\uFEFF/, ""); // strip BOM

  // Try comma first
  let rows: string[][] = parse(text, { relax_quotes: true, trim: true, skip_empty_lines: true });

  // If only 1 column and contains semicolons, retry with semicolon
  if (rows.length > 0 && rows[0].length === 1 && rows[0][0].includes(";")) {
    rows = parse(text, { delimiter: ";", relax_quotes: true, trim: true, skip_empty_lines: true });
  }

  return rows;
}

async function parseXLSXData(buffer: Buffer): Promise<string[][]> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.default.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows: string[][] = [];
  sheet.eachRow((row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      cells.push(cell.text || "");
    });
    rows.push(cells);
  });
  return rows;
}

export const importRoutes = new Elysia({ prefix: "/api/v1/admin/products" })
  .use(tenantMiddleware)
  .use(authMiddleware)
  .use(rateLimit({ name: "import", max: 5, windowSec: 60 }))
  .post("/import", async ({ body, storeId, set }) => {
    const formData = body as { file?: File };
    const file = formData.file;

    if (!file || !(file instanceof File)) {
      set.status = 400;
      return { code: "VALIDATION_ERROR", message: "Nenhum arquivo enviado" };
    }

    // Limit file size to 5MB
    const MAX_IMPORT_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_IMPORT_SIZE) {
      set.status = 400;
      return { code: "VALIDATION_ERROR", message: "Arquivo muito grande. Limite: 5MB" };
    }

    const ext = file.name.toLowerCase().split(".").pop();
    if (ext !== "csv" && ext !== "xlsx") {
      set.status = 400;
      return { code: "VALIDATION_ERROR", message: "Formato não suportado. Use .csv ou .xlsx" };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let rows: string[][];

    try {
      rows = ext === "csv" ? await parseCSVData(buffer) : await parseXLSXData(buffer);
    } catch (err: unknown) {
      set.status = 400;
      return { code: "VALIDATION_ERROR", message: "Erro ao ler arquivo. Verifique o formato e tente novamente." };
    }

    if (rows.length < 2) {
      set.status = 400;
      return { code: "VALIDATION_ERROR", message: "Arquivo vazio ou sem dados (apenas cabeçalho)" };
    }

    const colIndex = mapColumns(rows[0]);
    const result: ImportResult = { total: rows.length - 1, created: 0, errors: [] };

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      const name = getCell(row, colIndex, "nome");
      if (!name) {
        result.errors.push({ row: rowNum, message: "Nome é obrigatório" });
        continue;
      }

      const priceStr = getCell(row, colIndex, "preco").replace(",", ".");
      if (!priceStr) {
        result.errors.push({ row: rowNum, message: "Preço é obrigatório" });
        continue;
      }
      const price = parseFloat(priceStr);
      if (isNaN(price) || price < 0) {
        result.errors.push({ row: rowNum, message: "Preço inválido" });
        continue;
      }

      const stockStr = getCell(row, colIndex, "estoque");
      if (!stockStr) {
        result.errors.push({ row: rowNum, message: "Estoque é obrigatório" });
        continue;
      }
      const stock = parseInt(stockStr, 10);
      if (isNaN(stock) || stock < 0) {
        result.errors.push({ row: rowNum, message: "Estoque inválido" });
        continue;
      }

      const product: Record<string, unknown> = {
        store_id: storeId,
        name,
        slug: slugify(name),
        price,
        stock,
        is_active: true,
        is_featured: false,
      };

      const desc = getCell(row, colIndex, "descricao");
      if (desc) product.description = desc;

      const cap = getCell(row, colIndex, "preco_comparacao").replace(",", ".");
      if (cap) {
        const v = parseFloat(cap);
        if (!isNaN(v) && v >= 0) product.compare_at_price = v;
      }

      const cp = getCell(row, colIndex, "preco_custo").replace(",", ".");
      if (cp) {
        const v = parseFloat(cp);
        if (!isNaN(v) && v >= 0) product.cost_price = v;
      }

      const sku = getCell(row, colIndex, "sku");
      if (sku) product.sku = sku;

      // Category lookup
      const catName = getCell(row, colIndex, "categoria");
      if (catName) {
        const cat = await catRepo.findCategoryByName(storeId, catName);
        if (cat) product.category_id = cat.id;
      }

      // Brand lookup
      const brandName = getCell(row, colIndex, "marca");
      if (brandName) {
        const brand = await brandRepo.findBrandByName(storeId, brandName);
        if (brand) product.brand_id = brand.id;
      }

      // Active
      const ativo = getCell(row, colIndex, "ativo").toLowerCase();
      if (["nao", "não", "false", "0"].includes(ativo)) {
        product.is_active = false;
      }

      // Featured
      const destaque = getCell(row, colIndex, "destaque").toLowerCase();
      if (["sim", "true", "1"].includes(destaque)) {
        product.is_featured = true;
      }

      try {
        const prodId = await productRepo.createProduct(product);

        // Add image if provided
        const imgUrl = getCell(row, colIndex, "imagem_url");
        if (imgUrl) {
          await productRepo.replaceImages(prodId, [{ url: imgUrl, alt_text: null, sort_order: 0 }]);
        }

        result.created++;
      } catch (err: unknown) {
        logger.error(err, `Failed to import product at row ${rowNum}`);
        result.errors.push({ row: rowNum, message: "Erro ao salvar produto" });
      }
    }

    return result;
  })
;
