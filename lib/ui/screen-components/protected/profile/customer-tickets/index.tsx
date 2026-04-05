"use client";
import { useState, useEffect } from "react";
import TextComponent from "@/lib/ui/useable-components/text-field";
import CustomButton from "@/lib/ui/useable-components/button";
import { useAuth } from "@/lib/context/auth/auth.context";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import TicketSkeleton from "@/lib/ui/useable-components/custom-skeletons/ticket.skeleton";
import useToast from "@/lib/hooks/useToast";
import TicketChatModal from "@/lib/ui/useable-components/ticket-chat-modal";
import { useTranslations } from "next-intl";

// Defined types for tickets
interface ITicket {
  id: string;
  subject: string;
  status: string;
  message: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export default function CustomerTicketsMain() {
  const t = useTranslations()
  const router = useRouter();
  const { showToast } = useToast();
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [isChatModalVisible, setIsChatModalVisible] = useState<boolean>(false);
  
  const { user } = useAuth();
  const [tickets, setTickets] = useState<ITicket[]>([]);
  const [isTicketsLoading, setIsTicketsLoading] = useState(true);
  const [ticketsError, setTicketsError] = useState<any>(null);

  const userName = user?.name || "User";
  const userId = user?.id;

  const fetchTickets = async () => {
    if (!userId) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (err: any) {
      setTicketsError(err);
      showToast({
        type: "error",
        title: "Error",
        message: err.message || "Failed to fetch tickets"
      });
    } finally {
      setIsTicketsLoading(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [userId]);

  const refetchTickets = fetchTickets;
  
  const [isLoading, setIsLoading] = useState(false);
  // Get tickets from state
  const sortedTickets = tickets;
  
  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      return "unknown date";
    }
  };
  
  // Get status color based on ticket status
  const getStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
      case 'open':
        return 'text-blue-600 bg-blue-100';
      case 'inprogress':
        return 'text-yellow-600 bg-yellow-100';
      case 'closed':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };
  
  // Handle opening the chat modal
  const handleOpenChat = (ticketId: string) => {
    setSelectedTicket(ticketId);
    setIsChatModalVisible(true);
  };
  
  // Handle closing the chat modal
  const handleCloseChat = () => {
    // Refetch tickets to get any updates when modal closes
    refetchTickets();
    setIsChatModalVisible(false);
  };
  
  // Handle creating a new ticket
  const handleCreateTicket = () => {
    router.push('/profile/getHelp');
  };

  // Effect to refresh tickets periodically while viewing them
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!isChatModalVisible) {
        refetchTickets();
      }
    }, 30000); // Refresh every 30 seconds when not in chat
    
    return () => clearInterval(intervalId);
  }, [refetchTickets, isChatModalVisible]);

  // Show loading state
  if (isTicketsLoading || isLoading) {
    return <TicketSkeleton count={3} />;
  }
  
  // Show error state
  if (ticketsError) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm text-center">
        <TextComponent text={t('error_loading_tickets')} className="text-lg text-red-500 mb-2" />
        <p className="text-gray-500 mb-4">{t('tickets_fetch_error_message')}</p>
        <CustomButton 
          label={t('retry_button')}
          onClick={() => window.location.reload()}
          className="bg-primary-color text-white px-4 py-2 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="w-full mx-auto">
      <div className="mb-6">
        <TextComponent 
          text={`${t('welcome_user')} ${userName} 👋`}
          className="text-xl md:text-2xl font-bold mb-2 dark:text-white"
        />
        <div className="flex justify-between items-center">
          <TextComponent text={t("your_customer_support_tickets_label")} className="text-xl md:text-2xl font-semibold dark:text-gray-200" />
        </div>
      </div>
      
      {sortedTickets.length > 0 ? (
        <div className="space-y-4">
          {sortedTickets.map((ticket) => (
            <div key={ticket._id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <TextComponent text={ticket.subject} className="font-medium text-lg text-gray-800 dark:text-gray-100" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('ticket_id_label')} {ticket.id}</p>
                </div>
                <span className={`${getStatusColor(ticket.status)} px-3 py-1 rounded-full text-sm font-medium`}>
                  {ticket.status === 'inProgress' ? t('in_progress_status_label') : 
                   ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                <p> {t('created_label')} {formatDate(ticket.created_at)}</p>
                <p>{t('last_updated_label')} {formatDate(ticket.updated_at)}</p>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                <CustomButton 
                   label={t("view_messages_button")}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300  bg-transparent"
                  onClick={() => handleOpenChat(ticket.id)}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm text-center">
          <TextComponent text={t("no_tickets_found_label")} className="text-lg text-gray-500 dark:text-gray-400 mb-2" />
          <p className="text-gray-500 dark:text-gray-400 mb-4"> {t('no_support_tickets_yet_message')}</p>
          <CustomButton 
            label={t("create_first_ticket_button")}
            onClick={handleCreateTicket}
            className="bg-primary-color text-white px-4 py-2 rounded-full"
          />
        </div>
      )}
      
      {/* Chat Modal */}
      {selectedTicket && (
        <TicketChatModal
          visible={isChatModalVisible}
          onHide={handleCloseChat}
          ticketId={selectedTicket}
        />
      )}
    </div>
  );
}