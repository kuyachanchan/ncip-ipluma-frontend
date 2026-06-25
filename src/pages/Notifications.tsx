/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bell, Search, ChevronLeft, ChevronRight, Check, X,
  FileText, Users, Share2, Send, Clock,
  CheckCircle, Trash2, Eye, User, XCircle,
  PenTool
} from 'lucide-react';
import * as Checkbox from '@radix-ui/react-checkbox';
import * as Dialog from '@radix-ui/react-dialog';
import api from '@/api/axiosInstance';
import toast from 'react-hot-toast';
import { useAuth } from '@/auth/useAuth';
/*import { useWebSocket } from '@/hooks/useWebSocket';*/
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '@/hooks/useWebSocket';

interface Notification {
  id: number;
  type: string;
  fromUser: FromUser;
  title: string;
  message: string;
  opened: boolean;
  createdAt: string;
  readAt?: string;
  document: Document;
  forSigning?: boolean;
}


interface Document {
  comment: string;
  id: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: string;
  status: string;
  uploadedAt: string;
  ownerDetails?: {
    id: string;
    username: string;
    email: string;
  };
  sharedToUsers?: Array<{
    id: string;
    username: string;
    email: string;
    permission?: 'view' | 'view_and_sign';
    step?: number;
    hasSigned?: boolean;
  }>;
  availableForSigning?: boolean;
  availableForViewing?: boolean;
  permission?: 'view' | 'view_and_sign';
  downloadable?: boolean;
  signerSteps?: SignerStep[];
  currentSignerIndex?: number;
}

interface SignerStep {
  dsId: {
    documentId: number,
    userId: number
  },
  step: number;
  userId: string;
  user?: UserType;
  hasSigned?: boolean;
  signedAt?: string;
  parallel?: boolean;
  parallelGroup?: number;
  permission?: string;
  decline?: boolean;
  proceedNext?: boolean;
}

interface UserType {
  id: string;
  username: string;
  email: string;
  roles?: string[] | Array<{ id: number; name: string }>;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  offset: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

interface FromUser {
  id: number;
  username: string;
}

interface NotificationModalProps {
  notification: Notification | null;
  isOpen: boolean;
  document?: Document;
  onClose: () => void;
  onMarkAsRead: (id: number) => void;
  onDecline?: (notificationId: number) => void;
}


const MessageWithLinks: React.FC<{ text: string; className?: string }> = ({ text, className }) => {


  // First, decode HTML entities
  const decodeHtmlEntities = (str: string) => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = str;
    return textarea.value;
  };

  // Function to safely parse and render HTML content
  const renderMessageContent = (content: string) => {
    const decodedText = decodeHtmlEntities(content);

    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = decodedText;

    let keyCounter = 0;

    const processNode = (node: Node): React.ReactNode => {
      if (node.nodeType === Node.TEXT_NODE) {
        // Process text nodes for URLs
        const text = node.textContent || '';
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);

        if (parts.length === 1) return text;

        return parts.map((part) => {
          if (urlRegex.test(part)) {
            return (
              <a
                key={keyCounter++}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline hover:text-blue-800 break-all"
                onClick={(e) => e.stopPropagation()}
              >
                {part}
              </a>
            );
          }
          return part;
        });
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();

        // Handle anchor tags
        if (tagName === 'a') {
          const href = element.getAttribute('href') || '#';
          const children = Array.from(element.childNodes).map(child =>
            processNode(child)
          );

          return (
            <a
              key={keyCounter++}
              href={href}
              target={href !== '#' ? "_blank" : undefined}
              rel={href !== '#' ? "noopener noreferrer" : undefined}
              className="text-blue-600 underline hover:text-blue-800 break-all"
              onClick={(e) => {
                e.stopPropagation();
                if (href === '#') {
                  e.preventDefault();
                  // Handle # links if needed
                }
              }}
            >
              {children}
            </a>
          );
        }

        // For other HTML tags, render them with their children
        const children = Array.from(element.childNodes).map(child =>
          processNode(child)
        );

        // Return as React element if it's a safe tag
        const safeTags = ['strong', 'em', 'b', 'i', 'span', 'br'];
        if (safeTags.includes(tagName)) {
          return React.createElement(tagName, { key: keyCounter++ }, children);
        }

        // For unsupported tags, just return the children as text
        return children;
      }

      return null;
    };

