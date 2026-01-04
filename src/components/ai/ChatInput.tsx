import { useState } from "react";
import { Send, Mic } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface ChatInputProps {
    onSend: (message: string) => void;
}

export function ChatInput({ onSend }: ChatInputProps) {
    const [message, setMessage] = useState("");

    const handleSend = () => {
        if (!message.trim()) return;
        onSend(message);
        setMessage("");
    };

    return (
        <div className="flex items-center gap-2 p-2 bg-white/80 backdrop-blur-xl rounded-full shadow-lg border border-white/20">
            <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask your assistant..."
                className="border-none bg-transparent focus-visible:ring-0 h-10"
            />
            <Button
                size="icon"
                variant="ghost"
                className="text-gray-400 hover:text-blue-500"
            >
                <Mic className="w-5 h-5" />
            </Button>
            <Button
                size="icon"
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-full w-10 h-10 shrink-0"
                onClick={handleSend}
                disabled={!message.trim()}
            >
                <Send className="w-4 h-4" />
            </Button>
        </div>
    );
}
