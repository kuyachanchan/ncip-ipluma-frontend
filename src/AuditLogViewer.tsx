import React, { useState, type JSX } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  XCircle,
  Search,
  Calendar,
  User,
  FileText,
} from 'lucide-react';

// ----------------------------
// Type Definitions
// ----------------------------
interface AuditLog {
  id: string;
  userEmail: string;
  originalFilename: string;
  signedFilename?: string;
  status: string;
  timestamp: string;
  ipAddress?: string;
  batchId?: string;
  additionalInfo?: string;
}

interface ApiResponse {
  success: boolean;
  history?: AuditLog[];
  error?: string;
}

// ----------------------------
// Component
// ----------------------------
const AuditLogViewer: React.FC = () => {
  const [userEmail, setUserEmail] = useState<string>('');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ----------------------------
  // Fetch Audit History
  // ----------------------------
  const fetchUserHistory = async (): Promise<void> => {
    if (!userEmail) {
      setError('Please enter an email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `http://127.0.0.1:8002/api/v1/audit/user/${encodeURIComponent(
          userEmail
        )}?limit=50`
      );

      const data: ApiResponse = await response.json();

      if (data.success && data.history) {
        setLogs(data.history);
      } else {
        setError(data.error || 'Failed to fetch history');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown network error';
      setError('Error connecting to server: ' + message);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------
  // Helpers
  // ----------------------------
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string): string => {
    if (status === 'SUCCESS') return 'text-green-600 bg-green-50';
    if (status === 'VERIFICATION_SUCCESS') return 'text-blue-600 bg-blue-50';
    if (status.startsWith('FAILED')) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getStatusIcon = (status: string): JSX.Element => {
    if (status === 'SUCCESS' || status === 'VERIFICATION_SUCCESS') {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
    return <XCircle className="w-4 h-4 text-red-600" />;
  };

  // ----------------------------
  // JSX
  // ----------------------------
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Audit Log Viewer
          </CardTitle>
          <CardDescription>
            View signing and verification history for any user
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="email"
                placeholder="Enter user email to view history"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    fetchUserHistory();
                  }
                }}
              />
            </div>
            <Button onClick={fetchUserHistory} disabled={loading || !userEmail}>
              {loading ? (
                <>Loading...</>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Logs */}
          {logs.length > 0 && (
            <div className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">
                  History for {userEmail}
                </h3>
                <span className="text-sm text-gray-600">
                  {logs.length} record{logs.length !== 1 ? 's' : ''} found
                </span>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {logs.map((log) => (
                  <Card key={log.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {getStatusIcon(log.status)}

                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                {log.originalFilename}
                              </p>
                              {log.signedFilename && (
                                <p className="text-xs text-gray-600">
                                  → {log.signedFilename}
                                </p>
                              )}
                            </div>
                            <span
                              className={`text-xs px-2 py-1 rounded ${getStatusColor(
                                log.status
                              )}`}
                            >
                              {log.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(log.timestamp)}
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {log.ipAddress || 'N/A'}
                            </div>
                          </div>

                          {log.batchId && (
                            <div className="mt-2 text-xs">
                              <span className="text-gray-500">Batch ID: </span>
                              <code
                                className="bg-gray-100 px-1 py-0.5 rounded cursor-pointer hover:bg-gray-200"
                                onClick={() =>
                                  navigator.clipboard.writeText(log.batchId!)
                                }
                              >
                                {log.batchId}
                              </code>
                            </div>
                          )}

                          {log.additionalInfo && (
                            <div className="mt-2 text-xs text-gray-600 italic">
                              {log.additionalInfo}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {logs.length === 0 && !loading && !error && userEmail && (
            <Alert>
              <AlertDescription>
                No history found for {userEmail}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogViewer;
