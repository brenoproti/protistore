import { useState, useRef } from 'react';
import { Upload, X, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { adminProductApi } from '@/lib/api';
import type { ImportResult } from '@/lib/api';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportProductsModal({ onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const ext = selected.name.split('.').pop()?.toLowerCase();
      if (ext !== 'csv' && ext !== 'xlsx') {
        setError('Formato não suportado. Use .csv ou .xlsx');
        setFile(null);
        return;
      }
      setError('');
      setFile(selected);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const res = await adminProductApi.importProducts(file);
      setResult(res);
      if (res.created > 0) {
        onSuccess();
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Erro ao importar arquivo';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="relative mx-4 w-full max-w-lg rounded-lg bg-background p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>

        <h2 className="mb-4 text-lg font-semibold">Importar Produtos</h2>

        {!result ? (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Envie um arquivo <strong>.csv</strong> ou <strong>.xlsx</strong> com as colunas:
              nome, descricao, preco, estoque (obrigatórias), categoria, marca, sku, ativo, destaque, imagem_url (opcionais).
            </p>

            <div
              className="mb-4 flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/30"
              onClick={() => inputRef.current?.click()}
            >
              {file ? (
                <>
                  <FileSpreadsheet size={32} className="text-primary" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </>
              ) : (
                <>
                  <Upload size={32} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Clique para selecionar ou arraste o arquivo
                  </span>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="btn btn-outline">
                Cancelar
              </button>
              <button onClick={handleUpload} disabled={!file || loading} className="btn btn-primary">
                {loading ? 'Importando...' : 'Importar'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-3 rounded-lg bg-success/10 px-4 py-3">
              <CheckCircle2 size={20} className="text-success" />
              <div>
                <div className="font-medium">Importação concluída</div>
                <div className="text-sm text-muted-foreground">
                  {result.created} de {result.total} produtos criados
                </div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-medium text-destructive">
                  {result.errors.length} erro(s):
                </h3>
                <div className="max-h-48 overflow-y-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-medium">Linha</th>
                        <th className="px-3 py-1.5 text-left font-medium">Erro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {result.errors.map((err, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 text-muted-foreground">{err.row}</td>
                          <td className="px-3 py-1.5">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button onClick={onClose} className="btn btn-primary">
                Fechar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
