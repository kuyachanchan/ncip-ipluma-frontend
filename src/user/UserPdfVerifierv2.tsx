/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef, type ChangeEvent } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle, XCircle, Clock, FileText, Shield,
  Upload, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react';
import api from '@/api/axiosInstance';

interface PDFDocument {
  id: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: string;
  status: string;
  uploadedAt: string;
}

interface UserPdfVerifierv2Props {
  preloadedDocument?: PDFDocument;
  onClose?: () => void;
}

interface SignatureResult {
  valid: boolean;
  signerName?: string;
  location?: string;
  reason?: string;
  signDate: string | number | Date;
  hasTimestamp?: boolean;
  timestampDate?: string | number | Date;
  certificateValid?: boolean;
  documentIntegrityValid?: boolean;
  error?: string;
}

interface VerificationResult {
  signatureCount: number;
  allValid: boolean;
  signatures: SignatureResult[];
}

// ── Small helpers ─────────────────────────────────────────────────
const StatusDot = ({ ok }: { ok: boolean }) => (
  <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
);

const Badge = ({ valid }: { valid: boolean }) => (
  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex-shrink-0 ${valid
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-red-50 text-red-700 border-red-200'
    }`}>
    {valid ? 'Valid' : 'Invalid'}
  </span>
);

// ── Collapsible signature card ────────────────────────────────────
const SignatureCard = ({
  sig, index, formatDate,
}: { sig: SignatureResult; index: number; formatDate: (d: any) => string }) => {
  const [open, setOpen] = useState(true);

  return (
    <div className={`rounded-xl border-2 overflow-hidden ${sig.valid ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'
      }`}>
      {/* Header — always visible, tap to collapse on mobile */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {sig.valid
            ? <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            : <XCircle className="w-5 h-5 text-red-600    flex-shrink-0" />}
          <span className="font-semibold text-gray-900 text-sm sm:text-base">
            Signature #{index + 1}
          </span>
          {sig.signerName && (
            <span className="text-xs text-gray-400 truncate hidden sm:block">— {sig.signerName}</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge valid={sig.valid} />
          {open
            ? <ChevronUp className="w-4 h-4 text-gray-400" />
            : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-black/5">
          {/* Signer + date — stack on mobile, side-by-side on sm+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
            <div className="bg-white rounded-lg p-3 border border-black/5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Signer</p>
              <p className="text-sm font-medium text-gray-800">{sig.signerName || 'Unknown'}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-black/5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Signed
              </p>
              <p className="text-sm text-gray-700 break-words">{formatDate(sig.signDate)}</p>
            </div>
          </div>

          {/* TSA timestamp */}
          {sig.hasTimestamp && sig.timestampDate && (
            <div className="flex flex-wrap items-center gap-2 bg-blue-50 px-3 py-2.5 rounded-lg border border-blue-200 text-xs sm:text-sm">
              <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="font-semibold text-blue-900">TSA Timestamp:</span>
              <span className="text-blue-700 break-all">{formatDate(sig.timestampDate)}</span>
            </div>
          )}

          {/* Certificate + integrity pills */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { ok: !!sig.certificateValid, label: sig.certificateValid ? 'Certificate Valid' : 'Certificate Invalid' },
              { ok: !!sig.documentIntegrityValid, label: sig.documentIntegrityValid ? 'Document Intact' : 'Document Modified' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2.5 border border-black/5 text-xs sm:text-sm">
                <StatusDot ok={item.ok} />
                <span className="text-gray-700 leading-tight">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Error */}
          {sig.error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50 text-sm">
              <AlertDescription className="text-red-800">{sig.error}</AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────
export default function UserPdfVerifierv2({ preloadedDocument }: UserPdfVerifierv2Props) {
  const [file, setFile] = useState<File | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setResult(null); setError(null); }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (preloadedDocument) return;
    const f = e.dataTransfer.files?.[0];
    if (f?.type === 'application/pdf') { setFile(f); setResult(null); setError(null); }
  };

useEffect(() => {
  if (!preloadedDocument) return;

  (async () => {
    setIsLoadingDoc(true);
    setError(null);

    try {
      const res = await api.get(
        `v1/documents/view/${preloadedDocument.filePath}`,
        {
          responseType: 'blob',
        }
      );

      const file = new File(
        [res.data],
        preloadedDocument.fileName,
        {
          type: 'application/pdf',
        }
      );

      setFile(file);

    } catch (err) {
      console.error(err);
      setError('Failed to load document');
    } finally {
      setIsLoadingDoc(false);
    }
  })();
}, [preloadedDocument]);

  const verifySignatures = async () => {
    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const form = new FormData();

      form.append('pdfDocument', file);

      const res = await api.post(
        '/v1/verify-document',
        form
      );

      const data = res.data;

      if (data.success) {
        setResult(data.verification);
      } else {
        setError(data.error);
      }

    } catch (err: any) {
      console.log(err.response?.data);

      setError(
        err.response?.data?.error ??
        err.message
      );
    } finally {
      setVerifying(false);
    }
  };

  const formatDate = (ts: string | number | Date): string => {
    try {
      return new Date(ts).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        timeZoneName: 'short',
      });
    } catch { return 'Invalid date'; }
  };

  // Summary status
  const summaryStatus = !result ? null
    : result.signatureCount === 0 ? 'none'
      : result.allValid ? 'valid'
        : 'invalid';

  return (
    <div className="h-full overflow-y-auto bg-gray-50">

      {/* ── PAGE BODY ────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-5">

        {/* ── STATUS PILLS — always visible at top on mobile ─────── */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-4 px-4 sm:mx-0 sm:px-0">
          {[
            {
              icon: isLoadingDoc
                ? <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                : file
                  ? <CheckCircle className="w-4 h-4 text-emerald-600" />
                  : <XCircle className="w-4 h-4 text-gray-300" />,
              label: isLoadingDoc ? 'Loading…' : 'PDF loaded',
              active: !!file || isLoadingDoc,
            },
            {
              icon: result
                ? summaryStatus === 'valid'
                  ? <CheckCircle className="w-4 h-4 text-emerald-600" />
                  : summaryStatus === 'none'
                    ? <AlertTriangle className="w-4 h-4 text-amber-500" />
                    : <XCircle className="w-4 h-4 text-red-600" />
                : <Clock className="w-4 h-4 text-gray-300" />,
              label: result
                ? summaryStatus === 'valid' ? 'All valid'
                  : summaryStatus === 'none' ? 'No signatures'
                    : 'Issues found'
                : 'Not verified',
              active: !!result,
            },
            ...(result ? [{
              icon: <FileText className="w-4 h-4 text-gray-600" />,
              label: `${result.signatureCount} signature${result.signatureCount !== 1 ? 's' : ''}`,
              active: true,
            }] : []),
          ].map((pill, i) => (
            <div
              key={i}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border flex-shrink-0 ${pill.active
                ? 'bg-white border-gray-200 text-gray-700'
                : 'bg-gray-50 border-gray-100 text-gray-400'
                }`}
            >
              {pill.icon}
              {pill.label}
            </div>
          ))}
        </div>

        {/* ── UPLOAD ZONE ─────────────────────────────────────────── */}
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">

          {/* ── DOCUMENT LOADING SKELETON ── */}
          {isLoadingDoc ? (
            <div className="m-4 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 p-6 sm:p-8">
              <div className="flex flex-col items-center gap-4">
                {/* Animated PDF icon */}
                <div className="relative w-14 h-14">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center">
                    <FileText className="w-7 h-7 text-indigo-400" />
                  </div>
                  {/* Spinning ring overlay */}
                  <div className="absolute inset-0 rounded-2xl border-2 border-transparent border-t-indigo-500 animate-spin" />
                </div>

                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold text-indigo-700">Loading document…</p>
                  <p className="text-xs text-indigo-400 truncate max-w-xs">
                    {preloadedDocument?.fileName}
                  </p>
                </div>

                {/* Skeleton bars */}
                <div className="w-full max-w-sm space-y-2 mt-1">
                  <div className="h-2 bg-indigo-100 rounded-full animate-pulse w-full" />
                  <div className="h-2 bg-indigo-100 rounded-full animate-pulse w-4/5 mx-auto" />
                  <div className="h-2 bg-indigo-100 rounded-full animate-pulse w-3/5 mx-auto" />
                </div>
              </div>
            </div>
          ) : (
            <div
              onDragOver={e => { e.preventDefault(); if (!preloadedDocument) setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !preloadedDocument && fileInputRef.current?.click()}
              className={`border-2 border-dashed m-4 rounded-xl p-6 sm:p-8 text-center transition-all ${preloadedDocument
                ? 'border-gray-200 opacity-60 cursor-not-allowed'
                : isDragging
                  ? 'border-indigo-400 bg-indigo-50 cursor-pointer'
                  : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 cursor-pointer active:bg-gray-50'
                }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
                disabled={!!preloadedDocument}
              />

              {file ? (
                /* File ready state */
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-sm font-semibold text-gray-800 break-all">{file.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                      {preloadedDocument && ' · Loaded from system'}
                      {!preloadedDocument && ' · Tap to change'}
                    </p>
                  </div>
                </div>
              ) : (
                /* Empty state */
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">
                      <span className="sm:hidden">Tap to select a PDF</span>
                      <span className="hidden sm:inline">Drop PDF here or <span className="text-indigo-600">browse</span></span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">PDF files only</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Verify button — disabled while loading */}
          <div className="px-4 pb-4">
            <button
              onClick={verifySignatures}
              disabled={!file || verifying || isLoadingDoc}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
              style={{ background: '#111827' }}
              onMouseEnter={e => { if (!verifying && !isLoadingDoc && file) (e.currentTarget.style.background = '#1f2937'); }}
              onMouseLeave={e => (e.currentTarget.style.background = '#111827')}
            >
              {verifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying signatures…
                </>
              ) : isLoadingDoc ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Loading document…
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Verify Signatures
                </>
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 pb-4">
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── RESULTS ─────────────────────────────────────────────── */}
        {result && (
          <div className="space-y-4">

            {/* Summary banner */}
            <div className={`flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border-2 ${summaryStatus === 'valid' ? 'bg-emerald-50  border-emerald-200' :
              summaryStatus === 'none' ? 'bg-amber-50    border-amber-200' :
                'bg-red-50      border-red-200'
              }`}>
              <div className="flex items-center gap-2.5">
                <FileText className={`w-5 h-5 flex-shrink-0 ${summaryStatus === 'valid' ? 'text-emerald-600' :
                  summaryStatus === 'none' ? 'text-amber-600' : 'text-red-600'
                  }`} />
                <span className="text-sm font-medium text-gray-800">
                  {result.signatureCount} signature{result.signatureCount !== 1 ? 's' : ''} found
                </span>
              </div>
              <div className={`flex items-center gap-1.5 text-sm font-semibold ${summaryStatus === 'valid' ? 'text-emerald-700' :
                summaryStatus === 'none' ? 'text-amber-700' : 'text-red-700'
                }`}>
                {summaryStatus === 'valid' && <><CheckCircle className="w-4 h-4" /> All Valid</>}
                {summaryStatus === 'none' && <><AlertTriangle className="w-4 h-4" /> No Signatures</>}
                {summaryStatus === 'invalid' && <><XCircle className="w-4 h-4" /> Issues Found</>}
              </div>
            </div>

            {/* No signatures warning */}
            {result.signatureCount === 0 && (
              <div className="flex gap-3 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900 mb-1">No Digital Signatures Detected</p>
                  <p className="text-amber-800 leading-relaxed text-xs sm:text-sm">
                    This PDF does not contain any digital signatures. It may be unsigned or use a different signing method.
                  </p>
                </div>
              </div>
            )}

            {/* Individual signature cards */}
            {result.signatureCount > 0 && (
              <div className="space-y-3">
                {result.signatures.map((sig, i) => (
                  <SignatureCard key={i} sig={sig} index={i} formatDate={formatDate} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── HOW TO VERIFY (collapsed on mobile, shown on sm+) ───── */}
        {/*<HowToVerify />*/}
      </div>
    </div>
  );
}

// ── Collapsible instructions (mobile-friendly) ────────────────────
/*const HowToVerify = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Shield className="w-4 h-4 text-indigo-500" />
          How to verify
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <ol className="px-4 pb-4 space-y-2 border-t border-gray-50 pt-3">
          {[
            'Upload your signed PDF document',
            'Click "Verify Signatures"',
            'Review signature details and validity',
            'Check certificate and document integrity',
          ].map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-gray-500">
              <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[11px] font-bold text-indigo-600 flex-shrink-0">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};*/