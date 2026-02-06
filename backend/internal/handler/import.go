package handler

import (
	"encoding/csv"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"unicode"

	"github.com/vibestore/backend/internal/middleware"
	"github.com/vibestore/backend/internal/model"
	"github.com/vibestore/backend/internal/repository"
	"github.com/xuri/excelize/v2"
)

type ImportHandler struct {
	productRepo  *repository.ProductRepository
	categoryRepo *repository.CategoryRepository
	brandRepo    *repository.BrandRepository
}

func NewImportHandler(
	productRepo *repository.ProductRepository,
	categoryRepo *repository.CategoryRepository,
	brandRepo *repository.BrandRepository,
) *ImportHandler {
	return &ImportHandler{
		productRepo:  productRepo,
		categoryRepo: categoryRepo,
		brandRepo:    brandRepo,
	}
}

type importResult struct {
	Total   int           `json:"total"`
	Created int           `json:"created"`
	Errors  []importError `json:"errors"`
}

type importError struct {
	Row     int    `json:"row"`
	Message string `json:"message"`
}

var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(s string) string {
	s = strings.ToLower(s)
	s = strings.Map(func(r rune) rune {
		switch r {
		case 'á', 'à', 'ã', 'â', 'ä':
			return 'a'
		case 'é', 'è', 'ê', 'ë':
			return 'e'
		case 'í', 'ì', 'î', 'ï':
			return 'i'
		case 'ó', 'ò', 'õ', 'ô', 'ö':
			return 'o'
		case 'ú', 'ù', 'û', 'ü':
			return 'u'
		case 'ç':
			return 'c'
		case 'ñ':
			return 'n'
		}
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == ' ' || r == '-' {
			return r
		}
		return ' '
	}, s)
	s = slugRe.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	return s
}

// POST /api/v1/admin/products/import
func (h *ImportHandler) Import(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())

	if err := r.ParseMultipartForm(10 << 20); err != nil { // 10MB max
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Arquivo inválido ou muito grande (máx. 10MB)")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Nenhum arquivo enviado")
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))

	var rows [][]string
	switch ext {
	case ".csv":
		rows, err = parseCSV(file)
	case ".xlsx":
		rows, err = parseXLSX(file)
	default:
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Formato não suportado. Use .csv ou .xlsx")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", fmt.Sprintf("Erro ao ler arquivo: %s", err.Error()))
		return
	}

	if len(rows) < 2 {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Arquivo vazio ou sem dados (apenas cabeçalho)")
		return
	}

	// Map header columns
	headerRow := rows[0]
	colIndex := mapColumns(headerRow)

	result := importResult{
		Total:  len(rows) - 1,
		Errors: []importError{},
	}

	for i := 1; i < len(rows); i++ {
		row := rows[i]
		rowNum := i + 1

		product, imgURL, rowErr := h.parseRow(r, storeID, colIndex, row, rowNum)
		if rowErr != "" {
			result.Errors = append(result.Errors, importError{Row: rowNum, Message: rowErr})
			continue
		}

		if err := h.productRepo.Create(r.Context(), product); err != nil {
			result.Errors = append(result.Errors, importError{Row: rowNum, Message: fmt.Sprintf("Erro ao salvar: %s", err.Error())})
			continue
		}

		// Add image if provided
		if imgURL != "" {
			images := []model.ProductImage{
				{ProductID: product.ID, URL: imgURL, SortOrder: 0},
			}
			h.productRepo.ReplaceImages(r.Context(), product.ID, images)
		}

		result.Created++
	}

	writeJSON(w, http.StatusOK, result)
}

