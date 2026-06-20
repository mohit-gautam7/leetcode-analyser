import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, X, MessageSquare, Trash2 } from 'lucide-react';
import { Button, Card, Spinner } from '@/components/ui';
import { aiService } from '@/services/ai-service';
import { storage } from '@/storage';
import { generateId, formatTimestamp, cn } from '@/utils/helpers';
import { staggerContainer, staggerItem, fadeIn } from '@/animations/variants';
import type { Problem, UserCode, ChatMessage, ChatSession } from '@/types';

interface ChatPanelProps {
  problem: Problem | null;
  code: UserCode | null;
  onClose: () => void;
}

export function ChatPanel({ problem, code, onClose }: ChatPanelProps) {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (problem) {
      storage.getChatSession(problem.id).then((s) => {
        setSession(s ?? {
          id: generateId(),
          problemId: problem.id,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });
    }
  }, [problem?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [session?.messages, streamContent]);

  const send = useCallback(async () => {
    if (!input.trim() || !problem || !session || streaming) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    const history = session.messages.map((m) => ({ role: m.role, content: m.content }));
    const updatedSession = {
      ...session,
      messages: [...session.messages, userMsg],
      updatedAt: Date.now(),
    };

    setSession(updatedSession);
    setInput('');
    setStreaming(true);
    setStreamContent('');

    try {
      let full = '';
      const gen = aiService.chatStream(problem, userMsg.content, history, code ?? undefined);

      for await (const chunk of gen) {
        full += chunk;
        setStreamContent(full);
      }

      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: full,
        timestamp: Date.now(),
      };

      const finalSession = {
        ...updatedSession,
        messages: [...updatedSession.messages, assistantMsg],
        updatedAt: Date.now(),
      };

      setSession(finalSession);
      await storage.saveChatSession(finalSession);
    } catch (e) {
      const errMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `Error: ${e instanceof Error ? e.message : 'Something went wrong'}`,
        timestamp: Date.now(),
      };
      const errSession = {
        ...updatedSession,
        messages: [...updatedSession.messages, errMsg],
        updatedAt: Date.now(),
      };
      setSession(errSession);
    } finally {
      setStreaming(false);
      setStreamContent('');
    }
  }, [input, problem, session, streaming, code]);

  function clearChat() {
    if (!problem || !session) return;
    const cleared = { ...session, messages: [], updatedAt: Date.now() };
    setSession(cleared);
    storage.saveChatSession(cleared);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const quickPrompts = [
    'Why does DP work here?',
    'Can Greedy work?',
    'Explain the constraints',
    'Show another approach',
    'What are edge cases?',
  ];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-slate-900"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-slate-700/50 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white">AI Chat</h3>
          <p className="text-xs text-slate-400 truncate">
            {problem?.title ?? 'No problem loaded'}
          </p>
        </div>
        <Button size="icon" variant="ghost" onClick={clearChat}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {!problem ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="w-10 h-10 text-slate-600 mb-3" />
            <p className="text-sm text-slate-400">Open a coding problem to start chatting</p>
          </div>
        ) : session?.messages.length === 0 && !streaming ? (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <div className="text-center py-6">
              <Bot className="w-10 h-10 text-violet-400 mx-auto mb-2" />
              <p className="text-sm text-slate-300 font-medium">Ask me anything about this problem</p>
              <p className="text-xs text-slate-500 mt-1">I won't give away the solution unless you ask</p>
            </div>
            <div className="space-y-2">
              {quickPrompts.map((prompt) => (
                <motion.button
                  key={prompt}
                  variants={staggerItem}
                  className="w-full text-left p-3 rounded-xl bg-slate-800/60 border border-slate-700/40 text-sm text-slate-300 hover:bg-slate-700/60 hover:text-white transition-colors"
                  onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                >
                  {prompt}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <>
            {session?.messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            {streaming && streamContent && (
              <ChatBubble
                message={{
                  id: 'streaming',
                  role: 'assistant',
                  content: streamContent,
                  timestamp: Date.now(),
                  isStreaming: true,
                }}
              />
            )}
            {streaming && !streamContent && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex gap-1 p-3 rounded-xl bg-slate-800/60">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-violet-400"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-700/50 shrink-0">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the problem... (Enter to send)"
            className="flex-1 min-h-[40px] max-h-[120px] resize-none px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/50 text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-colors"
            rows={1}
            disabled={!problem || streaming}
          />
          <Button
            size="icon"
            variant="primary"
            onClick={send}
            disabled={!input.trim() || !problem || streaming}
            className="h-10 w-10 shrink-0"
          >
            {streaming ? <Spinner size={16} /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-slate-600 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </motion.div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <motion.div
      className={cn('flex items-start gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className={cn(
        'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
        isUser ? 'bg-slate-700' : 'bg-violet-600'
      )}>
        {isUser ? <User className="w-3.5 h-3.5 text-slate-300" /> : <Bot className="w-3.5 h-3.5 text-white" />}
      </div>
      <div className={cn(
        'max-w-[85%] rounded-xl px-3 py-2.5 text-sm leading-relaxed',
        isUser
          ? 'bg-violet-600/20 text-violet-100 border border-violet-500/20'
          : 'bg-slate-800/80 text-slate-200 border border-slate-700/40',
        message.isStreaming && 'border-violet-500/30'
      )}>
        <span className="whitespace-pre-wrap">{message.content}</span>
        {message.isStreaming && (
          <motion.span
            className="inline-block w-0.5 h-4 bg-violet-400 ml-0.5 align-middle"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        )}
      </div>
    </motion.div>
  );
}
