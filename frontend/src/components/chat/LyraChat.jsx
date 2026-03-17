import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';

const LyraChat = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text) => {
    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      
      const data = await response.json();
      const lyraMessage = { role: 'assistant', content: data.response };
      setMessages(prev => [...prev, lyraMessage]);
    } catch (error) {
      console.error('Error:', error);
      const mockResponse = { 
        role: 'assistant', 
        content: "I'm still being built! But I'll be able to help you soon. ??" 
      };
      setMessages(prev => [...prev, mockResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    await sendMessage(input);
    setInput('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="bg-black/20 backdrop-blur-lg border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Lyra</h1>
            <p className="text-sm text-purple-300">Your AI Assistant</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mb-6">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Hey! I'm Lyra ??</h2>
            <p className="text-lg text-purple-300 max-w-md">
              I can help you create images, write content, or generate podcast scripts. Just tell me what you need!
            </p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl">
              <button onClick={() => setInput("Create an image of a futuristic city")} className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-all">
                <p className="text-purple-400 font-semibold mb-1">?? Image</p>
                <p className="text-sm text-gray-400">Create stunning visuals</p>
              </button>
              <button onClick={() => setInput("Write a blog post about AI")} className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-all">
                <p className="text-purple-400 font-semibold mb-1">?? Content</p>
                <p className="text-sm text-gray-400">Generate written content</p>
              </button>
              <button onClick={() => setInput("Create a podcast script about technology")} className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-all">
                <p className="text-purple-400 font-semibold mb-1">??? Podcast</p>
                <p className="text-sm text-gray-400">Write episode scripts</p>
              </button>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div key={index} className={'flex ' + (message.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={'max-w-2xl rounded-2xl px-4 py-3 ' + (message.role === 'user' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-white/5 backdrop-blur-lg border border-white/10')}>
                  <p className="text-white">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
                <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl px-4 py-3">
                  <p className="text-purple-300">Lyra is thinking...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="bg-black/20 backdrop-blur-lg border-t border-white/10 px-6 py-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex items-end gap-3">
            <div className="flex-1 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl overflow-hidden">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask Lyra anything..."
                className="w-full bg-transparent text-white placeholder-gray-400 px-4 py-3 resize-none focus:outline-none"
                rows="1"
                style={{ minHeight: '48px', maxHeight: '200px' }}
              />
            </div>
            <button type="submit" disabled={!input.trim() || isLoading} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LyraChat;
