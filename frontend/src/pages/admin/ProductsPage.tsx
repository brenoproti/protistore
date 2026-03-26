import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, ChevronLeft, ChevronRight, Upload, Download, ChevronDown } from 'lucide-react';
import { adminProductApi } from '@/lib/api';
import { ImportProductsModal } from './ImportProductsModal';

export function ProductsAdminPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const perPage = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'products', { page, search, per_page: perPage }],
    queryFn: () => adminProductApi.list({ page, per_page: perPage, search: search || undefined }),
  });

  const products = data?.data ?? [];
  const totalPages = data?.total_pages ?? 1;

  const handleExport = (format: 'csv' | 'xlsx') => {
    setShowExportMenu(false);
    adminProductApi.exportProducts(format);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="btn btn-outline gap-2">
            <Upload size={16} /> Importar
          </button>
          <div className="relative" ref={exportRef}>
            <button onClick={() => setShowExportMenu(v => !v)} className="btn btn-outline gap-2">
              <Download size={16} /> Exportar <ChevronDown size={14} />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full z-10 mt-1 w-36 rounded-lg border bg-background py-1 shadow-lg">
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  CSV (.csv)
                </button>
                <button
                  onClick={() => handleExport('xlsx')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  Excel (.xlsx)
                </button>
              </div>
            )}
          </div>
          <Link to="/admin/products/new" className="btn btn-primary gap-2">
            <Plus size={16} /> Adicionar Produto
          </Link>
        </div>
      </div>

      {showImport && (
        <ImportProductsModal
          onClose={() => setShowImport(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })}
        />
      )}

      <form onSubmit={e => { e.preventDefault(); setSearch(searchInput); setPage(1); }} className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="input pl-9"
          />
        </div>
        <button type="submit" className="btn btn-primary shrink-0">Buscar</button>
      </form>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-16" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-lg border p-12 text-center text-muted-foreground">
          {search ? 'Nenhum produto corresponde à busca.' : 'Nenhum produto ainda. Crie seu primeiro produto.'}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Imagem</th>
                  <th className="px-4 py-3 text-left font-medium">Nome</th>
                  <th className="px-4 py-3 text-left font-medium">Preço</th>
                  <th className="px-4 py-3 text-left font-medium">Estoque</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map(product => (
                  <tr key={product.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      {product.images?.[0]?.url ? (
                        <img src={product.images[0].url} alt="" className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-xs">N/A</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">{product.sku || product.slug}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">${product.price.toFixed(2)}</span>
                      {product.compare_at_price && (
                        <span className="ml-1 text-xs text-muted-foreground line-through">
                          ${product.compare_at_price.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={product.stock <= 5 ? 'text-warning font-medium' : product.stock === 0 ? 'text-destructive font-medium' : ''}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <span className={`badge ${product.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                          {product.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                        {product.is_featured && (
                          <span className="badge bg-accent/10 text-accent">Destaque</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/products/${product.id}/edit`} className="btn btn-outline btn-sm">
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn btn-outline btn-sm btn-icon"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="btn btn-outline btn-sm btn-icon"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
