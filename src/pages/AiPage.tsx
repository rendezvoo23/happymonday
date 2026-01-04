import { useState, useRef, useEffect } from "react";
import { Bot } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { MessageBubble } from "@/components/ai/MessageBubble";
import { ChatInput } from "@/components/ai/ChatInput";

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export function AiPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "Hi! I'm your personal AI financial assistant. I can help you analyze your spending, suggest budgets, or answer questions about your finances."
        }
    ]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = (content: string) => {
        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content
        };
        setMessages(prev => [...prev, userMsg]);

        // Mock AI response
        setTimeout(() => {
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I'm a demo AI for now, but soon I'll be connected to a real brain! I see you're interested in: " + content
            };
            setMessages(prev => [...prev, aiMsg]);
        }, 1000);
    };

    return (
        <PageShell className="flex flex-col h-[calc(100vh-6rem)]">
            <header className="flex flex-col items-center pt-4 pb-6 shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                    <Bot className="w-6 h-6 text-blue-600" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900">AI Assistant</h1>
            </header>

            <main className="flex-1 overflow-y-auto px-2 pb-4 no-scrollbar">
                {messages.map((msg) => (
                    <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
                ))}
                <div ref={messagesEndRef} />
            </main>

            <div className="shrink-0 pt-2">
                <ChatInput onSend={handleSend} />
            </div>
        </PageShell>
    );
}
