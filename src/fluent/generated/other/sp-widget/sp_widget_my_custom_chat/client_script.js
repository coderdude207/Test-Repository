api.controller = function($scope, $sce, $timeout) {
	var c = this;

	// ── Config (from server) ──────────────────────────────────
	var LLM_ENDPOINT = c.data.llmEndpoint || 'http://localhost:11434/api/chat';
	var MODEL        = c.data.llmModel    || 'llama3.2';
	var API_KEY      = c.data.apiKey      || '';

	var abortController = null;

	// ── Local UI State ────────────────────────────────────────
	c.messages          = [];
	c.userInput         = '';
	c.isStreaming       = false;
	c.streamingStarted  = false;
	c.view              = 'home';
	c.currentTitle      = 'New chat';
	c.currentConversationSysId = null;
	c.sidebarCollapsed  = false;
	c.mobileSidebarOpen = false;
	c.homeFieldFocused  = false;

	// ── User info ─────────────────────────────────────────────
	c.userName     = 'Himanshu Gore';
	c.userInitials = 'HG';
	c.firstName    = 'Himanshu';

	// ── Spark GIF URL: set via c.sparkGif or use the hardcoded src in template ───

	// ── Theme ─────────────────────────────────────────────────
	var savedTheme = 'light';
	try { savedTheme = localStorage.getItem('buddy-theme') || 'light'; } catch (e) {}
	c.theme = savedTheme;

	c.toggleTheme = function() {
		c.theme = (c.theme === 'light') ? 'dark' : 'light';
		try { localStorage.setItem('buddy-theme', c.theme); } catch (e) {}
	};

	// ── SVG Helpers ───────────────────────────────────────────
	function sparkSVG(size, color) {
		color = color || 'var(--accent)';
		function star(cx, cy, r, pinch) {
			var k = r * pinch;
			return 'M'+cx+' '+(cy-r)
				+' C'+(cx+k)+' '+(cy-k)+' '+(cx+k)+' '+(cy-k)+' '+(cx+r)+' '+cy
				+' C'+(cx+k)+' '+(cy+k)+' '+(cx+k)+' '+(cy+k)+' '+cx+' '+(cy+r)
				+' C'+(cx-k)+' '+(cy+k)+' '+(cx-k)+' '+(cy+k)+' '+(cx-r)+' '+cy
				+' C'+(cx-k)+' '+(cy-k)+' '+(cx-k)+' '+(cy-k)+' '+cx+' '+(cy-r)+' Z';
		}
		return '<svg viewBox="0 0 32 32" width="'+size+'" height="'+size+'" fill="'+color+'" xmlns="http://www.w3.org/2000/svg">'
			+ '<path d="'+star(13, 18, 12, 0.34)+'"/>'
			+ '<path d="'+star(25.5, 7.5, 5.2, 0.34)+'"/></svg>';
	}

	c.sparkSVG20 = $sce.trustAsHtml(sparkSVG(20));
	c.sparkSVG26 = $sce.trustAsHtml(sparkSVG(26));
	c.sparkSVG42 = $sce.trustAsHtml(sparkSVG(42));

	c.sunSVG  = $sce.trustAsHtml('<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>');
	c.moonSVG = $sce.trustAsHtml('<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>');

	// ── Suggestion Chips ──────────────────────────────────────
	var ic = {
		key:    $sce.trustAsHtml('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="M10.8 12.2 19 4M16 7l3 3M14 9l2 2"/></svg>'),
		ticket: $sce.trustAsHtml('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4 2 2 0 0 0 0-4Z"/><path d="M14 6v12"/></svg>'),
		laptop: $sce.trustAsHtml('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 20h20"/></svg>'),
		people: $sce.trustAsHtml('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.5a3 3 0 0 1 0 5.6M18 20a6 6 0 0 0-3-5.2"/></svg>'),
		list:   $sce.trustAsHtml('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>')
	};
	c.chips = [
		{ icon: ic.key,    label: 'Reset my password', prompt: 'How do I reset my network password?' },
		{ icon: ic.ticket, label: ‘Raise a ticket’,    prompt: "Raise an IT ticket — my laptop won’t connect to Wi-Fi" },
		{ icon: ic.list,   label: ‘My requests’,       prompt: "What’s the status of my open requests?" },
		{ icon: ic.people, label: 'HR questions',      prompt: 'How many vacation days do I have left this year?' },
		{ icon: ic.laptop, label: 'Request equipment', prompt: 'I need to request a new laptop charger' }
	];

	c.useChip = function(chip) {
		c.userInput = chip.prompt;
		c.sendMessage();
	};

	// ── Sidebar ───────────────────────────────────────────────
	c.toggleSidebar = function() {
		if (window.matchMedia('(max-width:880px)').matches) {
			c.mobileSidebarOpen = !c.mobileSidebarOpen;
		} else {
			c.sidebarCollapsed = !c.sidebarCollapsed;
		}
	};
	c.closeMobileSidebar = function() {
		c.mobileSidebarOpen = false;
	};

	// ── View management ───────────────────────────────────────
	c.showHome = function() {
		c.view = 'home';
		c.currentTitle = 'New chat';
		c.currentConversationSysId = null;
		c.messages = [];
		c.userInput = '';
		c.closeMobileSidebar();
	};

	c.loadConversation = function(conv) {
		c.currentConversationSysId = conv.sysId;
		c.currentTitle = conv.title;
		c.view = 'thread';
		c.messages = [];
		c.closeMobileSidebar();

		// Load messages from ServiceNow
		c.data.serverAction   = 'loadMessages';
		c.data.actionPayload  = JSON.stringify({ conversationSysId: conv.sysId });
		c.server.update().then(function() {
			var loaded = c.data.loadedMessages || [];
			c.messages = loaded.map(function(m) {
				return {
					role:    m.role,
					content: m.content,
					html:    $sce.trustAsHtml(_simpleMarkdown(m.content))
				};
			});
			c.data.serverAction  = null;
			c.data.actionPayload = null;
			c.data.loadedMessages = null;
			_scrollToBottom();
		});
	};

	// ── Send Message ──────────────────────────────────────────
	c.sendMessage = function() {
		var text = (c.userInput || '').trim();
		if (!text || c.isStreaming) return;

		// Switch to thread view on first message
		if (c.view === 'home') {
			c.currentTitle = text.length > 42 ? text.slice(0, 42) + '…' : text;
			c.view = 'thread';
		}

		c.messages.push({
			role:    'user',
			content: text,
			html:    $sce.trustAsHtml('<p>' + _escapeHTML(text) + '</p>')
		});
		c.userInput = '';

		// Reset textareas height
		['buddyHomeField', 'buddyDockField'].forEach(function(id) {
			var el = document.getElementById(id);
			if (el) el.style.height = 'auto';
		});

		c.isStreaming      = true;
		c.streamingStarted = false;

		var assistantMsg = { role: 'assistant', content: '', streaming: true };
		c.messages.push(assistantMsg);

		_scrollToBottom();
		_persistUserMessage(text, assistantMsg);
	};

	// ── ServiceNow Persistence ────────────────────────────────
	function _persistUserMessage(text, assistantMsg) {
		if (!c.currentConversationSysId) {
			// Create the conversation record first (title = first prompt)
			var title = text.length > 100 ? text.slice(0, 100) + '…' : text;
			c.data.serverAction  = 'createConversation';
			c.data.actionPayload = JSON.stringify({ title: title });
			c.server.update().then(function() {
				var sysId = c.data.newConversationSysId;
				c.currentConversationSysId = sysId;
				c.data.serverAction        = null;
				c.data.actionPayload       = null;
				c.data.newConversationSysId = null;

				// Add new conversation to sidebar (front of list)
				if (!c.data.conversations) c.data.conversations = [];
				c.data.conversations.unshift({ sysId: sysId, title: title });

				// Now save the user message record
				_saveMessage('user', text, function() {
					_streamFromLLM(assistantMsg);
				});
			});
		} else {
			// Conversation exists; save user message then stream
			_saveMessage('user', text, function() {
				_streamFromLLM(assistantMsg);
			});
		}
	}

	function _saveMessage(role, content, callback) {
		c.data.serverAction  = 'createMessage';
		c.data.actionPayload = JSON.stringify({
			conversationSysId: c.currentConversationSysId,
			role:    role,
			content: content
		});
		c.server.update().then(function() {
			c.data.serverAction  = null;
			c.data.actionPayload = null;
			if (callback) callback();
		});
	}

	// ── Core Streaming Logic (kept intact) ────────────────────
	function _streamFromLLM(targetMsg) {
		abortController = new AbortController();

		var apiMessages = c.messages
			.filter(function(m) { return !m.streaming || m.content; })
			.map(function(m) { return { role: m.role, content: m.content }; });

		var payload = _buildPayload(apiMessages);
		var headers  = { 'Content-Type': 'application/json' };
		if (API_KEY) headers['Authorization'] = 'Bearer ' + API_KEY;

		fetch(LLM_ENDPOINT, {
			method:  'POST',
			headers: headers,
			body:    JSON.stringify(payload),
			signal:  abortController.signal
		})
		.then(function(response) {
			if (!response.ok) throw new Error('HTTP ' + response.status);
			return _readStream(response.body.getReader(), targetMsg);
		})
		.then(function() {
			_finalizeMessage(targetMsg);
		})
		.catch(function(err) {
			if (err.name !== 'AbortError') {
				targetMsg.content += '\n\n⚠️ Error: ' + err.message;
			}
			_finalizeMessage(targetMsg);
		});
	}

	// ── Stream Reader (kept intact) ───────────────────────────
	function _readStream(reader, targetMsg) {
		var decoder = new TextDecoder();
		var buffer  = '';

		function pump() {
			return reader.read().then(function(result) {
				if (result.done) return;

				buffer += decoder.decode(result.value, { stream: true });
				var lines = buffer.split('\n');
				buffer = lines.pop();

				lines.forEach(function(line) {
					var token = _parseLine(line);
					if (token) {
						c.streamingStarted = true;
						targetMsg.content += token;
						targetMsg.html = $sce.trustAsHtml(_simpleMarkdown(targetMsg.content));
						$timeout(function() { _scrollToBottom(); }, 0);
					}
				});

				$scope.$apply();
				return pump();
			});
		}
		return pump();
	}

	// ── Parse SSE/NDJSON line (kept intact) ──────────────────
	function _parseLine(line) {
		line = line.trim();
		if (!line || line === 'data: [DONE]') return null;

		if (line.startsWith('data: ')) {
			try {
				var json = JSON.parse(line.slice(6));
				return (json.choices && json.choices[0].delta && json.choices[0].delta.content) || null;
			} catch (e) { return null; }
		}

		try {
			var json = JSON.parse(line);
			if (json.done) return null;
			return (json.message && json.message.content) || json.response || null;
		} catch (e) { return null; }
	}

	// ── Build payload per provider (kept intact) ─────────────
	function _buildPayload(messages) {
		if (LLM_ENDPOINT.indexOf('ollama') > -1 || LLM_ENDPOINT.indexOf('11434') > -1) {
			return { model: MODEL, messages: messages, stream: true };
		}
		return { model: MODEL, messages: messages, stream: true, max_tokens: 2048 };
	}

	// ── Finalize streaming (kept intact + adds persistence) ───
	function _finalizeMessage(msg) {
		msg.streaming      = false;
		c.isStreaming      = false;
		c.streamingStarted = false;
		$scope.$apply();
		_scrollToBottom();

		// Persist the assistant response to ServiceNow
		if (c.currentConversationSysId && msg.content) {
			_saveMessage('assistant', msg.content, null);
		}
	}

	// ── Keyboard + UI helpers ─────────────────────────────────
	c.handleKeydown = function(evt) {
		if (evt.key === 'Enter' && !evt.shiftKey) {
			evt.preventDefault();
			c.sendMessage();
		}
	};

	c.stopStreaming = function() {
		if (abortController) abortController.abort();
	};

	c.autoGrow = function(el) {
		if (!el) return;
		el.style.height = 'auto';
		el.style.height = Math.min(el.scrollHeight, 200) + 'px';
	};

	function _scrollToBottom() {
		$timeout(function() {
			var el = document.getElementById('buddyThread');
			if (el) el.scrollTop = el.scrollHeight;
		}, 50);
	}

	// ── Minimal Markdown renderer (kept intact) ───────────────
	function _simpleMarkdown(text) {
		return text
			.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
			.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
			.replace(/`([^`]+)`/g, '<code>$1</code>')
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.+?)\*/g, '<em>$1</em>')
			.replace(/\n/g, '<br>');
	}

	function _escapeHTML(s) {
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}
};