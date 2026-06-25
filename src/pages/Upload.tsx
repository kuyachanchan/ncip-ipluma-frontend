import api from '@/api/axiosInstance';
import { useAuth } from '@/auth/useAuth';
import { Loader2, Replace, Trash2, Bookmark, X, ChevronLeft, ChevronRight, FileText, UserPen, Signature, GripVertical, ArrowUp, ArrowDown, CheckCircle, Lock, Users, UserX, UserCheck, UploadIcon, Eye, Info } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import type { Thumbnail, BookmarkItem, Signer } from '@/types/types';
import AddSignerInBookmarkDialog from '@/components/AddSignerInBookmarkDialog';
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface SignerStep {
  step: number;
  userId: string;
  user?: Signer;
  hasSigned?: boolean;
  signedAt?: string;
  parallel?: boolean;
  parallelGroup?: number;
  permission?: string;
  decline?: boolean;
  proceedNext?: boolean;
  isNew?: boolean;
  /** Carried through from bookmark assignment */
  signaturePreference?: 'full' | 'initial';
}

interface StepForPostReq {
  step: number;
  userId: number;
  parallel: boolean;
  /** Sent to the backend so each signer knows how they should sign */
  signaturePreference: 'full' | 'initial';
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

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

// ─── SignerFlowRow Component ──────────────────────────────────────────────────

interface SignerFlowRowProps {
  step: SignerStep;
  index: number;
  total: number;
  onMoveUp: (i: number) => void;
  onMoveDown: (i: number) => void;
  onToggleParallel: (userId: string) => void;
  onRemove: (userId: string) => void;
  parallelGroupSize: number;
}

const SignerFlowRow: React.FC<SignerFlowRowProps> = ({
  step,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onToggleParallel,
  onRemove,
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
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
        ${isDragging ? 'shadow-lg border-blue-400 bg-blue-50' : ''}
        ${signed
          ? 'bg-green-50 border-green-200'
          : step.isNew
            ? 'bg-amber-50 border-amber-200'
            : step.parallel
              ? 'bg-blue-50 border-blue-200'
              : 'bg-white border-gray-200 hover:border-blue-300'}
      `}
    >
      {/* Drag handle */}
      <div
        className={`shrink-0 ${signed ? 'text-green-400 cursor-default' : 'text-gray-400 hover:text-blue-600 cursor-grab active:cursor-grabbing'}`}
        {...(!signed ? { ...attributes, ...listeners } : {})}
        title={signed ? 'Already signed – position locked' : 'Drag to reorder'}
      >
        {signed ? <Lock className="w-3.5 h-3.5" /> : <GripVertical className="w-4 h-4" />}
      </div>

      {/* Step badge */}
      <div
        className={`
          flex items-center justify-center w-7 h-7 rounded-full shrink-0 font-bold text-xs
          ${signed
            ? 'bg-green-100 text-green-700 border-2 border-green-300'
            : step.isNew
              ? 'bg-amber-100 text-amber-700 border-2 border-amber-300'
              : step.parallel
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                : 'bg-blue-100 text-blue-700 border-2 border-blue-300'}
        `}
      >
        {signed ? <CheckCircle className="w-3.5 h-3.5 text-green-600" /> : step.step}
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-xs font-medium truncate ${signed ? 'text-green-800' : 'text-gray-800'}`}>
            {step.user?.username ?? 'Unknown'}
          </p>
          {signed && (
            <span className="text-[10px] text-green-600 font-medium flex items-center gap-0.5">
              <CheckCircle className="w-3 h-3" /> Signed
            </span>
          )}
          {step.parallel && !signed && (
            <span className="text-[10px] text-blue-600 font-medium flex items-center gap-0.5">
              <Users className="w-3 h-3" /> Parallel
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[10px] text-gray-400 truncate">{step.user?.email ?? ''}</p>
        </div>
      </div>

      {/* Controls */}
      {!signed && (
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => onToggleParallel(step.userId)}
            className={`p-1.5 rounded-lg transition-colors ${step.parallel
              ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-blue-600'
              }`}
            title={step.parallel ? 'Remove from parallel signing' : 'Enable parallel signing'}
          >
            {step.parallel ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
          </button>

          <div className="flex flex-col gap-0.5 border-l border-gray-200 pl-1.5 ml-0.5">
            <button
              onClick={() => onMoveUp(index)}
              disabled={index === 0}
              className="p-0.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => onMoveDown(index)}
              disabled={index === total - 1}
              className="p-0.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>

          {step.isNew && (
            <button
              onClick={() => onRemove(step.userId)}
              className="p-1.5 ml-0.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors"
              title="Remove this signer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Upload Component ─────────────────────────────────────────────────────────

export const Upload = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [previewPage, setPreviewPage] = useState<number | null>(null);
  const [addSignerInBookmarkOpen, setAddSignerInBookmarkOpen] = useState(false);
  const [selectedBookmarkItem, setSelectedBookmarkItem] = useState<BookmarkItem | undefined | null>(null);
  const [signerSteps, setSignerSteps] = useState<SignerStep[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Derive signerSteps from bookmarks ──────────────────────────────────────
  // When bookmarks change, rebuild the signer steps list.
  // If a signer already exists in the current steps (e.g. they were reordered
  // or toggled parallel), preserve their step/parallel/signaturePreference so
  // edits aren't lost on every bookmark save.
  useEffect(() => {
    // Collect all signers across all bookmarks, keyed by id so duplicates merge.
    // Last bookmark wins for signaturePreference if the same user appears in
    // multiple bookmarks with different preferences.
    const signerMap = new Map<string, { signer: any; signaturePreference: 'full' | 'initial' }>();

    bookmarks.forEach(bookmark => {
      (bookmark.assignedSignersToBookmark || []).forEach(signer => {
        if (!signer?.id) return;
        const id = signer.id.toString();
        signerMap.set(id, {
          signer,
          signaturePreference: (signer as any).signaturePreference ?? 'full',
        });
      });
    });

    setSignerSteps(prev => {
      // Build a lookup of existing steps so we can preserve ordering state.
      //const existingMap = new Map(prev.map(s => [s.userId, s]));

      // Start with signers already in the flow (preserves order / parallel flag).
      const preserved: SignerStep[] = prev
        .filter(s => signerMap.has(s.userId))
        .map(s => ({
          ...s,
          // Update signaturePreference in case the bookmark was edited.
          signaturePreference: signerMap.get(s.userId)!.signaturePreference,
        }));

      // Append any brand-new signers not yet in the flow.
      const preservedIds = new Set(preserved.map(s => s.userId));
      const newSteps: SignerStep[] = [];
      signerMap.forEach(({ signer, signaturePreference }, id) => {
        if (!preservedIds.has(id)) {
          newSteps.push({
            step: 0, // renumber will fix this
            userId: id,
            user: signer,
            hasSigned: false,
            parallel: false,
            isNew: false,
            signaturePreference,
          });
        }
      });

      return renumber([...preserved, ...newSteps]);
    });
  }, [bookmarks]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
      setThumbnails([]);
      handleUpload(file);
    } else if (file) {
      setError('Please select a valid PDF file');
      setSelectedFile(null);
    }
  };

  const handleUpload = async (fileParam?: File) => {
    const file = fileParam ?? selectedFile;
    if (!file) {
      setError('Please select a PDF file first');
      return;
    }
    setLoading(true);
    setError(null);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('pdf', file);
    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      const response = await fetch(`${import.meta.env.VITE_PDF_URL}/convert-pdf-to-images`, {
        method: 'POST',
        body: formData,
      });
      clearInterval(progressInterval);
      setUploadProgress(100);
      if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
      const data = await response.json();
      if (data.success) {
        setThumbnails(data.images);
        setError(null);
      } else {
        throw new Error(data.error || 'Conversion failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to convert PDF');
      setThumbnails([]);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleReplace = () => {
    setSelectedFile(null);
    setThumbnails([]);
    setError(null);
    setBookmarks([]);
    setPreviewPage(null);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleClear = () => {
    setSelectedFile(null);
    setThumbnails([]);
    setError(null);
    setBookmarks([]);
    setPreviewPage(null);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleAddBookmark = (page: number) => {
    const lastPage = thumbnails.length;
    const newBookmark: BookmarkItem = {
      title: `Bookmark – Page ${page}`,
      fromPage: page,
      toPage: -1,
    };

    const updatedBookmarks = [...bookmarks, newBookmark];
    updatedBookmarks.sort((a, b) => a.fromPage - b.fromPage);
    updatedBookmarks.forEach((bookmark, index) => {
      const nextBookmark = updatedBookmarks[index + 1];
      bookmark.toPage = nextBookmark ? nextBookmark.fromPage - 1 : lastPage;
    });

    const addedBookmark = updatedBookmarks.find(b => b.fromPage === page);
    setSelectedBookmarkItem(addedBookmark);
    setAddSignerInBookmarkOpen(true);
  };

  const handleRemoveBookmark = (index: number) => {
    setBookmarks(prev => {
      const updated = prev.filter((_, i) => i !== index);
      const lastPage = thumbnails.length;
      return updated.map((b, i) => {
        const next = updated[i + 1];
        return { ...b, toPage: next ? next.fromPage : lastPage };
      });
    });
  };

  const handleUpdateBookmarkTitle = (index: number, field: keyof BookmarkItem, value: string | number) => {
    setBookmarks(prev => prev.map((b, i) => i === index ? { ...b, [field]: value } : b));
  };

  const handleUpdateBookmarkPage = (index: number, field: 'fromPage' | 'toPage', value: number) => {
    setBookmarks(prev => {
      const updated = [...prev];
      const bookmark = updated[index];

      if (field === 'fromPage') {
        if (value < 1 || value > thumbnails.length) {
          toast.error('Invalid page number');
          return prev;
        }
        bookmark.fromPage = value;
        if (bookmark.toPage < value) {
          bookmark.toPage = value;
        }
      } else if (field === 'toPage') {
        if (value < bookmark.fromPage) {
          toast.error('To page must be greater than or equal to from page');
          return prev;
        }
        if (value > thumbnails.length) {
          toast.error('Page exceeds document length');
          return prev;
        }
        bookmark.toPage = value;
      }

      const sorted = [...updated].sort((a, b) => a.fromPage - b.fromPage);
      const lastPage = thumbnails.length;

      for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i];
        const next = sorted[i + 1];
        if (current.toPage >= next.fromPage) {
          current.toPage = next.fromPage - 1;
          if (current.toPage < current.fromPage) {
            toast.error('Page ranges would overlap invalidly');
            return prev;
          }
        }
      }

      const lastBookmark = sorted[sorted.length - 1];
      if (lastBookmark && lastBookmark.toPage > lastPage) {
        lastBookmark.toPage = lastPage;
      }

      const final = sorted.map((b, i, arr) => {
        const next = arr[i + 1];
        if (b.toPage === -1) {
          return { ...b, toPage: next ? next.fromPage - 1 : lastPage };
        }
        return b;
      });

      return final;
    });
  };

  const isPageBookmarked = (page: number) =>
    bookmarks.some(b => b.fromPage === page);

  const previewThumbnail = previewPage !== null ? thumbnails.find(t => t.page === previewPage) : null;
  const previewIndex = previewPage !== null ? thumbnails.findIndex(t => t.page === previewPage) : -1;

  const handlePrevPage = () => {
    if (previewIndex > 0) setPreviewPage(thumbnails[previewIndex - 1].page);
  };

  const handleNextPage = () => {
    if (previewIndex < thumbnails.length - 1) setPreviewPage(thumbnails[previewIndex + 1].page);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrevPage();
    if (e.key === 'ArrowRight') handleNextPage();
    if (e.key === 'Escape') setPreviewPage(null);
  };

  const convertSignerSteps = (steps: SignerStep[]): StepForPostReq[] => {
    return steps.map(s => {
      const userId = parseInt(s.userId, 10);
      if (isNaN(userId)) {
        toast.error('An error occurred converting signer steps');
      }
      return {
        step: s.step,
        userId,
        parallel: s.parallel ?? false,
        signaturePreference: s.signaturePreference ?? 'full',
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error('Please select a PDF file first');
      return;
    }

    if (bookmarks.length === 0) {
      toast.error('Please add at least one bookmark before uploading');
      return;
    }

    setLoading(true);

    try {
      if (!user?.id) {
        toast.error('No user id found');
        return;
      }

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('uploader', user.id.toString());
      formData.append('bookmarks', JSON.stringify(bookmarks));
      formData.append('signerSteps', JSON.stringify(convertSignerSteps(signerSteps)));

      const response = await api.post('v1/documents/upload-document', formData);

      if (response.status >= 200 && response.status < 300) {
        toast.success('Document uploaded successfully!');
        handleClear();
        setTimeout(() => {
          navigate('/my-documents');
        }, 3000);
      } else {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to upload document';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBookmarkSaved = (newBookmark: BookmarkItem) => {
    const existing = bookmarks.find(b => b.fromPage === newBookmark.fromPage);
    let updatedBookmarks: BookmarkItem[];

    if (existing) {
      const index = bookmarks.indexOf(existing);
      updatedBookmarks = [...bookmarks];
      updatedBookmarks[index] = { ...newBookmark };
    } else {
      updatedBookmarks = [...bookmarks, newBookmark];
    }

    updatedBookmarks = updatedBookmarks.sort((a, b) => a.fromPage - b.fromPage);

    const lastPage = thumbnails.length;
    let hasOverlap = false;

    for (let i = 0; i < updatedBookmarks.length - 1; i++) {
      const current = updatedBookmarks[i];
      const next = updatedBookmarks[i + 1];
      if (current.toPage >= next.fromPage) {
        current.toPage = next.fromPage - 1;
        if (current.toPage < current.fromPage) {
          toast.error(`Cannot have overlapping bookmarks. "${current.title}" would have no valid page range.`);
          return;
        }
        hasOverlap = true;
      }
    }

    const lastBookmark = updatedBookmarks[updatedBookmarks.length - 1];
    if (lastBookmark && lastBookmark.toPage > lastPage) {
      lastBookmark.toPage = lastPage;
    }

    updatedBookmarks = updatedBookmarks.map((b, i, arr) => {
      const next = arr[i + 1];
      if (b.toPage === -1) {
        return { ...b, toPage: next ? next.fromPage - 1 : lastPage };
      }
      return b;
    });

    if (hasOverlap) {
      toast.error('Some bookmarks had overlapping page ranges and were auto-adjusted');
    }

    setBookmarks(updatedBookmarks);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <div className="relative min-h-screen bg-[#E7F2EF] p-1 md:p-2">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat filter blur-md"
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}background.jpg)` }} />
        <div className="absolute inset-0 bg-black/30" />

        <div className="relative max-w-full mx-auto">
          <div className="bg-white shadow-sm p-2 sm:p-4 md:p-6 mb-4 md:mb-6 border border-[#A1C2BD] h-[calc(100vh-1rem)]">

            <div className='flex flex-col lg:flex-row gap-3 md:gap-4 h-full'>

              {/* ── Thumbnails grid ── */}
              <div className='w-full lg:w-3/4 bg-gray-50 p-2 sm:p-3 md:p-4 rounded-xl overflow-auto'>
                {thumbnails.length > 0 ? (
                  <div>
                    <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 pb-3 border-b border-gray-200'>
                      <h3 className='font-semibold text-gray-800 text-sm sm:text-base flex items-center gap-2'>
                        <FileText size={18} className="text-blue-600" />
                        PDF Thumbnails
                        <span className='bg-gray-200 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full'>
                          {thumbnails.length} pages
                        </span>
                        {bookmarks.length > 0 && (
                          <span className='bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full'>
                            {bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </h3>
                      <button
                        onClick={handleClear}
                        className='text-red-500 hover:text-red-700 text-xs flex items-center gap-1.5 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors'
                      >
                        <Trash2 size={14} /> Clear All
                      </button>
                    </div>

                    <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4'>
                      {thumbnails.map((thumbnail) => {
                        const bookmarked = isPageBookmarked(thumbnail.page);
                        return (
                          <div
                            key={thumbnail.page}
                            className='relative bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow group cursor-pointer border border-gray-100 hover:border-blue-200'
                          >
                            <div className='relative pb-[141.4%] bg-gray-100 rounded-t-xl overflow-hidden'>
                              <img
                                src={thumbnail.data}
                                alt={`Page ${thumbnail.page}`}
                                className='absolute inset-0 w-full h-full object-contain'
                                loading='lazy'
                              />
                              <button
                                className={`absolute top-2 right-2 rounded-full p-1.5 shadow-md transition-all duration-200 hover:scale-110
                                  ${bookmarked
                                    ? 'bg-amber-400 text-white'
                                    : 'bg-white/90 hover:bg-amber-400 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100'
                                  }`}
                                onClick={() => bookmarked
                                  ? handleRemoveBookmark(bookmarks.findIndex(b => b.fromPage === thumbnail.page))
                                  : handleAddBookmark(thumbnail.page)
                                }
                                title={bookmarked ? 'Remove bookmark' : `Bookmark page ${thumbnail.page}`}
                              >
                                <Bookmark size={14} fill={bookmarked ? 'currentColor' : 'none'} />
                              </button>

                              <div className='absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex flex-col items-center justify-center gap-2'>
                                <button
                                  className='text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-all bg-black/60 px-3 py-1.5 rounded-lg hover:bg-black/80'
                                  onClick={() => setPreviewPage(thumbnail.page)}
                                >
                                  <Eye size={14} className="inline mr-1" /> View
                                </button>
                                {!bookmarked && (
                                  <button
                                    className='text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-all bg-black/60 px-3 py-1.5 rounded-lg hover:bg-black/80'
                                    onClick={() => handleAddBookmark(thumbnail.page)}
                                  >
                                    <Bookmark size={14} className="inline mr-1" /> Add Bookmark
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className='p-2.5 text-center bg-white rounded-b-xl'>
                              <p className='text-xs font-medium text-gray-600'>Page {thumbnail.page}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className='h-full w-full flex-col flex items-center justify-center text-gray-500'>
                    {loading ? (
                      <>
                        <Loader2 className='animate-spin mb-3' size={40} />
                        <div className='text-sm font-semibold text-gray-700'>Loading PDF...</div>
                        <div className='text-xs text-gray-400 mt-1'>Processing {uploadProgress}%</div>
                        {uploadProgress > 0 && uploadProgress < 100 && (
                          <div className='w-48 mt-3 bg-gray-200 rounded-full h-2.5'>
                            <div className='bg-blue-600 h-2.5 rounded-full transition-all duration-300' style={{ width: `${uploadProgress}%` }} />
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <FileText size={40} className="text-gray-400" />
                        </div>
                        <div className='text-sm font-semibold text-gray-700'>No document selected</div>
                        <div className='text-xs text-gray-400 mt-1'>Upload a PDF to see thumbnails</div>
                      </>
                    )}
                    {error && (
                      <div className='mt-4 text-red-500 text-sm bg-red-50 px-4 py-2.5 rounded-lg border border-red-200'>
                        {error}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Sidebar ── */}
              <div className='w-full lg:w-1/4 pl-0 lg:pl-2 overflow-auto flex flex-col gap-4'>

                {/* Upload Section */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className='flex items-center gap-2 mb-3'>
                    <UploadIcon size={16} className="text-blue-600" />
                    <h3 className='text-sm font-semibold text-gray-800'>Upload Document</h3>
                  </div>

                  <div className='space-y-3'>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">PDF File</label>
                      {!selectedFile && (
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleFileSelect}
                          className='block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'
                          disabled={loading}
                        />
                      )}
                    </div>

                    {selectedFile && (
                      <>
                        <div className='bg-gray-50 rounded-lg p-3'>
                          <p className='text-xs text-gray-600 truncate'>
                            <span className='font-medium'>📄</span> {selectedFile.name}
                          </p>
                          <p className='text-xs text-gray-400 mt-0.5'>
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          onClick={handleReplace}
                          className="w-full bg-red-50 text-red-600 hover:bg-red-100 font-medium rounded-lg py-2 text-xs transition-colors flex items-center justify-center gap-1.5"
                          disabled={loading}
                        >
                          <Replace size={14} /> Replace File
                        </button>
                      </>
                    )}

                    {selectedFile && bookmarks.length === 0 && (
                      <div className="flex items-center gap-2 border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-lg px-3 py-2 select-none bg-amber-50/50 dark:bg-amber-900/10">
                        <Info className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                        <span className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                          To proceed, hover over thumbnails and select{' '}
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 rounded font-semibold text-[10px] border border-amber-300 dark:border-amber-700">
                            <Bookmark className="w-2.5 h-2.5" />
                            Add Bookmark
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bookmarks Section */}
                {bookmarks.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <Bookmark size={16} className="text-amber-500" fill="currentColor" />
                        Bookmarks
                        <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
                          {bookmarks.length}
                        </span>
                      </h3>
                      <button
                        onClick={() => setBookmarks([])}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                      >
                        Clear all
                      </button>
                    </div>

                    <div className="space-y-2.5 max-h-[40vh] overflow-y-auto pr-1">
                      {bookmarks.map((bookmark, index) => {
                        const hasSigners = bookmark.assignedSignersToBookmark && bookmark.assignedSignersToBookmark.length > 0;
                        return (
                          <div
                            key={index}
                            className="bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors p-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${hasSigners ? "bg-amber-400" : "bg-red-400"}`} />
                                  <input
                                    type="text"
                                    value={bookmark.title}
                                    onChange={(e) => handleUpdateBookmarkTitle(index, "title", e.target.value)}
                                    placeholder="Bookmark title"
                                    className="text-xs font-medium bg-transparent border-none outline-none text-gray-800 placeholder-gray-300 w-full"
                                  />
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-gray-500">Pages</span>
                                    <input
                                      type="number"
                                      value={bookmark.fromPage}
                                      onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        if (!isNaN(value) && value > 0) {
                                          handleUpdateBookmarkPage(index, 'fromPage', value);
                                        }
                                      }}
                                      className="w-10 px-1 py-0.5 text-[10px] text-center bg-white border border-gray-200 rounded focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
                                      min={1}
                                      max={thumbnails.length}
                                    />
                                    <span className="text-[10px] text-gray-500">–</span>
                                    <input
                                      type="number"
                                      value={bookmark.toPage}
                                      onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        if (!isNaN(value) && value >= bookmark.fromPage) {
                                          handleUpdateBookmarkPage(index, 'toPage', value);
                                        }
                                      }}
                                      className="w-10 px-1 py-0.5 text-[10px] text-center bg-white border border-gray-200 rounded focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
                                      min={bookmark.fromPage}
                                      max={thumbnails.length}
                                    />
                                  </div>
                                  {hasSigners ? (
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {bookmark.assignedSignersToBookmark!.slice(0, 2).map((signer, si) => (
                                        <span key={si} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">
                                          {signer.username}
                                        </span>
                                      ))}
                                      {bookmark.assignedSignersToBookmark!.length > 2 && (
                                        <span className="text-[10px] text-gray-400">+{bookmark.assignedSignersToBookmark!.length - 2}</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-gray-400 italic">No signers</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => {
                                    setSelectedBookmarkItem(bookmark);
                                    setAddSignerInBookmarkOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Edit signers"
                                >
                                  <UserPen size={14} />
                                </button>
                                <button
                                  onClick={() => handleRemoveBookmark(index)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                  title="Remove bookmark"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Signing Flow */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                          <Signature size={16} className="text-blue-600" />
                          Signing Flow
                          <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                            {signerSteps.length}
                          </span>
                        </h3>
                      </div>

                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event: DragEndEvent) => {
                          const { active, over } = event;
                          if (!over || active.id === over.id) return;
                          const oldIdx = signerSteps.findIndex(s => s.userId === active.id);
                          const newIdx = signerSteps.findIndex(s => s.userId === over.id);
                          if (signerSteps[oldIdx]?.hasSigned || signerSteps[newIdx]?.hasSigned) return;
                          setSignerSteps(prev => renumber(arrayMove(prev, oldIdx, newIdx)));
                        }}
                      >
                        <SortableContext
                          items={signerSteps.map(s => s.userId)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                            {signerSteps.map((step, idx) => (
                              <SignerFlowRow
                                key={step.userId}
                                step={step}
                                index={idx}
                                total={signerSteps.length}
                                onMoveUp={(i) => {
                                  if (i === 0 || signerSteps[i - 1]?.hasSigned) return;
                                  setSignerSteps(prev => renumber(arrayMove(prev, i, i - 1)));
                                }}
                                onMoveDown={(i) => {
                                  if (i === signerSteps.length - 1 || signerSteps[i]?.hasSigned) return;
                                  setSignerSteps(prev => renumber(arrayMove(prev, i, i + 1)));
                                }}
                                onToggleParallel={(userId) => {
                                  setSignerSteps(prev => {
                                    const idx = prev.findIndex(s => s.userId === userId);
                                    if (idx === -1 || prev[idx].hasSigned) return prev;
                                    const updated = prev.map((s, i) =>
                                      i === idx ? { ...s, parallel: !s.parallel } : s,
                                    );
                                    return renumber(updated);
                                  });
                                }}
                                onRemove={(userId) => {
                                  setSignerSteps(prev => renumber(prev.filter(s => s.userId !== userId)));
                                }}
                                parallelGroupSize={
                                  step.parallel
                                    ? signerSteps.filter(s => s.step === step.step && s.parallel).length
                                    : 0
                                }
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>

                      <div className="mt-3 flex items-center gap-3 pt-2 border-t border-gray-100">
                        <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan-200" /> Sequential
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-200" /> Parallel
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={loading || bookmarks.length === 0}
                  className="mt-4 w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className='animate-spin' size={16} />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <UploadIcon size={16} />
                      Upload Document
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Preview Modal ── */}
      {previewPage !== null && previewThumbnail && (
        <div
          className='fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4'
          onClick={() => setPreviewPage(null)}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div
            className='relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]'
            onClick={e => e.stopPropagation()}
          >
            <div className='flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex-shrink-0'>
              <span className='text-sm font-semibold text-gray-800 flex items-center gap-2'>
                <FileText size={16} className="text-blue-600" />
                Page {previewThumbnail.page} of {thumbnails.length}
              </span>
              <div className='flex items-center gap-2'>
                <button
                  onClick={() => handleAddBookmark(previewThumbnail.page)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors
                    ${isPageBookmarked(previewThumbnail.page)
                      ? 'bg-amber-400 border-amber-400 text-white'
                      : 'border-gray-300 text-gray-600 hover:border-amber-400 hover:text-amber-600'
                    }`}
                >
                  <Bookmark size={14} fill={isPageBookmarked(previewThumbnail.page) ? 'currentColor' : 'none'} />
                  {isPageBookmarked(previewThumbnail.page) ? 'Bookmarked' : 'Bookmark'}
                </button>
                <button
                  onClick={() => setPreviewPage(null)}
                  className='p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600'
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className='flex items-center justify-center bg-gray-50 px-4 sm:px-8 py-6 sm:py-8 overflow-auto flex-1'>
              <img
                src={previewThumbnail.data}
                alt={`Page ${previewThumbnail.page}`}
                className='max-h-[60vh] max-w-full object-contain shadow-lg rounded-lg'
              />
            </div>

            <div className='flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-white flex-shrink-0'>
              <button
                onClick={handlePrevPage}
                disabled={previewIndex === 0}
                className='flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <div className='flex gap-1'>
                {thumbnails.map(t => (
                  <button
                    key={t.page}
                    onClick={() => setPreviewPage(t.page)}
                    className={`w-2 h-2 rounded-full transition-colors ${t.page === previewPage ? 'bg-blue-600' : 'bg-gray-300 hover:bg-gray-400'}`}
                  />
                ))}
              </div>
              <button
                onClick={handleNextPage}
                disabled={previewIndex === thumbnails.length - 1}
                className='flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <AddSignerInBookmarkDialog
        bookmark={selectedBookmarkItem}
        open={addSignerInBookmarkOpen}
        onOpenChange={setAddSignerInBookmarkOpen}
        onSaved={handleBookmarkSaved}
      />
    </>
  );
};