func (h *ImportHandler) parseRow(r *http.Request, storeID uint64, colIndex map[string]int, row []string, rowNum int) (*model.Product, string, string) {
	get := func(col string) string {
		idx, ok := colIndex[col]
		if !ok || idx >= len(row) {
			return ""
		}
		return strings.TrimSpace(row[idx])
	}

	name := get("nome")
	if name == "" {
		return nil, "", "Nome é obrigatório"
	}

	priceStr := get("preco")
	if priceStr == "" {
		return nil, "", "Preço é obrigatório"
	}
	priceStr = strings.ReplaceAll(priceStr, ",", ".")
	price, err := strconv.ParseFloat(priceStr, 64)
	if err != nil || price < 0 {
		return nil, "", "Preço inválido"
	}

	stockStr := get("estoque")
	if stockStr == "" {
		return nil, "", "Estoque é obrigatório"
	}
	stock, err := strconv.Atoi(stockStr)
	if err != nil || stock < 0 {
		return nil, "", "Estoque inválido"
	}

	product := &model.Product{
		StoreID:  storeID,
		Name:     name,
		Slug:     slugify(name),
		Price:    price,
		Stock:    stock,
		IsActive: true,
	}

	// Description
	if desc := get("descricao"); desc != "" {
		product.Description = &desc
	}

	// Compare at price
	if cap := get("preco_comparacao"); cap != "" {
		cap = strings.ReplaceAll(cap, ",", ".")
		v, err := strconv.ParseFloat(cap, 64)
		if err == nil && v >= 0 {
			product.CompareAtPrice = &v
		}
	}

	// Cost price
	if cp := get("preco_custo"); cp != "" {
		cp = strings.ReplaceAll(cp, ",", ".")
		v, err := strconv.ParseFloat(cp, 64)
		if err == nil && v >= 0 {
			product.CostPrice = &v
		}
	}

	// SKU
	if sku := get("sku"); sku != "" {
		product.SKU = &sku
	}

	// Category lookup
	if catName := get("categoria"); catName != "" {
		cat, err := h.categoryRepo.FindByName(r.Context(), storeID, catName)
		if err == nil && cat != nil {
			product.CategoryID = &cat.ID
		}
	}

	// Brand lookup
	if brandName := get("marca"); brandName != "" {
		brand, err := h.brandRepo.FindByName(r.Context(), storeID, brandName)
		if err == nil && brand != nil {
			product.BrandID = &brand.ID
		}
	}

	// Active
	if ativo := strings.ToLower(get("ativo")); ativo == "nao" || ativo == "não" || ativo == "false" || ativo == "0" {
		product.IsActive = false
	}

	// Featured
	if destaque := strings.ToLower(get("destaque")); destaque == "sim" || destaque == "true" || destaque == "1" {
		product.IsFeatured = true
	}

	imgURL := get("imagem_url")

	return product, imgURL, ""
}

// GET /api/v1/admin/products/export
func (h *ImportHandler) Export(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())
	format := r.URL.Query().Get("format")
	if format == "" {
		format = "csv"
	}

	products, err := h.productRepo.FindAllByStoreID(r.Context(), storeID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Falha ao buscar produtos")
		return
	}

	// Load categories and brands for name resolution
	categories, _ := h.categoryRepo.FindByStoreID(r.Context(), storeID)
	brands, _ := h.brandRepo.FindByStoreID(r.Context(), storeID)

	catMap := make(map[uint64]string)
	for _, c := range categories {
		catMap[c.ID] = c.Name
	}
	brandMap := make(map[uint64]string)
	for _, b := range brands {
		brandMap[b.ID] = b.Name
	}

	headers := []string{"nome", "descricao", "preco", "preco_comparacao", "preco_custo", "sku", "estoque", "categoria", "marca", "ativo", "destaque", "imagem_url"}

	var rows [][]string
	for _, p := range products {
		// Load images
		images, _ := h.productRepo.FindImagesByProductID(r.Context(), p.ID)

		row := []string{
			p.Name,
			ptrStr(p.Description),
			fmt.Sprintf("%.2f", p.Price),
			ptrFloat(p.CompareAtPrice),
			ptrFloat(p.CostPrice),
			ptrStr(p.SKU),
			strconv.Itoa(p.Stock),
			catName(catMap, p.CategoryID),
			brandName(brandMap, p.BrandID),
			boolPt(p.IsActive),
			boolPt(p.IsFeatured),
			firstImageURL(images),
		}
		rows = append(rows, row)
	}

	switch format {
	case "xlsx":
		h.exportXLSX(w, headers, rows)
	default:
		h.exportCSV(w, headers, rows)
	}
}

