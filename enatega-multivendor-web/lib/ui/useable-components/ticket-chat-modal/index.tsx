import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/context/auth/auth.context";
import { supabase } from "@/lib/supabase";
import { Dialog } from "primereact/dialog";
import useToast from "@/lib/hooks/useToast";
import ChatSkeleton from "../custom-skeletons/chat-skeleton";

interface ITicketChatModalProps {
  visible: boolean;
  onHide: () => void;
  ticketId: string;
}

export default function TicketChatModal({
  visible,
  onHide,
  ticketId,
}: ITicketChatModalProps) {
  const { showToast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  
  // Create a polling interval reference
  const pollingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { user } = useAuth();
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const fetchTicketDetails = async () => {
    if (!ticketId) return;
    try {
      setTicketLoading(true);
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();
      
      if (error) throw error;
      setTicket(data);
    } catch (err: any) {
      console.error("Error fetching ticket:", err);
    } finally {
      setTicketLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!ticketId) return;
    try {
      const { data, error } = await supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err: any) {
      console.error("Error fetching messages:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!ticketId || !user?.id) return;
    try {
      const { error } = await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: ticketId,
          content: content,
          sender_id: user.id,
          sender_type: 'user'
        });

      if (error) throw error;
      fetchMessages();
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Error",
        message: err.message || "Failed to send message",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Start polling when modal is visible
  useEffect(() => {
    if (visible && ticketId) {
      fetchTicketDetails();
      fetchMessages();
      
      // Start polling for messages every 5 seconds
      pollingIntervalRef.current = setInterval(() => {
        fetchMessages();
      }, 5000);
    } else {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [visible, ticketId]);

  useEffect(() => {
    if (messagesEndRef.current && visible) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, visible]);

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 
        ' ' + date.toLocaleDateString();
    } catch (error) {
      return "unknown time";
    }
  };
  
  // Handle sending a message
  const handleSendMessage = () => {
    if (!message.trim() || isSending) return;
    
    setIsSending(true);
    sendMessage(message.trim());
    setMessage("");
  };
  
  // Handle enter key for sending message
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isClosed = ticket?.status === 'closed';

  // Get ticket title
  const getTicketTitle = () => {
    if (!ticket) return "Support Chat";
    
    if (ticket.category === "order related" && ticket.order_id) {
      return `Order Issue - ${ticket.order_id}`;
    }
    
    return ticket.subject;
  };

   // get the RTL direction
   const direction = document.documentElement.getAttribute("dir") || "ltr";

  return (
    <Dialog
      visible={visible}
      onHide={() => {
        // Stop polling before closing
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        onHide();
      }}
      style={{ width: "500px" }}
      className="p-0 m-0"
      contentClassName="p-0"
      showHeader={false}
      modal
      resizable={false}
      draggable={false}
      closable={false}
      closeOnEscape
    >
      <div className="flex flex-col md:h-[600px] h-[500px]">
        {/* Header */}
        <div className="flex justify-between items-center bg-[#1a1a1a] text-white p-4">
          <div className="flex-1">
            <h3 className="font-medium">{getTicketTitle()}</h3>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs ${
                  ticket?.status === "open"
                    ? "text-blue-300"
                    : ticket?.status === "inProgress"
                      ? "text-yellow-300"
                      : "text-gray-300"
                }`}
              >
                {ticket?.status === "inProgress"
                  ? "In Progress"
                  : ticket?.status?.charAt(0).toUpperCase() +
                    ticket?.status?.slice(1)}
              </span>
            </div>
          </div>
          <button 
            onClick={() => {
              // Stop polling before closing
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              onHide();
            }} 
            className="text-white hover:text-gray-300"
          >
            <span className="sr-only">Close</span>✕
          </button>
        </div>

        {/* Fixed Ticket Description Section (non-scrollable) */}
        {ticket?.description && (
          <div className="border-b border-gray-200 dark:border-gray-600 p-3 bg-gray-50 dark:text-white dark:bg-gray-700">
            <div className="text-xs font-medium text-gray-500 mb-1 dark:text-white">
              Ticket Description:
            </div>
            <p className="text-sm text-gray-700 dark:text-white">{ticket.message}</p>
            <div className="text-xs text-right mt-1 text-gray-500 dark:text-white">
              {formatTimestamp(ticket?.created_at || Date.now().toString())}
            </div>
          </div>
        )}

        {/* Messages Area (scrollable) */}
        <div className="flex-1 p-4 overflow-y-auto bg-white dark:bg-gray-800 dark:text-white">
          {loading || ticketLoading ? (
            <ChatSkeleton />
          ) : error ? (
            <div className="flex justify-center items-center h-full">
              <p className="text-red-500">Failed to load messages</p>
            </div>
          ) : messages.length > 0 ? (
            <div className="space-y-4">
              {/* Messages in chronological order (oldest first) */}
              {[...messages].map((msg) => {
                // Skip messages that match description
                if (msg.content.trim() === ticket?.message?.trim()) {
                  return null;
                }
                
                // User's own messages are green and on right, admin messages are gray on left
                const isUserMessage = msg.sender_type === "user";
                return (
                  <div
                    key={msg.id}
                    className={`rounded-lg p-3 max-w-[80%] ${
                      isUserMessage
                        ? "bg-primary-color text-white ml-auto" 
                        : "bg-gray-100 text-gray-800 mr-auto"
                    }`}
                  >
                    <p className="break-words">{msg.content}</p>
                    <div className="text-xs mt-1 text-right">
                      {formatTimestamp(msg.created_at)}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex justify-center items-center h-full">
              <p className="text-gray-500">No messages yet</p>
            </div>
          )}
        </div>

        {/* Input Area */}
        {isClosed ? (
          <div className="p-4 border-t border-gray-200 bg-gray-50 dark:bg-gray-800 dark:text-white text-center">
            <p className="text-gray-500">
              This ticket is closed. You cannot send new messages.
            </p>
          </div>
        ) : (
          <div className="p-4 border-t border-gray-200 bg-white dark:bg-gray-800 dark:text-white">
            <div className="flex gap-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your message here..."
                className="flex-1 p-3 border dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-color resize-none"
                rows={2}
                disabled={isSending}
              />
              <button
                onClick={handleSendMessage}
                disabled={!message.trim() || isSending}
                className={`bg-primary-color ${direction === "rtl" ? "rounded-l-md" : "rounded-r-md"} p-2 text-white flex items-center justify-center ${
                  !message.trim() || isSending
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-primary-dark"
                }`}
              >
                {direction === "rtl" ? (
                  isSending ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                      />
                    </svg>
                  )
                ) : isSending ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}