    return Array.from(tempDiv.childNodes).map(child => processNode(child));
  };

  return (
    <p className={className}>
      {renderMessageContent(text)}
    </p>
  );
};

const NotificationModal: React.FC<NotificationModalProps> = ({
  notification,
  isOpen,
  onClose,
  onMarkAsRead,
  onDecline
}) => {
  const [declineRemark, setDeclineRemark] = useState('');  // ← add this
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!notification) return null;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setDeclineRemark('');  // ← add this
      onClose();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'document_shared':
        return <Share2 className="w-6 h-6 text-blue-600" />;
      case 'document_forwarded':
        return <Send className="w-6 h-6 text-purple-600" />;
      case 'signature_request':
        return <FileText className="w-6 h-6 text-amber-600" />;
      case 'signature_completed':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'document_unshared':
        return <X className="w-6 h-6 text-red-600" />;
      case 'user_mentioned':
        return <Users className="w-6 h-6 text-indigo-600" />;
      default:
        return <Bell className="w-6 h-6 text-gray-600" />;
    }
  };

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'document_shared':
        return 'bg-blue-100';
      case 'document_forwarded':
        return 'bg-purple-100';
      case 'signature_request':
        return 'bg-amber-100';
      case 'signature_completed':
        return 'bg-green-100';
      case 'document_unshared':
        return 'bg-red-100';
      case 'user_mentioned':
        return 'bg-indigo-100';
      default:
        return 'bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  const handleDecline = async () => {
    
    if (!declineRemark.trim()) {
      toast.error('Please enter a reason for declining.');
      return;
    }

    const payload = {
      documentSharedId: notification.document.signerSteps?.find(step => step.userId === user?.id)?.dsId,
      signerId: user?.id,
      ownerId: notification.document.ownerDetails?.id,
      remarks: declineRemark
    }
    try {
      const response = await api.put('/v2/documents/decline', payload);
      if (response.status === 200) {
        toast.success('Success declined.');
        onDecline?.(notification.id);
      }

    } catch (error) {
      console.error('Error declining signature request:', error);
    }

    setDeclineRemark('');
    onClose();
  };


  const isNextSigner = (doc: Document, currentUserId?: string | number): boolean => {
    if (!currentUserId) return false;

    const currentUserIdStr = String(currentUserId);

    const userSignerStep = doc.signerSteps?.find(step => {
      const stepUserId = String(step.user?.id);
      return stepUserId === currentUserIdStr && step.permission === 'view_and_sign';
    });

    if (!userSignerStep) {
      // Check if user has view permission only
      const userViewStep = doc.signerSteps?.find(step => {
        const stepUserId = String(step.user?.id);
        return stepUserId === currentUserIdStr && step.permission === 'view';
      });

      if (userViewStep) {
        return false;
      }
      return false;
    }

    if (userSignerStep.hasSigned) {
      return false;
    }

    // Check turn-based signing
    if (doc.signerSteps && doc.signerSteps.length > 0) {
      const pendingSignerSteps = doc.signerSteps
        .filter(step => step.permission === 'view_and_sign' && !step.hasSigned)
        .sort((a, b) => a.step - b.step);

      const activeStep = pendingSignerSteps[0]?.step;

      if (activeStep !== undefined && userSignerStep.step !== activeStep) {

        return false;
      }
    }

    return true;
  };

  const openSignDialog = (doc: Document) => {
    navigate('/sign', { state: { document: doc, origin: "/notifications" } });
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] sm:w-full max-w-2xl bg-white rounded-xl shadow-xl z-50 max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-4 sm:mb-6">
              <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                <div className={`p-2 sm:p-3 rounded-lg shrink-0 ${getNotificationBgColor(notification.type)}`}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="min-w-0">
                  <Dialog.Title className="text-base sm:text-xl font-bold text-[#19183B] leading-tight">
                    {notification.title}
                  </Dialog.Title>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                    {formatDate(notification.createdAt)}
                  </p>
                  <span className={`text-xs sm:text-xs text-white px-2 py-1 rounded ${notification.opened ? ' bg-green-500' : 'bg-blue-500'}`}>
                    {notification.opened ? 'Read' : 'Unread'}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
              >
                <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
              </button>
            </div>

            {/* Sender Information */}
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-white rounded-lg border shrink-0">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-700">From</p>
                  <p className="text-sm sm:text-base font-semibold text-[#19183B]">
                    {notification.fromUser?.username || 'Unknown User'}
                  </p>
                </div>
              </div>
            </div>

            {/* Message Content */}
            <div className="mb-4 sm:mb-6">
              <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Message</h3>
              <div className="p-3 sm:p-4 bg-gray-50 rounded-lg min-h-[80px] sm:min-h-[100px]">
                <MessageWithLinks
                  text={notification.message}
                  className="text-sm sm:text-base text-gray-800 whitespace-pre-wrap"
                />
              </div>

              {(() => {
                const hasDeclined = notification.document.signerSteps?.some(
                  step => step.userId === user?.id && step.permission === 'view_and_sign' && step.decline
                );

                if (!hasDeclined && notification.forSigning && isNextSigner(notification.document, user?.id)) {
                  return (
                    <div className='flex flex-row gap-4'>
                      <div className='basis-1/3'>
                        <button
                          onClick={() => openSignDialog(notification.document)}
                          className="mt-2 w-full justify-center flex items-center gap-1.5 px-3 py-1.5 text-sm border border-green-300 text-green-600 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <PenTool className="w-3.5 h-3.5" /> Sign
                        </button>
                        <button
                          onClick={handleDecline}
                          className="mt-2 w-full flex justify-center items-center gap-1.5 px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <X className="w-3.5 h-3.5" /> Decline to sign
                        </button>

                      </div>
                      <div className='basis-2/3'>
                        <p className="text-xs text-gray-400">What are your reason for declining to sign this document?</p>
                        <textarea
                          value={declineRemark}
                          onChange={(e) => setDeclineRemark(e.target.value)}
                          maxLength={500}
                          rows={4}
                          placeholder="e.g. The terms on page 3 need revision before I can sign…"
                          className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg p-3 resize-y focus:outline-none focus:border-gray-400 bg-gray-50"
                        />
                      </div>
                    </div>
                  )
                }
              })()}

            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 sm:gap-3 pt-4 sm:pt-6 border-t">
              {!notification.opened && (
                <button
                  onClick={() => {
                    onMarkAsRead(notification.id);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Mark as Read
                </button>
              )}

              <button
                onClick={onClose}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 0,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    offset: 0,
    hasNext: false,
    hasPrevious: false,
  });


  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!user?.id) return;

      const params = {
        page: currentPage,
        limit: itemsPerPage,
        offset: currentPage * itemsPerPage,
        user_id: user?.id,
        user_roles: user?.roles || [],
        search: searchQuery || undefined,
        sortBy: 'createdAt',
        sortDirection: 'desc'
      };

      const response = await api.get("/v1/notifications", { params });
      const data = response.data;

      setNotifications(data.data || []);
      setPagination({
        currentPage: data.pagination.currentPage ?? 0,
        totalItems: data.pagination.totalItems ?? 0,
        totalPages: data.pagination.totalPages ?? 1,
        itemsPerPage: data.pagination.itemsPerPage ?? 10,
        offset: data.pagination.offset ?? 0,
        hasNext: data.pagination.hasNext ?? false,
        hasPrevious: data.pagination.hasPrevious ?? false,
      });

      const unreadResponse = await api.get(`v1/notifications/unread-count/${user.id}`);
      setTotalUnreadCount(unreadResponse.data);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error(`Error fetching notifications: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery, user?.id]);


  // ✅ 2. Ref to always have the latest loadNotifications inside onMessage
  const loadNotificationsRef = useRef(loadNotifications);
  useEffect(() => {
    loadNotificationsRef.current = loadNotifications;
  }, [loadNotifications]);

  // ✅ Track previous count to detect new notifications vs reads/deletes
  const prevUnreadCountRef = useRef<number>(0);

  // ✅ 3. Single useWebSocket call — uses ref inside onMessage
  const { isConnected } = useWebSocket({
    autoConnect: true,
    topics: user?.id ? [`/topic/notifications/${user.id}`] : [],
    onMessage: (_topic, message) => {
      let count: number;
      if (typeof message === 'number') {
        count = message;
      } else if (typeof message === 'object' && message !== null && 'count' in message) {
        count = Number(message.count);
      } else {
        count = Number(message);
      }

      if (isNaN(count)) return;

      const prev = prevUnreadCountRef.current;
      prevUnreadCountRef.current = count;
      setTotalUnreadCount(count);

      // ✅ Only refetch list when a NEW notification arrives (count went up)
      // When count goes down it means read/delete — already handled locally
      if (count > prev) {
        console.log(`🔔 New notification detected (${prev} → ${count}), refreshing list`);
        loadNotificationsRef.current();
      }
    },
    onConnect: () => console.log('✅ WebSocket connected on Notifications page'),
    onError: (error) => console.error('❌ WebSocket error:', error),
  });


  // ✅ loadNotifications now correctly re-runs when deps change
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // ✅ Keep prevUnreadCountRef in sync after initial load
  useEffect(() => {
    prevUnreadCountRef.current = totalUnreadCount;
  }, [totalUnreadCount]);

  // Filter notifications based on read status
  const filteredNotifications = notifications.filter((notif) => {
    const matchesSearch =
      notif.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notif.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notif.fromUser?.username?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterType === 'all' ? true :
        filterType === 'unread' ? !notif.opened :
          notif.opened;

    return matchesSearch && matchesFilter;
  });

  const unreadCount = notifications.filter(n => !n.opened).length;

  // Mark notification as read
  const markAsRead = async (notificationId: number) => {
    try {
      await api.patch(`/v1/notifications/${notificationId}/read`);

      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId
            ? { ...notif, opened: true, readAt: new Date().toISOString() }
            : notif
        )
      );

      setTotalUnreadCount(prev => Math.max(0, prev - 1));
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await api.patch('/v1/notifications/mark-all-read', {
        userId: user?.id
      });

      setNotifications(prev =>
        prev.map(notif => ({
          ...notif,
          opened: true,
          readAt: new Date().toISOString()
        }))
      );

      setTotalUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: number) => {
    try {
      await api.delete(`/v1/notifications/${notificationId}`);

      const deletedNotif = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      setSelectedItems(prev => prev.filter(id => id !== notificationId));

      if (deletedNotif && !deletedNotif.opened) {
        setTotalUnreadCount(prev => Math.max(0, prev - 1));
      }

      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  // Delete selected notifications
  const deleteSelected = async () => {
    if (selectedItems.length === 0) return;

    try {
      await Promise.all(
        selectedItems.map(id => api.delete(`/v1/notifications/${id}`))
      );

      const deletedUnreadCount = notifications.filter(
        n => selectedItems.includes(n.id) && !n.opened
      ).length;

      setNotifications(prev => prev.filter(notif => !selectedItems.includes(notif.id)));
      setSelectedItems([]);
      setTotalUnreadCount(prev => Math.max(0, prev - deletedUnreadCount));

      toast.success(`Deleted ${selectedItems.length} notification(s)`);
    } catch (error) {
      console.error('Error deleting notifications:', error);
      toast.error('Failed to delete notifications');
    }
  };

  // Toggle item selection
  const toggleItemSelection = (id: number) => {
    setSelectedItems(prev =>
      prev.includes(id)
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedItems([]);
  };

  // Open notification modal
  const openNotificationModal = (notification: Notification) => {
    setSelectedNotification(notification);
    setIsModalOpen(true);

    // Auto-mark as read if unopened
    if (!notification.opened) {
      markAsRead(notification.id);
    }
  };

  // Close notification modal
  const closeNotificationModal = () => {
    setIsModalOpen(false);
    setSelectedNotification(null);
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'document_shared':
        return <Share2 className="w-5 h-5 text-blue-600" />;
      case 'document_forwarded':
        return <Send className="w-5 h-5 text-purple-600" />;
      case 'signature_request':
        return <FileText className="w-5 h-5 text-amber-600" />;
      case 'signature_completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'document_unshared':
        return <X className="w-5 h-5 text-red-600" />;
      case 'user_mentioned':
        return <Users className="w-5 h-5 text-indigo-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  // Get notification background color based on type
  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'document_shared':
        return 'bg-blue-50';
      case 'document_forwarded':
        return 'bg-purple-50';
      case 'signature_request':
        return 'bg-amber-50';
      case 'signature_completed':
        return 'bg-green-50';
      case 'document_unshared':
        return 'bg-red-50';
      case 'user_mentioned':
        return 'bg-indigo-50';
      default:
        return 'bg-gray-50';
    }
  };

  // Format relative date
  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };





  const handleDeclineUpdate = (notificationId: number) => {
    setNotifications(prev =>
      prev.map(notif => {
        if (notif.id !== notificationId) return notif;
        return {
          ...notif,
          document: {
            ...notif.document,
            signerSteps: notif.document.signerSteps?.map(step =>
              step.userId === user?.id
                ? { ...step, decline: true }
                : step
            )
          }
        };
      })
    );
  };



  return (
    <>
      <div className="relative min-h-screen bg-[#E7F2EF] p-8">
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat filter blur-md"
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}background.jpg)` }}
        />
        <div className="absolute inset-0 bg-black/30"></div>

        <div className="relative max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6 border border-[#A1C2BD]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-[#A1C2BD] rounded-lg relative shrink-0">
                  <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-[#19183B]" />
                  {totalUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-3xl font-bold text-[#19183B] truncate">Notifications</h1>
                  <p className="text-xs sm:text-sm text-[#708993]">
                    Stay updated with your document activities
                    {isConnected && <span className="ml-2 text-green-600 hidden">● Live</span>}
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                <button
                  onClick={markAllAsRead}
                  disabled={totalUnreadCount === 0}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-[#19183B] text-white rounded-lg hover:bg-[#708993] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  Mark all as read
                </button>
              </div>
            </div>
          </div>

          {/* Selection Bar */}
          {selectedItems.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-[#A1C2BD]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-900">
                      {selectedItems.length} selected
                    </span>
                  </div>
                  <button
                    onClick={clearSelection}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Deselect all
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={deleteSelected}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete selected
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6 border border-[#A1C2BD]">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-[#708993]" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] focus:border-[#708993] outline-none transition-all"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label className="text-sm font-semibold text-[#19183B] whitespace-nowrap">Filter:</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'all' | 'unread' | 'read')}
                  className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-[#A1C2BD] rounded-xl bg-white focus:ring-2 focus:ring-[#708993] outline-none transition-all cursor-pointer"
                >
                  <option value="all">All ({notifications.length})</option>
                  <option value="unread">Unread ({unreadCount})</option>
                  <option value="read">Read ({notifications.length - unreadCount})</option>
                </select>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label className="text-sm font-semibold text-[#19183B] whitespace-nowrap">Show:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(0);
                  }}
                  className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-[#A1C2BD] rounded-xl bg-white focus:ring-2 focus:ring-[#708993] outline-none transition-all cursor-pointer"
                >

                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="bg-white rounded-xl shadow-sm border border-[#A1C2BD] overflow-hidden">
            <div className="p-3 sm:p-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 sm:py-20">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-[#A1C2BD] border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-sm sm:text-base text-[#708993]">Loading notifications...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-[#708993]">
                  <Bell className="w-12 h-12 sm:w-16 sm:h-16 mb-4 opacity-50" />
                  <p className="text-base sm:text-lg mb-2 text-center px-4">
                    {searchQuery ? 'No notifications found' : 'No notifications yet'}
                  </p>
                  <p className="text-xs sm:text-sm text-center px-4">
                    {searchQuery
                      ? 'Try adjusting your search or filter'
                      : 'When you receive notifications, they will appear here'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {filteredNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`flex items-start gap-2 sm:gap-4 p-3 sm:p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${notif.opened
                        ? 'bg-white border-gray-200'
                        : 'bg-blue-50 border-blue-300'
                        } ${selectedItems.includes(notif.id) ? 'ring-2 ring-blue-500' : ''}`}
                      onClick={(e) => {
                        if (!(e.target as HTMLElement).closest('button, [role="checkbox"]')) {
                          openNotificationModal(notif);
                        }
                      }}
                    >
                      {/* Checkbox */}
                      <Checkbox.Root
                        checked={selectedItems.includes(notif.id)}
                        onCheckedChange={() => toggleItemSelection(notif.id)}
                        className="w-4 h-4 sm:w-5 sm:h-5 mt-1 bg-white border-2 border-gray-300 rounded flex items-center justify-center data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox.Indicator>
                          <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                        </Checkbox.Indicator>
                      </Checkbox.Root>

                      {/* Icon */}
                      <div className={`p-2 sm:p-3 rounded-lg shrink-0 ${getNotificationBgColor(notif.type)}`}>
                        {getNotificationIcon(notif.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-2 mb-1 sm:mb-2">
                          <div className="min-w-0">
                            <h3 className={`text-sm sm:text-base font-semibold truncate ${notif.opened ? 'text-gray-900' : 'text-[#19183B]'}`}>
                              {notif.title}
                            </h3>
                            <div className="flex items-center gap-1 mt-0.5 text-xs sm:text-sm text-gray-600">
                              <User className="w-3 h-3 shrink-0" />
                              <span className="truncate">From: {notif.fromUser?.username || 'Unknown User'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap shrink-0">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span className="hidden sm:inline">{formatRelativeDate(notif.createdAt)}</span>
                            <span className="sm:hidden">{formatRelativeDate(notif.createdAt).split(' ').slice(0, 2).join(' ')}</span>
                          </div>
                        </div>

                        {/* Message preview */}
                        <MessageWithLinks
                          text={notif.message}
                          className={`text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2 ${notif.opened ? 'text-gray-600' : 'text-gray-900'}`}
                        />

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          {!notif.opened && (
                            <button
                              onClick={() => markAsRead(notif.id)}
                              className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium text-blue-600 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                            >
                              <Eye className="w-3 h-3" />
                              <span className="hidden sm:inline">Mark as read</span>
                              <span className="sm:hidden">Read</span>
                            </button>
                          )}

                          <button
                            onClick={() => deleteNotification(notif.id)}
                            className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium text-red-600 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                          {notif.opened && notif.readAt && (
                            <span className="text-xs text-gray-400 ml-auto hidden sm:inline">
                              Read {formatRelativeDate(notif.readAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="border-t border-[#A1C2BD] p-3 sm:p-6 bg-[#E7F2EF]/30">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs sm:text-sm text-[#708993] order-2 sm:order-1">
                    Page {pagination.currentPage + 1} of {pagination.totalPages} • {pagination.totalItems} items
                  </p>
                  <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                      disabled={!pagination.hasPrevious}
                      className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border-2 border-[#A1C2BD] text-[#19183B] rounded-lg font-semibold hover:bg-[#A1C2BD] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum;
                        if (pagination.totalPages <= 5) {
                          pageNum = i;
                        } else if (currentPage <= 2) {
                          pageNum = i;
                        } else if (currentPage >= pagination.totalPages - 3) {
                          pageNum = pagination.totalPages - 5 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg text-xs sm:text-sm font-medium ${currentPage === pageNum
                              ? 'bg-[#19183B] text-white'
                              : 'border border-[#A1C2BD] text-[#19183B] hover:bg-[#A1C2BD] hover:text-white'
                              }`}
                          >
                            {pageNum + 1}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(pagination.totalPages - 1, prev + 1))}
                      disabled={!pagination.hasNext}
                      className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border-2 border-[#A1C2BD] text-[#19183B] rounded-lg font-semibold hover:bg-[#A1C2BD] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notification Detail Modal */}
      <NotificationModal
        notification={selectedNotification}
        isOpen={isModalOpen}
        onClose={closeNotificationModal}
        onMarkAsRead={markAsRead}
        onDecline={handleDeclineUpdate}  // ← pass it here
      />
    </>
  );
};

export default Notifications;