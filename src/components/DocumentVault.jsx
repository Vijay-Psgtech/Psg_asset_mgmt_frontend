import { useCallback, useRef, useState } from 'react';
import api from '../api/client.js';

const CATEGORIES = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'manual', label: 'Manual' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_COLOR = {
  invoice: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  warranty: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  manual: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  insurance: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  other: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
};

function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function fileIcon(mimeType) {
  if (mimeType?.includes('pdf')) return '📄';
  if (mimeType?.includes('image')) return '🖼️';
  if (mimeType?.includes('sheet') || mimeType?.includes('excel')) return '📊';
  if (mimeType?.includes('word') || mimeType?.includes('document')) return '📝';
  return '📎';
}

export default function DocumentVault({ assetId, documents, onChange }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState('other');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const openPicker = () => inputRef.current?.click();

  const stageFile = (file) => {
    if (!file) return;
    setPendingFile(file);
    setLabel(file.name);
    setError('');
  };
   
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    stageFile(e.dataTransfer.files?.[0]);
  }, []);

  const handleUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', pendingFile);
      formData.append('label', label || pendingFile.name);
      formData.append('category', category);

      const { data } = await api.post(`/assets/${assetId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onChange?.([...(documents || []), data.document]);
      setPendingFile(null);
      setLabel('');
      setCategory('other');
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed - try again');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    try {
      await api.delete(`/assets/${assetId}/documents/${docId}`);
      onChange?.((documents || []).filter((d) => d._id !== docId));
    } catch {
      setError('Could not delete the document - try again');
    }
  };

  const handleDownload = async (docId, originalName) => {
    try {
      const response = await api.get(`/assets/${assetId}/documents/${docId}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = originalName || 'document';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Could not download the document - try again');
    }
  };

  return (
    <div className="border border-line bg-panel rounded-md">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <h3 className="stencil text-sm text-ink tracking-wide">DOCUMENT VAULT</h3>
        <span className="text-xs text-muted">{documents?.length || 0} file{documents?.length === 1 ? '' : 's'}</span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={openPicker}
        className={`m-4 rounded-md border-2 border-dashed cursor-pointer transition-colors px-4 py-6 text-center ${
          isDragging ? 'border-accent bg-accent/5' : 'border-line hover:border-accent/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => stageFile(e.target.files?.[0])}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
        />
        <p className="text-sm text-muted">Drag a file here, or click to browse</p>
        <p className="text-xs text-muted/60 mt-1">PDF, Word, Excel, or image — up to 10MB</p>
      </div>

      {/* Staged file / metadata form */}
      {pendingFile && (
        <div className="mx-4 mb-4 p-3 rounded-md bg-ink border border-line space-y-3">
          <div className="flex items-center gap-2 text-sm text-ink">
            <span>{fileIcon(pendingFile.type)}</span>
            <span className="truncate">{pendingFile.name}</span>
            <span className="text-xs text-muted ml-auto">{formatBytes(pendingFile.size)}</span>
          </div>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Document label"
            className="w-full bg-panel border border-line rounded px-3 py-2 text-sm text-ink"
          />
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((c) => (   
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  category === c.value ? CATEGORY_COLOR[c.value] : 'border-line text-muted hover:text-ink'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 bg-accent text-ink text-sm py-2 rounded disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            <button
              onClick={() => { setPendingFile(null); if (inputRef.current) inputRef.current.value = ''; }}
              className="px-4 text-sm text-muted border border-line rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="mx-4 mb-3 text-xs text-red-400">{error}</p>}

      {/* Document list */}
      <ul className="divide-y divide-line">
        {(documents || []).length === 0 && !pendingFile && (
          <li className="px-4 py-6 text-center text-sm text-muted">No documents uploaded yet</li>
        )}
        {(documents || []).map((doc) => (
          <li key={doc._id} className="flex items-center gap-3 px-4 py-3">
            <span className="text-lg">{fileIcon(doc.mimeType)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink truncate">{doc.label}</p>
              <p className="text-xs text-muted">
                {formatBytes(doc.size)} · {new Date(doc.uploadedAt).toLocaleDateString()}
              </p>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${CATEGORY_COLOR[doc.category] || CATEGORY_COLOR.other}`}>
              {doc.category}
            </span>
            <button
              onClick={() => handleDownload(doc._id, doc.originalName)}
              className="text-xs text-accent hover:underline"
            >
              Download
            </button>
            <button
              onClick={() => handleDelete(doc._id)}
              className="text-xs text-red-400 hover:underline"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}