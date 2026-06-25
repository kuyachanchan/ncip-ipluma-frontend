import api from '@/api/axiosInstance';
import { useAuth } from '@/auth/useAuth';
import type { BookmarkItem, Signer } from '@/types/types';
import * as Dialog from '@radix-ui/react-dialog';
import { Bookmark, Search, UserPlus, Users, X, Check, Pen, Type } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface AddSignerInBookmarkProps {
  bookmark: BookmarkItem | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (updatedBookmark: BookmarkItem) => void;
}

// Extended Signer type with signature preference
interface SignerWithPreference extends Signer {
  signaturePreference: 'full' | 'initial';
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-purple-100 text-purple-700',
  'bg-rose-100 text-rose-700',
];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(id: string) {
  const index = parseInt(id, 10) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index] ?? AVATAR_COLORS[0];
}

const AddSignerInBookmarkDialog: React.FC<AddSignerInBookmarkProps> = ({
  bookmark,
  open,
  onOpenChange,
  onSaved,
}) => {
  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<Signer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const [selectedSigners, setSelectedSigners] = useState<SignerWithPreference[]>([]);
  const [titleError, setTitleError] = useState(false);
  const [toPage, setToPage] = useState('');
  const [toPageError, setToPageError] = useState(false);
  const [signerToEdit, setSignerToEdit] = useState<SignerWithPreference | null>(null);

  useEffect(() => {
    if (bookmark) {
      setBookmarkTitle(bookmark.title || '');
      const signersWithPreference = (bookmark.assignedSignersToBookmark || []).map(signer => ({
        ...signer,
        signaturePreference: (signer as any).signaturePreference || 'full'
      }));
      setSelectedSigners(signersWithPreference);
      setToPage(bookmark.toPage?.toString() || '');
      setToPageError(false);
    } else {
      setBookmarkTitle('');
      setSelectedSigners([]);
      setToPage('');
      setToPageError(false);
    }
  }, [bookmark]);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Search
  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    api
      .get('v1/users/users-list', {
        params: { query: debouncedQuery.trim(), currentUserId: currentUser?.id },
      })
      .then((res) => {
        if (cancelled) return;

        let users: Signer[] = [];
        if (Array.isArray(res.data)) users = res.data;
        else if (Array.isArray(res.data?.data)) users = res.data.data;
        else if (Array.isArray(res.data?.users)) users = res.data.users;

        setResults(
          users
            .filter(u => u.id?.toString() !== currentUser?.id)
            .map((u) => ({
              id: u.id?.toString() ?? '',
              username: u.username ?? '',
              email: u.email ?? ''
            })),
        );
      })
      .catch(() => toast.error('Failed to search users'))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, currentUser?.id]);

  const alreadySelectedIds = new Set(selectedSigners.map((s) => s.id));

  const available = results.filter(
    (u) => u.id !== currentUser?.id && !alreadySelectedIds.has(u.id),
  );

  const addSigner = (signer: Signer) => {
    if (signer.id === currentUser?.id) {
      toast.error("Cannot add yourself as a signer");
      return;
    }
    setSignerToEdit({
      ...signer,
      signaturePreference: 'full',
    });
    setQuery('');
    setResults([]);
  };

  const confirmAddSigner = (signer: SignerWithPreference) => {
    setSelectedSigners((prev) => [...prev, signer]);
    setSignerToEdit(null);
    toast.success(`${signer.username} added as signer`);
  };

  const removeSigner = (id: string) => {
    setSelectedSigners((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSignerPreference = (id: string, preference: 'full' | 'initial') => {
    setSelectedSigners((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, signaturePreference: preference } : s
      )
    );
  };

  const handleClose = () => {
    onOpenChange(false);
    setQuery('');
    setResults([]);
    setSignerToEdit(null);
    if (!bookmark) {
      setSelectedSigners([]);
    }
    setTitleError(false);
    setToPageError(false);
  };

  const handleSave = () => {
    if (!bookmarkTitle.trim()) {
      setTitleError(true);
      return;
    }
    setTitleError(false);

    const toPageNum = parseInt(toPage);
    const fromPageNum = bookmark?.fromPage || 0;

    if (isNaN(toPageNum) || toPageNum < fromPageNum) {
      setToPageError(true);
      toast.error(`To page must be greater than or equal to ${fromPageNum}`);
      return;
    }
    setToPageError(false);

    if (!bookmark) {
      toast.error("No bookmark selected");
      return;
    }

    const updatedBookmark: BookmarkItem = {
      ...bookmark,
      title: bookmarkTitle,
      toPage: toPageNum,
      assignedSignersToBookmark: selectedSigners.map(signer => ({
        id: signer.id,
        username: signer.username,
        email: signer.email,
        signaturePreference: signer.signaturePreference
      }))
    };

    onSaved(updatedBookmark);
    handleClose();
  };

  return (
    <>
      {/* ── Main bookmark dialog ── */}
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col z-50 max-h-[90vh] overflow-hidden border border-gray-200">

            {/* ── Header ── */}
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <Bookmark className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <Dialog.Title className="text-base font-semibold text-gray-900 leading-tight">
                    Save bookmark
                  </Dialog.Title>
                  <p className="text-xs text-gray-400 mt-0.5">Add a title and optional signers</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Bookmark title
                </label>
                <input
                  type="text"
                  value={bookmarkTitle}
                  onChange={(e) => {
                    setBookmarkTitle(e.target.value);
                    if (e.target.value.trim()) setTitleError(false);
                  }}
                  placeholder="e.g. Executive summary, Key clauses…"
                  className={`w-full px-3 py-2 text-sm rounded-lg border bg-white outline-none transition-colors
                    ${titleError
                      ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                      : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-50'
                    }`}
                />
                {titleError && (
                  <p className="text-xs text-red-500">Please enter a title before saving.</p>
                )}
              </div>

              {/* Page range */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Page range
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">From</span>
                    <input
                      type="text"
                      value={bookmark?.fromPage ?? ''}
                      disabled
                      className="w-20 px-3 py-2 text-sm text-center rounded-lg border border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
                    />
                  </div>
                  <span className="mt-5 text-gray-300 text-sm">—</span>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">To</span>
                    <input
                      type="number"
                      value={toPage}
                      onChange={(e) => {
                        setToPage(e.target.value);
                        if (toPageError) setToPageError(false);
                      }}
                      placeholder="Page number"
                      className={`w-20 px-3 py-2 text-sm text-center rounded-lg border bg-white outline-none focus:ring-2 transition-colors
                        ${toPageError
                          ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                          : 'border-gray-200 focus:border-blue-400 focus:ring-blue-50'
                        }`}
                      min={bookmark?.fromPage || 1}
                    />
                    {toPageError && (
                      <p className="text-xs text-red-500">Must be ≥ {bookmark?.fromPage || 0}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Signers */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Signers
                  </label>
                  {selectedSigners.length > 0 && (
                    <span className="text-xs text-gray-400">
                      {selectedSigners.length} added
                    </span>
                  )}
                </div>

                {/* Selected signer pills with preference */}
                {selectedSigners.length > 0 && (
                  <div className="space-y-2">
                    {selectedSigners.map((signer) => (
                      <div
                        key={signer.id}
                        className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100"
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${getAvatarColor(signer.id)}`}
                        >
                          {getInitials(signer.username)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {signer.username}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {signer.email}
                          </p>
                        </div>

                        {/* Preference toggle buttons */}
                        <div className="flex items-center gap-1.5 mr-1">
                          <button
                            onClick={() => updateSignerPreference(signer.id, 'full')}
                            className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                              signer.signaturePreference === 'full'
                                ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                                : 'bg-gray-200/50 text-gray-400 hover:bg-gray-200'
                            }`}
                            title="Full signature"
                          >
                            Full
                          </button>
                          <button
                            onClick={() => updateSignerPreference(signer.id, 'initial')}
                            className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                              signer.signaturePreference === 'initial'
                                ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300'
                                : 'bg-gray-200/50 text-gray-400 hover:bg-gray-200'
                            }`}
                            title="Initial signature"
                          >
                            Initial
                          </button>
                        </div>

                        <button
                          onClick={() => removeSigner(signer.id)}
                          className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0"
                          aria-label={`Remove ${signer.username}`}
                        >
                          <X className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Search input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name, username, or email…"
                    className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 bg-white rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-colors"
                  />
                  {query && (
                    <button
                      onClick={() => { setQuery(''); setResults([]); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Search results */}
                {(isLoading || available.length > 0 || (query.trim().length >= 2 && !isLoading)) && (
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    {isLoading ? (
                      <div className="p-4 text-center">
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-1.5" />
                        <p className="text-xs text-gray-400">Searching…</p>
                      </div>
                    ) : available.length > 0 ? (
                      <div className="divide-y divide-gray-50 max-h-44 overflow-y-auto">
                        {available.map((u) => (
                          <div
                            key={u.id}
                            className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors"
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${getAvatarColor(u.id)}`}
                            >
                              {getInitials(u.username)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{u.username}</p>
                              <p className="text-xs text-gray-400 truncate">{u.email}</p>
                            </div>
                            <button
                              onClick={() => addSigner(u)}
                              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Add
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-5 text-center text-gray-400">
                        <Search className="w-5 h-5 mx-auto mb-1.5 opacity-40" />
                        <p className="text-xs">No users found for "{query}"</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Idle hint */}
                {query.trim().length < 2 && selectedSigners.length === 0 && (
                  <div className="flex items-center justify-center gap-2 py-3 text-gray-300">
                    <Users className="w-4 h-4" />
                    <span className="text-xs">Type 2+ characters to find signers</span>
                  </div>
                )}
              </div>

            </div>

            {/* ── Footer ── */}
            <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-end gap-2">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!bookmarkTitle.trim() || !toPage}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg ${
                  !bookmarkTitle.trim() || !toPage
                    ? 'cursor-not-allowed bg-gray-800'
                    : 'bg-gray-900 hover:bg-gray-800 transition-colors'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                Save bookmark
              </button>
            </div>

          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Signature preference dialog ──
          Rendered as a SEPARATE Radix Dialog.Root so it gets its own Portal
          and properly escapes the parent dialog's focus trap.          */}
      <Dialog.Root
        open={!!signerToEdit}
        onOpenChange={(o) => { if (!o) setSignerToEdit(null); }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[200]" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-200 z-[200] outline-none">

            <Dialog.Title className="text-base font-semibold text-gray-900 mb-1">
              Signature preference
            </Dialog.Title>
            <Dialog.Description className="text-sm text-gray-500 mb-4">
              How should{' '}
              <span className="font-medium text-gray-700">{signerToEdit?.username}</span>{' '}
              sign?
            </Dialog.Description>

            <div className="space-y-3">
              {/* Full signature option */}
              <button
                onClick={() =>
                  signerToEdit &&
                  confirmAddSigner({ ...signerToEdit, signaturePreference: 'full' })
                }
                className="w-full flex items-center gap-3 p-3 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Pen className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900">Full signature</p>
                  <p className="text-xs text-gray-400">Sign with full name</p>
                </div>
                <Check className="w-4 h-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              {/* Initial signature option */}
              <button
                onClick={() =>
                  signerToEdit &&
                  confirmAddSigner({ ...signerToEdit, signaturePreference: 'initial' })
                }
                className="w-full flex items-center gap-3 p-3 border-2 border-gray-200 rounded-xl hover:border-purple-400 hover:bg-purple-50/50 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                  <Type className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900">Initial signature</p>
                  <p className="text-xs text-gray-400">Sign with initials only</p>
                </div>
                <Check className="w-4 h-4 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>

            <button
              onClick={() => setSignerToEdit(null)}
              className="mt-4 w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>

          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
};

export default AddSignerInBookmarkDialog;