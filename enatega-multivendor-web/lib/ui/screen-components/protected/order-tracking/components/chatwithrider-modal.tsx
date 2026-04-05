import React, { useEffect, useState } from "react";
import { Dialog } from "primereact/dialog";
import { supabase } from "@/lib/supabase";
// @ts-ignore
import { MessageBox } from "react-chat-elements";
import { useTranslations } from "next-intl";

interface Message {
  _id: string;
  text: string;
  createdAt: string;
  user: {
    _id: string;
    name: string;
  };
}

interface ChatWithRiderModalProps {
  visible: boolean;
  onHide: () => void;
  orderId: string;
  currentUserId: string;
}

function ChatWithRiderModal({
  visible,
  onHide,
  orderId,
  currentUserId,
}: ChatWithRiderModalProps) {
  const t = useTranslations()
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");

  // Load chat history and subscribe to new messages
  useEffect(() => {
    if (!visible) return;

    const fetchChatHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (data) {
          const formattedMessages = data.map((msg: any) => ({
            _id: msg.id,
            text: msg.message,
            createdAt: msg.created_at,
            user: {
              _id: msg.sender_id,
              name: msg.sender_name || (msg.sender_id === currentUserId ? "You" : "Rider"),
            },
          }));
          setMessages(formattedMessages);
        }
      } catch (err) {
        console.error("Error fetching chat history:", err);
      }
    };

    fetchChatHistory();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          const newMsg = payload.new;
          const formattedMsg: Message = {
            _id: newMsg.id,
            text: newMsg.message,
            createdAt: newMsg.created_at,
            user: {
              _id: newMsg.sender_id,
              name: newMsg.sender_name || (newMsg.sender_id === currentUserId ? "You" : "Rider"),
            },
          };
          setMessages((prev) => [...prev, formattedMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [visible, orderId, currentUserId]);

  // Handle sending a message
  const handleSend = async () => {
    if (!inputMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          order_id: orderId,
          sender_id: currentUserId,
          sender_name: "You",
          message: inputMessage.trim()
        });

      if (error) throw error;
      setInputMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      modal
      className="w-full max-w-xs mx-0 relative"
      contentClassName="pb-6 m-0"
      showHeader={false}
      closable
      dismissableMask
      style={{
        backgroundColor: "white",
        borderRadius: "10px",
        boxShadow: "0 0 10px 0 rgba(0, 0, 0, 0.1)",
        height: "80vh",
        overflow: "hidden",
        position: "fixed",
        bottom: "20px",
        right: "20px",
      }}
    >
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center bg-primary-color text-white p-2">
          <div>{t("chat_with_rider_button")}</div>
          <button onClick={onHide}>
            <i className="pi pi-times" style={{ fontSize: "1rem" }}></i>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-2">
          {messages.map((msg: Message) => (
            <div key={msg._id} className="mb-2">
              <MessageBox
                type="text"
                text={msg.text}
                date={new Date(msg.createdAt)}
                id={msg._id}
                title={msg.user.name}
                titleColor={msg.user._id === currentUserId ? "green" : "black"}
                position={msg.user._id === currentUserId ? "right" : "left"}
                className={
                  msg.user._id === currentUserId
                    ? "message-left"
                    : "message-right"
                }
                focus={false}
                forwarded={false}
                replyButton={false}
                removeButton={false}
                notch={true}
                retracted={false}
                status="read"
              />
            </div>
          ))}
        </div>

        {/* Input Area */}

        <div className="flex gap-2 p-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={t("type_a_message_placeholder")}
            className="flex-1 border rounded p-2 focus:outline-none"
          />
          <button onClick={handleSend}>
          <i className="pi  pi-send" ></i>
          </button >
        </div>
      </div>
    </Dialog>
  );
}

export default ChatWithRiderModal;
