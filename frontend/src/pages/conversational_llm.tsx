import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePageState } from '../utils/usePageState';

const apiUrl = import.meta.env.VITE_BACKEND_URL;
const shouldUseCompactLayout = () => window.innerWidth <= 1280 || window.innerHeight <= 820;

const ConversationalLLM: React.FC = () => {
	const { t, i18n } = useTranslation();
	const isFrench = (i18n.language || 'fr').toLowerCase().startsWith('fr');
	const showContextLabel = isFrench ? 'Afficher le contexte complet' : 'Show full context';
	const hideContextLabel = isFrench ? 'Masquer le contexte' : 'Hide context';
	
	const [messages, setMessages] = usePageState<Array<{ sender: string; text: string; sourceContextPairs?: Array<{source: string; context: string; showContext: boolean}> }>>(
		'conversational_llm_messages',
		[]
	);
	const [input, setInput] = usePageState<string>('conversational_llm_input', '');
	const [loading, setLoading] = usePageState<boolean>('conversational_llm_loading', false);
	const [isCompactLayout, setIsCompactLayout] = useState<boolean>(shouldUseCompactLayout());
	const abortControllerRef = useRef<AbortController | null>(null);

	useEffect(() => {
		const handleResize = () => setIsCompactLayout(shouldUseCompactLayout());
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	const handleSend = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!input.trim() || loading) return;
		const userMessage = { sender: 'user', text: input };
		setMessages(prev => [...prev, userMessage]);
		setInput('');
		setLoading(true);

		// Prepare streaming fetch
		const controller = new AbortController();
		abortControllerRef.current = controller;
		let botText = '';
		setMessages(prev => [...prev, { sender: 'bot', text: '' }]);
		try {
			const params = new URLSearchParams();
			params.append('user_message', userMessage.text);
			const url = `${apiUrl}/api/call_chatbot/?${params.toString()}`;
			console.log('Calling chatbot API:', url);
			const response = await fetch(url, {
				method: 'POST',
				signal: controller.signal,
			});
			console.log('Response status:', response.status);
			if (!response.body) {
				console.error('No response body');
				throw new Error('No response body');
			}
			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let done = false;
			let fullText = '';
			let chunkCount = 0;
			const sourceMarker = '\n\nSOURCE:\n';
			const contextMarker = '\n\nCONTEXT:\n';
			
			while (!done) {
				const { value, done: doneReading } = await reader.read();
				done = doneReading;
				if (value) {
					chunkCount++;
					const chunk = decoder.decode(value, { stream: !done });
					console.log(`Chunk ${chunkCount}:`, chunk);
					fullText += chunk;
					
					// Parse the accumulated fullText
					const firstSourceIndex = fullText.indexOf(sourceMarker);
					
					// Extract main text (before first SOURCE marker)
					if (firstSourceIndex === -1) {
						botText = fullText.trim();
					} else {
						botText = fullText.slice(0, firstSourceIndex).trim();
					}
					
					// Parse SOURCE/CONTEXT pairs
					let pairsText = fullText.slice(firstSourceIndex >= 0 ? firstSourceIndex : fullText.length);
					const pairs: Array<{source: string; context: string; showContext: boolean}> = [];
					let currentPos = 0;
					
					while (currentPos < pairsText.length) {
						const sourceIdx = pairsText.indexOf(sourceMarker, currentPos);
						if (sourceIdx === -1) break;
						
						const sourceStart = sourceIdx + sourceMarker.length;
						const contextIdx = pairsText.indexOf(contextMarker, sourceStart);
						if (contextIdx === -1) break;
						
						const contextStart = contextIdx + contextMarker.length;
						const nextSourceIdx = pairsText.indexOf(sourceMarker, contextStart);
						const contextEnd = nextSourceIdx !== -1 ? nextSourceIdx : pairsText.length;
						
						const source = pairsText.slice(sourceStart, contextIdx).trim();
						const context = pairsText.slice(contextStart, contextEnd).trim();
						
						if (source && context) {
							pairs.push({ source, context, showContext: false });
						}
						
						currentPos = contextEnd;
					}
					
					// Update message with current parsed values
					setMessages(prev => {
						const updated = [...prev];
						updated[updated.length - 1] = {
							sender: 'bot',
							text: botText,
							...(pairs.length > 0 && { sourceContextPairs: pairs })
						};
						return updated;
					});
				}
			}
			console.log('Streaming completed. Total chunks:', chunkCount, 'Final text:', botText);
		} catch (err) {
			console.error('Error in conversational LLM:', err);
			setMessages(prev => {
				const updated = [...prev];
				updated[updated.length - 1] = { sender: 'bot', text: t('error_no_response') };
				return updated;
			});
		} finally {
			setLoading(false);
		}
	};

	const toggleSourceContext = (messageIdx: number, pairIdx: number) => {
		setMessages(prev => {
			const updated = [...prev];
			if (updated[messageIdx].sourceContextPairs) {
				updated[messageIdx].sourceContextPairs![pairIdx].showContext = !updated[messageIdx].sourceContextPairs![pairIdx].showContext;
			}
			return updated;
		});
	};

	const handleClearConversation = () => {
		setMessages([]);
		setInput('');
	};

	return (
		   <div style={{ maxWidth: isCompactLayout ? 1200 : 1600, width: '97%', margin: isCompactLayout ? '0.75rem auto' : '2rem auto', padding: isCompactLayout ? '0.85rem 0.85rem 1rem' : '2.5rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: isCompactLayout ? 12 : 20, boxShadow: '0 6px 32px rgba(10,20,40,0.15)' }}>
			   <h1 style={{ textAlign: 'center', marginBottom: isCompactLayout ? 16 : 32, fontSize: isCompactLayout ? '1.2rem' : '2.2rem', color: '#1e293b', letterSpacing: 0.01, lineHeight: 1.25 }}>{t('conversational_llm.title', 'Posez vos questions à votre assistant spécialiste en intégrité des données')}</h1>
			   {messages.length > 0 && (
				   <div style={{ marginBottom: 16, textAlign: 'center' }}>
					   <button onClick={handleClearConversation} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 1px 4px 0 rgba(239,68,68,0.15)' }}>
						   {t('conversational_llm.clear_conversation', 'Clear Conversation')}
					   </button>
				   </div>
			   )}
			   <div style={{ height: isCompactLayout ? '53vh' : 'min(62vh, 580px)', minHeight: isCompactLayout ? 280 : 390, maxHeight: isCompactLayout ? 460 : 660, marginBottom: isCompactLayout ? 14 : 24, background: '#fff', borderRadius: 14, padding: isCompactLayout ? 10 : 24, overflowY: 'auto', boxShadow: '0 2px 12px 0 rgba(10,20,40,0.12)', border: '1px solid #e2e8f0' }}>
				   {messages.length === 0 ? (
					   <p style={{ color: '#64748b', textAlign: 'center' }}>{t('conversational_llm.start_prompt', 'Commencez la conversation ci-dessous !')}</p>
				   ) : (
					messages.map((msg, idx) => (
						<div key={idx} style={{ marginBottom: 12, textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
							<span style={{
								display: 'inline-block',
						   background: msg.sender === 'user' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#f1f5f9',
						   color: msg.sender === 'user' ? '#fff' : '#1e293b',
								   borderRadius: 10,
								   padding: isCompactLayout ? '8px 12px' : '10px 18px',
								   maxWidth: isCompactLayout ? '92%' : '80%',
								   fontSize: isCompactLayout ? '0.95rem' : '1rem',
								   fontWeight: 500,
								   boxShadow: msg.sender === 'user' ? '0 2px 8px 0 rgba(59,130,246,0.15)' : '0 2px 8px 0 rgba(30,40,60,0.08)',
								   border: msg.sender === 'user' ? '1.5px solid #3b82f6' : '1.5px solid #e2e8f0',
								   wordBreak: 'break-word',
							   }}>{msg.text}</span>
							{/* Show source-context pairs for bot messages */}
							{msg.sender === 'bot' && msg.sourceContextPairs && msg.sourceContextPairs.length > 0 && (
								<div style={{ marginTop: 8 }}>
									{msg.sourceContextPairs.map((pair, pairIdx) => (
										<div key={pairIdx} style={{ marginBottom: 8, backgroundColor: '#f1f5f9', borderRadius: 8, padding: '12px', border: '1px solid #e2e8f0' }}>
											<div style={{ fontWeight: 600, marginBottom: 8, fontSize: '0.9rem', color: '#1e293b' }}>
												Source {pairIdx + 1}:
											</div>
											<div style={{ marginBottom: 8, fontSize: '0.9rem', color: '#475569', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
												{pair.source}
											</div>
											<button
												type="button"
												onClick={() => toggleSourceContext(idx, pairIdx)}
												style={{
													background: '#6c757d',
													color: '#fff',
													border: 'none',
													borderRadius: 4,
													padding: '4px 8px',
													fontWeight: 600,
													fontSize: '0.8rem',
													cursor: 'pointer',
													boxShadow: '0 1px 3px 0 rgba(108,117,125,0.15)'
												}}
											>
												{pair.showContext ? hideContextLabel : showContextLabel}
											</button>
											{pair.showContext && (
												<div style={{ marginTop: 8, backgroundColor: '#fff', borderRadius: 4, padding: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem', color: '#1e293b', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
													{pair.context}
												</div>
											)}
										</div>
									))}
								</div>
							)}
						</div>
					))
				)}
			</div>
			<form onSubmit={handleSend} style={{ display: 'flex', gap: 8, flexDirection: 'row', alignItems: 'stretch' }}>
				   <input
					   type="text"
					   value={input}
					   onChange={e => setInput((e.target as HTMLInputElement).value)}
					   placeholder={t('conversational_llm.input_placeholder', 'Tapez votre message...')}
					   disabled={loading}
					   style={{ flex: 1, width: '100%', padding: isCompactLayout ? '10px 12px' : '12px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: isCompactLayout ? '0.95rem' : '1rem', background: '#fff', color: '#1e293b', boxShadow: '0 1px 4px 0 rgba(30,40,60,0.08)' }}
				   />
				   <button type="submit" disabled={loading || !input.trim()} style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff', border: 'none', borderRadius: 10, padding: isCompactLayout ? '10px 14px' : '0 22px', minHeight: isCompactLayout ? 42 : undefined, width: 'auto', fontWeight: 700, fontSize: isCompactLayout ? '0.95rem' : '1rem', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 1px 4px 0 rgba(59,130,246,0.15)', whiteSpace: 'nowrap' }}>
					   {loading ? t('conversational_llm.sending', 'Envoi en cours...') : t('conversational_llm.send', 'Envoyer')}
				   </button>
			</form>
		</div>
	);
};

export default ConversationalLLM;
