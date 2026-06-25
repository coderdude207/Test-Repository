api.controller=function($scope, $sce, $timeout) {
	var c = this;

	// ── Config ──────────────────────────────────────────────
	// For Ollama (local): 'http://localhost:11434/api/chat'
	// For OpenAI:         'https://api.openai.com/v1/chat/completions'
	// For a ServiceNow proxy: '/api/YOUR_SCOPE/llm_proxy/stream'
	var LLM_ENDPOINT = c.data.llmEndpoint || 'http://localhost:11434/api/chat';
	var MODEL        = c.data.llmModel    || 'llama3.2';
	var API_KEY      = c.data.apiKey      || '';  // populated from server

	var abortController = null;

	c.data.messages        = [];
	c.data.userInput       = '';
	c.data.isStreaming     = false;
	c.data.streamingStarted = false;

	// ── Send Message ─────────────────────────────────────────
	c.sendMessage = function() {
		var text = (c.data.userInput || '').trim();
		if (!text || c.data.isStreaming) return;

		c.data.messages.push({ role: 'user', content: text });
		c.data.userInput = '';
		c.data.isStreaming = true;
		c.data.streamingStarted = false;

		// Placeholder for assistant response
		var assistantMsg = { role: 'assistant', content: '', streaming: true };
		c.data.messages.push(assistantMsg);

		_scrollToBottom();
		_streamFromLLM(assistantMsg);
	};

	c.handleKeydown = function(evt) {
		if (evt.key === 'Enter' && !evt.shiftKey) {
			evt.preventDefault();
			c.sendMessage();
		}
	};

	c.stopStreaming = function() {
		if (abortController) abortController.abort();
	};

	// ── Core Streaming Logic ─────────────────────────────────
	function _streamFromLLM(targetMsg) {
		abortController = new AbortController();

		// Build messages array for the API
		var apiMessages = c.data.messages
		.filter(function(m) { return !m.streaming || m.content; })
		.map(function(m) { return { role: m.role, content: m.content }; });

		// ── Payload: adjust for your LLM provider ──
		var payload = _buildPayload(apiMessages);
		var headers  = { 'Content-Type': 'application/json' };
		if (API_KEY) headers['Authorization'] = 'Bearer ' + API_KEY;

		fetch(LLM_ENDPOINT, {
			method: 'POST',
			headers: headers,
			body: JSON.stringify(payload),
			signal: abortController.signal
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

	// ── Stream Reader ────────────────────────────────────────
	function _readStream(reader, targetMsg) {
		var decoder = new TextDecoder();
		var buffer  = '';

		function pump() {
			return reader.read().then(function(result) {
				if (result.done) return;

				buffer += decoder.decode(result.value, { stream: true });
				var lines = buffer.split('\n');
				buffer = lines.pop(); // keep incomplete line in buffer

				lines.forEach(function(line) {
					var token = _parseLine(line);
					if (token) {
						c.data.streamingStarted = true;
						targetMsg.content += token;
						// Render markdown-ish content safely
						targetMsg.html = $sce.trustAsHtml(_simpleMarkdown(targetMsg.content));
						$timeout(function() { _scrollToBottom(); }, 0);
					}
				});

				$scope.$apply(); // trigger AngularJS digest
				return pump();
			});
		}
		return pump();
	}

	// ── Parse SSE/NDJSON line (handles OpenAI & Ollama formats) ──
	function _parseLine(line) {
		line = line.trim();
		if (!line || line === 'data: [DONE]') return null;

		// OpenAI SSE format: "data: {...}"
		if (line.startsWith('data: ')) {
			try {
				var json = JSON.parse(line.slice(6));
				return (json.choices && json.choices[0].delta && json.choices[0].delta.content) || null;
			} catch(e) { return null; }
		}

		// Ollama NDJSON format: "{...}"
		try {
			var json = JSON.parse(line);
			if (json.done) return null;
			return (json.message && json.message.content) || json.response || null;
		} catch(e) { return null; }
	}

	// ── Build payload per provider ───────────────────────────
	function _buildPayload(messages) {
		// Ollama format
		if (LLM_ENDPOINT.indexOf('ollama') > -1 || LLM_ENDPOINT.indexOf('11434') > -1) {
			return { model: MODEL, messages: messages, stream: true };
		}
		// OpenAI-compatible format (OpenAI, Anthropic via proxy, etc.)
		return { model: MODEL, messages: messages, stream: true, max_tokens: 2048 };
	}

	function _finalizeMessage(msg) {
		msg.streaming = false;
		c.data.isStreaming = false;
		c.data.streamingStarted = false;
		$scope.$apply();
		_scrollToBottom();
	}

	function _scrollToBottom() {
		$timeout(function() {
			var el = document.querySelector('.chat-messages');
			if (el) el.scrollTop = el.scrollHeight;
		}, 50);
	}

	// ── Minimal Markdown renderer ────────────────────────────
	function _simpleMarkdown(text) {
		return text
			.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
			.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
			.replace(/`([^`]+)`/g, '<code>$1</code>')
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.+?)\*/g, '<em>$1</em>')
			.replace(/\n/g, '<br>');
	}
}