func (h *ImportHandler) exportCSV(w http.ResponseWriter, headers []string, rows [][]string) {
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", "attachment; filename=produtos.csv")
	// UTF-8 BOM for Excel compatibility
	w.Write([]byte{0xEF, 0xBB, 0xBF})

	writer := csv.NewWriter(w)
	writer.Write(headers)
	for _, row := range rows {
		writer.Write(row)
	}
	writer.Flush()
}

func (h *ImportHandler) exportXLSX(w http.ResponseWriter, headers []string, rows [][]string) {
	f := excelize.NewFile()
	sheet := "Produtos"
	f.SetSheetName("Sheet1", sheet)

	// Write header
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
	}

	// Write data
	for rowIdx, row := range rows {
		for colIdx, val := range row {
			cell, _ := excelize.CoordinatesToCellName(colIdx+1, rowIdx+2)
			f.SetCellValue(sheet, cell, val)
		}
	}

	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", "attachment; filename=produtos.xlsx")
	f.Write(w)
}

// --- Helpers ---

func parseCSV(r io.Reader) ([][]string, error) {
	reader := csv.NewReader(r)
	reader.LazyQuotes = true
	reader.TrimLeadingSpace = true
	// Try semicolon separator first (common in BR locale)
	all, err := reader.ReadAll()
	if err != nil {
		return nil, err
	}
	// If the first row has only 1 column, retry with semicolon
	if len(all) > 0 && len(all[0]) == 1 && strings.Contains(all[0][0], ";") {
		reader2 := csv.NewReader(strings.NewReader(joinRows(all)))
		reader2.Comma = ';'
		reader2.LazyQuotes = true
		reader2.TrimLeadingSpace = true
		return reader2.ReadAll()
	}
	return all, nil
}

func joinRows(rows [][]string) string {
	var lines []string
	for _, row := range rows {
		lines = append(lines, strings.Join(row, ","))
	}
	return strings.Join(lines, "\n")
}

func parseXLSX(r io.Reader) ([][]string, error) {
	f, err := excelize.OpenReader(r)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	sheet := f.GetSheetName(0)
	return f.GetRows(sheet)
}

func mapColumns(header []string) map[string]int {
	m := make(map[string]int)
	for i, col := range header {
		col = strings.ToLower(strings.TrimSpace(col))
		// Normalize common variants
		switch col {
		case "nome", "name":
			m["nome"] = i
		case "descricao", "descrição", "description":
			m["descricao"] = i
		case "preco", "preço", "price":
			m["preco"] = i
		case "preco_comparacao", "preço_comparação", "compare_price", "preco comparacao":
			m["preco_comparacao"] = i
		case "preco_custo", "preço_custo", "cost_price", "preco custo":
			m["preco_custo"] = i
		case "sku":
			m["sku"] = i
		case "estoque", "stock":
			m["estoque"] = i
		case "categoria", "category":
			m["categoria"] = i
		case "marca", "brand":
			m["marca"] = i
		case "ativo", "active":
			m["ativo"] = i
		case "destaque", "featured":
			m["destaque"] = i
		case "imagem_url", "image_url", "imagem":
			m["imagem_url"] = i
		}
	}
	return m
}

func ptrStr(s *string) string {
	if s != nil {
		return *s
	}
	return ""
}

func ptrFloat(f *float64) string {
	if f != nil {
		return fmt.Sprintf("%.2f", *f)
	}
	return ""
}

func catName(m map[uint64]string, id *uint64) string {
	if id != nil {
		if name, ok := m[*id]; ok {
			return name
		}
	}
	return ""
}

func brandName(m map[uint64]string, id *uint64) string {
	if id != nil {
		if name, ok := m[*id]; ok {
			return name
		}
	}
	return ""
}

func boolPt(b bool) string {
	if b {
		return "sim"
	}
	return "nao"
}

func firstImageURL(images []model.ProductImage) string {
	if len(images) > 0 {
		return images[0].URL
	}
	return ""
}
