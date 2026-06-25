// ============================================================
// FILE: UpdateFlowDialog.tsx
// ============================================================

import React, { useState, useCallback, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  X,
  GripVertical,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  Lock,
  Unlock,
  Users,
  RefreshCw,
  Save,
  AlertTriangle,
  UserCheck,
  UserX,
  Search,
  UserPlus,
  Trash2,
  Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/api/axiosInstance';
import { useAuth } from '@/auth/useAuth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserType {
  id: string;
  username: string;
  email: string;
  roles?: string[] | Array<{ id: number; name: string }>;
}

interface SignerStep {
  step: number;
  userId: string;
  user?: UserType;
  hasSigned?: boolean;
  signedAt?: string;
  parallel?: boolean;
  permission?: string;
  isNew?: boolean; // flag for newly-added signers not yet saved
  downloadable?: boolean; // per-signer download permission
}

interface PDFDocument {
  id: string;
  fileName: string;
  signerSteps?: SignerStep[];
  downloadable?: boolean;
  [key: string]: unknown;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renumber(steps: SignerStep[]): SignerStep[] {
  const out = steps.map(s => ({ ...s }));
  let currentStep = 1;
  let i = 0;

  while (i < out.length) {
    if (out[i].parallel) {
      const block: number[] = [i];
      let j = i + 1;
      while (j < out.length && out[j].parallel) {
        block.push(j);
        j++;
      }
      block.forEach(idx => { out[idx].step = currentStep; });
      i = j;
    } else {
      out[i].step = currentStep;
      i++;
    }
    currentStep++;
  }

  return out;
}

// ─── Row component ────────────────────────────────────────────────────────────

interface RowProps {
  step: SignerStep;
  index: number;
  total: number;
  onMoveUp: (i: number) => void;
  onMoveDown: (i: number) => void;
  onToggleParallel: (userId: string) => void;
  onToggleDownload: (userId: string) => void;
  onRemove: (userId: string) => void;
  parallelGroupSize: number;
}

const FlowRow: React.FC<RowProps> = ({
  step,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onToggleParallel,
  onToggleDownload,
  onRemove,
  parallelGroupSize,
}) => {
  const signed = !!step.hasSigned;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.userId, disabled: signed });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
        ${isDragging ? 'shadow-xl border-cyan-400 bg-cyan-50' : ''}
        ${signed
          ? 'bg-green-50 border-green-200'
          : step.isNew
          ? 'bg-amber-50 border-amber-300'
          : step.parallel
          ? 'bg-blue-50 border-blue-300'
          : 'bg-white border-gray-200 hover:border-cyan-300'}
      `}
    >
      {/* Drag handle / lock */}
      <div
        className={`shrink-0 ${signed ? 'text-green-400 cursor-default' : 'text-gray-400 hover:text-cyan-600 cursor-grab active:cursor-grabbing'}`}
        {...(!signed ? { ...attributes, ...listeners } : {})}
        title={signed ? 'Already signed – position locked' : 'Drag to reorder'}
      >
        {signed ? <Lock className="w-4 h-4" /> : <GripVertical className="w-5 h-5" />}
      </div>

      {/* Step badge */}
      <div
        className={`
          flex items-center justify-center w-8 h-8 rounded-full shrink-0 font-bold text-sm
          ${signed
            ? 'bg-green-100 text-green-700 border-2 border-green-300'
            : step.isNew
            ? 'bg-amber-100 text-amber-700 border-2 border-amber-300'
            : step.parallel
            ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
            : 'bg-cyan-100 text-cyan-700 border-2 border-cyan-300'}
        `}
      >
        {signed ? <CheckCircle className="w-4 h-4 text-green-600" /> : step.step}
      </div>

      {/* Name / email */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm font-semibold truncate ${signed ? 'text-green-800' : 'text-gray-900'}`}>
            {step.user?.username ?? 'Unknown'}
          </p>
          {signed && (
            <span className="text-xs text-green-600 font-medium flex items-center gap-0.5">
              <CheckCircle className="w-3 h-3" /> Signed
            </span>
          )}
          {step.isNew && !signed && (
            <span className="text-xs text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full font-medium">
              New
            </span>
          )}
          {step.parallel && !signed && (
            <span className="text-xs text-blue-600 font-medium flex items-center gap-0.5">
              <Users className="w-3 h-3" /> Parallel
            </span>
          )}
          {parallelGroupSize > 1 && !signed && (
            <span className="text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">
              {parallelGroupSize} in step
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">{step.user?.email ?? ''}</p>
        {/* Per-signer download badge */}
        <p className={`text-xs mt-0.5 flex items-center gap-1 font-medium ${step.downloadable ? 'text-green-600' : 'text-gray-400'}`}>
          {step.downloadable
            ? <><Unlock className="w-3 h-3" /> Can download</>
            : <><Lock className="w-3 h-3" /> No download</>}
        </p>
        {step.signedAt && (
          <p className="text-xs text-gray-400 mt-0.5">
            Signed {new Date(step.signedAt).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Controls */}
      {!signed && (
        <div className="flex items-center gap-1 shrink-0">
          {/* Download toggle */}
          <button
            onClick={() => onToggleDownload(step.userId)}
            className={`p-1.5 rounded-lg transition-colors ${
              step.downloadable
                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-green-600'
            }`}
            title={step.downloadable ? 'Disable download for this signer' : 'Allow download for this signer'}
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Parallel toggle */}
          <button
            onClick={() => onToggleParallel(step.userId)}
            className={`p-1.5 rounded-lg transition-colors ${
              step.parallel
                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-blue-600'
            }`}
            title={step.parallel ? 'Remove from parallel signing' : 'Enable parallel signing'}
          >
            {step.parallel ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
          </button>

          {/* Up / Down */}
          <div className="flex flex-col gap-0.5 border-l border-gray-200 pl-2 ml-1">
            <button
              onClick={() => onMoveUp(index)}
              disabled={index === 0}
              className="p-1 rounded text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Move up"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onMoveDown(index)}
              disabled={index === total - 1}
              className="p-1 rounded text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Move down"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Remove (only new signers) */}
          {step.isNew && (
            <button
              onClick={() => onRemove(step.userId)}
              className="p-1.5 ml-1 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors border-l border-gray-200"
              title="Remove this signer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Add-Signer Search Panel ──────────────────────────────────────────────────

interface AddSignerPanelProps {
  documentId: string;
  existingUserIds: string[];
  onAdd: (user: UserType) => void;
}

const AddSignerPanel: React.FC<AddSignerPanelProps> = ({
  documentId,
  existingUserIds,
  onAdd,
}) => {
  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
      .get('v1/users/search', {
        params: {
          query: debouncedQuery.trim(),
          excludeCurrent: true,
          currentUserId: currentUser?.id,
          documentId,
          limit: 20,
        },
      })
      .then(res => {
        if (cancelled) return;

        let users: UserType[] = [];
        if (Array.isArray(res.data)) users = res.data;
        else if (Array.isArray(res.data?.data)) users = res.data.data;
        else if (Array.isArray(res.data?.users)) users = res.data.users;

        setResults(
          users.map(u => ({
            id: u.id?.toString() ?? '',
            username: u.username ?? '',
            email: u.email ?? '',
            roles: (u.roles ?? []).map((r: unknown) =>
              typeof r === 'string' ? r : (r as { name: string })?.name ?? '',
            ),
          })),
        );
      })
      .catch(() => toast.error('Failed to search users'))
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [debouncedQuery, documentId, currentUser?.id]);

  const available = results.filter(u => !existingUserIds.includes(u.id));

  return (
    <div className="border-t border-dashed border-cyan-200 pt-4 mt-2">
      <div className="flex items-center gap-2 mb-3">
        <UserPlus className="w-4 h-4 text-cyan-600 shrink-0" />
        <h4 className="text-sm font-semibold text-gray-800">Add Signer to Flow</h4>
      </div>

      {/* Search input */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name, email or role…"
          className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none transition-all"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Results */}
      <div className="max-h-48 overflow-y-auto rounded-lg border border-cyan-100">
        {isLoading ? (
          <div className="p-4 text-center">
            <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-1" />
            <p className="text-xs text-gray-500">Searching…</p>
          </div>
        ) : available.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {available.map(u => (
              <div
                key={u.id}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-cyan-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{u.username}</p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  {u.roles && u.roles.length > 0 && (
                    <p className="text-xs text-gray-400 truncate">{u.roles.join(', ')}</p>
                  )}
                </div>
                <button
                  onClick={() => { onAdd(u); setQuery(''); setResults([]); }}
                  className="shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
            ))}
          </div>
        ) : query.trim().length >= 2 && !isLoading ? (
          <div className="p-6 text-center text-gray-400">
            <Search className="w-6 h-6 mx-auto mb-1 opacity-50" />
            <p className="text-xs">No users found</p>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-400">
            <Search className="w-6 h-6 mx-auto mb-1 opacity-40" />
            <p className="text-xs">Type at least 2 characters to search</p>
          </div>
        )}
      </div>

      {/* hint */}
      <p className="text-xs text-gray-400 mt-2">
        New signers are appended at the end of the unsigned queue. Reorder them above after adding.
      </p>
    </div>
  );
};

// ─── Main Dialog ──────────────────────────────────────────────────────────────

interface UpdateFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: PDFDocument | null;
  onSaved: () => void;
}

const UpdateFlowDialog: React.FC<UpdateFlowDialogProps> = ({
  open,
  onOpenChange,
  document: doc,
  onSaved,
}) => {
  const buildInitialSteps = useCallback((): SignerStep[] => {
    if (!doc?.signerSteps) return [];
    const signers = doc.signerSteps.filter(s => s.permission === 'view_and_sign');
    const signed = signers.filter(s => s.hasSigned).sort((a, b) => a.step - b.step);
    const unsigned = signers.filter(s => !s.hasSigned).sort((a, b) => a.step - b.step);
    return renumber([...signed, ...unsigned].map(s => ({
      ...s,
      downloadable: s.downloadable ?? (doc.downloadable ?? true),
    })));
  }, [doc]);

  const [steps, setSteps] = useState<SignerStep[]>(buildInitialSteps);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [isDownloadable, setIsDownloadable] = useState<boolean>(doc?.downloadable ?? true);

  React.useEffect(() => {
    if (open) {
      setSteps(buildInitialSteps());
      setShowAddPanel(false);
      setIsDownloadable(doc?.downloadable ?? true);
    }
  }, [open, buildInitialSteps]);

  // ── DnD ──────────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = steps.findIndex(s => s.userId === active.id);
    const newIdx = steps.findIndex(s => s.userId === over.id);
    if (steps[oldIdx]?.hasSigned || steps[newIdx]?.hasSigned) return;
    setSteps(prev => renumber(arrayMove(prev, oldIdx, newIdx)));
  };

  // ── Arrow moves ───────────────────────────────────────────────────────────
  const moveUp = (index: number) => {
    if (index === 0 || steps[index - 1]?.hasSigned) return;
    setSteps(prev => renumber(arrayMove(prev, index, index - 1)));
  };

  const moveDown = (index: number) => {
    if (index === steps.length - 1 || steps[index]?.hasSigned) return;
    setSteps(prev => renumber(arrayMove(prev, index, index + 1)));
  };

  // ── Parallel toggle ───────────────────────────────────────────────────────
  const toggleParallel = (userId: string) => {
    setSteps(prev => {
      const idx = prev.findIndex(s => s.userId === userId);
      if (idx === -1 || prev[idx].hasSigned) return prev;
      const updated = prev.map((s, i) =>
        i === idx ? { ...s, parallel: !s.parallel } : s,
      );
      return renumber(updated);
    });
  };

  // ── Per-signer download toggle ────────────────────────────────────────────
  const toggleDownload = (userId: string) => {
    setSteps(prev =>
      prev.map(s =>
        s.userId === userId && !s.hasSigned
          ? { ...s, downloadable: !s.downloadable }
          : s,
      ),
    );
  };

  // ── Add signer ────────────────────────────────────────────────────────────
  const handleAddSigner = (user: UserType) => {
    // Guard: already in the list
    if (steps.some(s => s.userId === user.id)) {
      toast.error(`${user.username} is already in the signing flow`);
      return;
    }

    const newStep: SignerStep = {
      step: steps.length + 1, // will be renumbered
      userId: user.id,
      user,
      hasSigned: false,
      parallel: false,
      permission: 'view_and_sign',
      isNew: true,
      downloadable: isDownloadable,
    };

    setSteps(prev => renumber([...prev, newStep]));
    toast.success(`${user.username} added to the signing flow`);
  };

  // ── Remove new signer ─────────────────────────────────────────────────────
  const handleRemoveSigner = (userId: string) => {
    setSteps(prev => renumber(prev.filter(s => s.userId !== userId)));
  };

  // ── Parallel group size ───────────────────────────────────────────────────
  const parallelGroupSize = (stepNumber: number) =>
    steps.filter(s => s.step === stepNumber && s.parallel).length;

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!doc) return;

    const payload = steps.map(s => ({
      userId: Number(s.userId),
      documentId: doc.id,
      step: s.step,
      parallel: s.parallel ?? false,
      isNew: s.isNew ?? false,
      downloadable: s.downloadable ?? isDownloadable,
    }));

    setIsSaving(true);
    try {
      await api.patch(`v2/signers/${doc.id}`, { signers: payload, downloadable: isDownloadable });
      toast.success('Signing flow updated successfully');
      onOpenChange(false);
      onSaved();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to update signing flow';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const signedCount = steps.filter(s => s.hasSigned).length;
  const unsignedCount = steps.length - signedCount;
  const newCount = steps.filter(s => s.isNew).length;
  const existingUserIds = steps.map(s => s.userId);

  if (!doc) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />

        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col border-2 border-cyan-200 z-50">

          {/* ── Header ── */}
          <div className="p-6 border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-t-2xl shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="flex items-center gap-2 text-xl font-bold text-gray-900">
                  <div className="p-2 bg-cyan-100 rounded-lg shrink-0">
                    <RefreshCw className="w-5 h-5 text-cyan-600" />
                  </div>
                  Update Signing Flow
                </Dialog.Title>
                <p className="text-sm text-gray-500 mt-1 ml-11 truncate max-w-xs">
                  {doc.fileName}
                </p>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 hover:bg-cyan-100 rounded-lg transition-colors shrink-0"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Stats strip */}
            <div className="flex items-center gap-2 mt-4 ml-11 flex-wrap text-xs">
              <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                <Lock className="w-3 h-3" />
                {signedCount} signed (locked)
              </span>
              <span className="flex items-center gap-1 px-2 py-1 bg-cyan-100 text-cyan-700 rounded-full font-medium">
                <GripVertical className="w-3 h-3" />
                {unsignedCount} pending (reorderable)
              </span>
              {newCount > 0 && (
                <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">
                  <UserPlus className="w-3 h-3" />
                  {newCount} new
                </span>
              )}
            </div>
          </div>

          {/* ── Warning if some already signed ── */}
          {signedCount > 0 && (
            <div className="mx-6 mt-4 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                <span className="font-semibold">
                  {signedCount} signer{signedCount !== 1 ? 's have' : ' has'} already signed.
                </span>{' '}
                Their position{signedCount !== 1 ? 's are' : ' is'} locked and cannot be changed.
              </p>
            </div>
          )}

          {/* ── Downloadable toggle ── */}
          <div className="mx-6 mt-4 shrink-0">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-3">
                {isDownloadable ? (
                  <div className="p-1.5 bg-green-100 rounded-lg">
                    <Unlock className="w-4 h-4 text-green-600" />
                  </div>
                ) : (
                  <div className="p-1.5 bg-gray-200 rounded-lg">
                    <Lock className="w-4 h-4 text-gray-500" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-gray-500" />
                    Allow downloading (all signers)
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isDownloadable
                      ? 'All signers can download — toggle per-signer below'
                      : 'Download disabled for all — toggle per-signer below to override'}
                  </p>
                </div>
              </div>
              {/* Toggle switch */}
              <button
                onClick={() => {
                  const next = !isDownloadable;
                  setIsDownloadable(next);
                  // Sync all unsigned signers to the new global value
                  setSteps(prev =>
                    prev.map(s => (!s.hasSigned ? { ...s, downloadable: next } : s)),
                  );
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  isDownloadable ? 'bg-green-500' : 'bg-gray-300'
                }`}
                role="switch"
                aria-checked={isDownloadable}
                title={isDownloadable ? 'Disable downloading' : 'Enable downloading'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    isDownloadable ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* ── Scrollable content ── */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {steps.length === 0 && !showAddPanel ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Users className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm mb-4">No signers found for this document.</p>
                <button
                  onClick={() => setShowAddPanel(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Add First Signer
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500">
                  Drag rows or use the arrow buttons to reorder unsigned signers.
                  Use the parallel button to allow multiple signers to sign at the same step.
                </p>

                {/* Signer list */}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={steps.map(s => s.userId)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {steps.map((step, idx) => (
                        <FlowRow
                          key={step.userId}
                          step={step}
                          index={idx}
                          total={steps.length}
                          onMoveUp={moveUp}
                          onMoveDown={moveDown}
                          onToggleParallel={toggleParallel}
                          onToggleDownload={toggleDownload}
                          onRemove={handleRemoveSigner}
                          parallelGroupSize={
                            step.parallel ? parallelGroupSize(step.step) : 0
                          }
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {/* Legend */}
                <div className="flex items-center gap-4 pt-3 text-xs text-gray-500 border-t border-gray-100">
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-cyan-200" /> Sequential
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-200" /> Parallel
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-200" /> Signed (locked)
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-amber-200" /> New
                  </span>
                </div>

                {/* Toggle Add-Signer panel */}
                {!showAddPanel ? (
                  <button
                    onClick={() => setShowAddPanel(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-cyan-700 border-2 border-dashed border-cyan-300 rounded-xl hover:bg-cyan-50 hover:border-cyan-400 transition-colors font-medium"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Another Signer
                  </button>
                ) : (
                  <div className="relative">
                    <button
                      onClick={() => setShowAddPanel(false)}
                      className="absolute top-0 right-0 p-1 text-gray-400 hover:text-gray-600 rounded"
                      title="Close search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <AddSignerPanel
                      documentId={doc.id}
                      existingUserIds={existingUserIds}
                      onAdd={user => {
                        handleAddSigner(user);
                        // keep panel open so the user can add multiple
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="shrink-0 p-4 border-t border-cyan-100 bg-white rounded-b-2xl">
            <div className="flex justify-between items-center gap-3">
              <p className="text-xs text-gray-500">
                {newCount > 0
                  ? `${newCount} new signer${newCount !== 1 ? 's' : ''} will be added on save`
                  : 'No new signers pending'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => onOpenChange(false)}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || steps.length === 0}
                  className="px-5 py-2 text-sm bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Flow
                      {newCount > 0 && (
                        <span className="text-xs opacity-80">
                          (+{newCount} new)
                        </span>
                      )}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default UpdateFlowDialog;