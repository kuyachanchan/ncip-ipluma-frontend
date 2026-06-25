import { useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, FileText, Mail } from 'lucide-react';

interface BatchResultItem {
  originalFilename: string;
  signedFilename?: string;
  success: boolean;
  error?: string;
}

interface BatchResult {
  batchId: string;
  totalDocuments: number;
  successCount: number;
  failureCount: number;
  results: BatchResultItem[];
}

export default function BatchPdfSigner() {
  const [files, setFiles] = useState<File[]>([]);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [certificate, setCertificate] = useState<File | null>(null);
  const [password, setPassword] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [signing, setSigning] = useState<boolean>(false);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
    setResult(null);
    setError(null);
  };

  const handleSignatureChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSignatureFile(e.target.files?.[0] || null);
  };

  const handleCertificateChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCertificate(e.target.files?.[0] || null);
  };

  const handleBatchSign = async () => {
    if (files.length === 0 || !signatureFile || !certificate || !password) {
      setError('Please provide all required fields');
      return;
    }

    setSigning(true);
    setError(null);

    const formData = new FormData();
    files.forEach((file) => formData.append('pdfDocuments', file));
    formData.append('signatureImage', signatureFile);
    formData.append('certificateFile', certificate);
    formData.append('page', '1');
    formData.append('x', '100');
    formData.append('y', '100');
    formData.append('width', '150');
    formData.append('height', '50');
    formData.append('canvasWidth', '595');
    formData.append('canvasHeight', '842');
    formData.append('password', password);
    if (userEmail) {
      formData.append('userEmail', userEmail);
    }

    try {
      const response = await fetch('http://127.0.0.1:8002/api/v1/batch-sign-documents', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.batch as BatchResult);
      } else {
        setError(data.error || 'Batch signing failed');
      }
    } catch (err: any) {
      setError('Error connecting to server: ' + err.message);
    } finally {
      setSigning(false);
    }
  };

  const getStatusIcon = (success: boolean) =>
    success ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <XCircle className="w-4 h-4 text-red-600" />
    );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Batch PDF Signer
          </CardTitle>
          <CardDescription>
            Sign multiple PDF documents at once with the same signature
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File selection */}
          <div>
            <label className="text-sm font-medium block mb-2">PDF Documents (Multiple)</label>
            <Input
              type="file"
              accept="application/pdf"
              multiple
              onChange={handleFileChange}
              className="mb-2"
            />
            {files.length > 0 && (
              <p className="text-sm text-gray-600">Selected {files.length} file(s)</p>
            )}
          </div>

          {/* Signature & Certificate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-2">Signature Image</label>
              <Input type="file" accept="image/*" onChange={handleSignatureChange} />
              {signatureFile && (
                <p className="text-xs text-gray-500 mt-1">{signatureFile.name}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Certificate (.p12)</label>
              <Input type="file" accept=".p12,.pfx" onChange={handleCertificateChange} />
              {certificate && (
                <p className="text-xs text-gray-500 mt-1">{certificate.name}</p>
              )}
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-sm font-medium block mb-2">Certificate Password</label>
            <Input
              type="password"
              placeholder="Enter certificate password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Optional Email */}
          <div>
            <label className="text-sm font-medium block mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email (optional - for notifications)
            </label>
            <Input
              type="email"
              placeholder="your-email@example.com"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleBatchSign}
            disabled={!files.length || !signatureFile || !certificate || !password || signing}
            className="w-full"
          >
            {signing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing {files.length} documents...
              </>
            ) : (
              `Sign ${files.length} Document${files.length !== 1 ? 's' : ''}`
            )}
          </Button>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4 mt-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {result.totalDocuments}
                    </div>
                    <div className="text-sm text-gray-600">Total</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {result.successCount}
                    </div>
                    <div className="text-sm text-gray-600">Success</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-red-600">
                      {result.failureCount}
                    </div>
                    <div className="text-sm text-gray-600">Failed</div>
                  </CardContent>
                </Card>
              </div>

              {/* Batch info */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-900">Batch ID:</span>
                  <code className="text-sm bg-white px-2 py-1 rounded">
                    {result.batchId}
                  </code>
                </div>
                <p className="text-sm text-blue-700">Save this ID to check status later</p>
              </div>

              {/* Detailed results */}
              <div className="space-y-2">
                <h3 className="font-semibold">Results:</h3>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {result.results.map((item, index) => (
                    <Card
                      key={index}
                      className={item.success ? 'border-green-200' : 'border-red-200'}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2 flex-1">
                            {getStatusIcon(item.success)}
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                {item.originalFilename}
                              </p>
                              {item.success ? (
                                <p className="text-xs text-green-600">
                                  ✓ Signed as: {item.signedFilename}
                                </p>
                              ) : (
                                <p className="text-xs text-red-600">
                                  ✗ Error: {item.error}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Email info */}
              {userEmail && (
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    A notification email has been sent to {userEmail} with the batch results.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
