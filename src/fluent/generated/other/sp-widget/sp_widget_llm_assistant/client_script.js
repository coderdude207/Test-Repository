api.controller = function($scope, $sce, $timeout, $http) {
    const c = this;

    // ── State ────────────────────────────────────────────────────────────────
    c.data.messages          = c.data.messages          || [];
    c.data.userInput         = '';
    c.data.isStreaming       = false;
    c.data.isThinking        = false;
    c.data.errorMsg          = null;

    // Private — not exposed to the template
    let _abortController      = null;
    let _conversationHistory  = [];   // [{role, content}] — only clean fields for API calls

    // ── Public methods ───────────────────────────────────────────────────────

    c.onKeydown = function(evt) {
        if (evt.key === 'Enter' && !evt.shiftKey) {
            evt.preventDefault();
            c.sendMessage();
        }
    };

    c.clearChat = function() {
        if (_abortController) _abortController.abort();
        c.data.messages         = [];
        c.data.userInput        = '';
        c.data.isStreaming      = false;
        c.data.isThinking       = false;
        c.data.errorMsg         = null;
        _conversationHistory    = [];
        _resetTextareaHeight();
    };

    c.stopStream = function() {
        if (_abortController) _abortController.abort();
    };

    c.sendMessage = function() {
        const text = (c.data.userInput || '').trim();
        if (!text || c.data.isStreaming) return;

        // Push user message
        c.data.messages.push({ role: 'user', content: text, html: $sce.trustAsHtml(_renderMarkdown(text)) });
        _conversationHistory.push({ role: 'user', content: text });

        c.data.userInput    = '';
        c.data.isThinking   = true;
        c.data.isStreaming  = true;
        c.data.errorMsg     = null;
        _resetTextareaHeight();
        _scrollToBottom();

        // Step 1 — fetch a short-lived token
        $http.get('/api/x_643482_my_cust_0/llm_proxy/token')
            .then(function(res) {
                const meta = res.data;
                // Step 2 — exchange token for LLM credentials
                return $http.post('/api/x_643482_my_cust_0/llm_proxy/chat', { token: meta.token })
                    .then(function(credRes) {
                        const creds = Object.assign({}, credRes.data, { model: meta.model, endpoint: meta.endpoint });
                        _streamFromLLM(creds);
                    });
            })
            .catch(function(err) {
                $scope.$apply(function() {
                    c.data.errorMsg    = 'Failed to connect: ' + ((err.data && err.data.error) || err.statusText || 'unknown error');
                    c.data.isStreaming = false;
                    c.data.isThinking  = false;
                });
            });
    };

    // ── Private helpers ──────────────────────────────────────────────────────

    function _streamFromLLM(creds) {
        _abortController = new AbortController();

        const assistantMsg = {
            role:      'assistant',
            content:   '',
            html:      $sce.trustAsHtml(''),
            streaming: true,
        };
        c.data.messages.push(assistantMsg);
        _scrollToBottom();

        const body = {
            model:    creds.model,
            messages: _conversationHistory.slice(),   // only {role, content}
            stream:   true,
        };

        // Build headers — omit Authorization for local Ollama (no key configured)
        const headers = { 'Content-Type': 'application/json' };
        if (creds.apiKey) {
            headers['Authorization'] = 'Bearer ' + creds.apiKey;
        }

        fetch(creds.endpoint, {
            method:  'POST',
            headers: headers,
            body:   JSON.stringify(body),
            signal: _abortController.signal,
        })
        .then(function(response) {
            if (!response.ok) {
                throw new Error('LLM returned ' + response.status + ' ' + response.statusText);
            }
            $scope.$apply(function() { c.data.isThinking = false; });
            _readStream(response.body.getReader(), assistantMsg);
        })
        .catch(function(err) {
            if (err.name === 'AbortError') {
                $scope.$apply(function() {
                    assistantMsg.streaming = false;
                    c.data.isStreaming     = false;
                    c.data.isThinking      = false;
                });
                return;
            }
            $scope.$apply(function() {
                c.data.errorMsg    = 'Stream error: ' + err.message;
                c.data.isStreaming = false;
                c.data.isThinking  = false;
                assistantMsg.streaming = false;
            });
        });
    }

    function _readStream(reader, targetMsg) {
        const decoder = new TextDecoder('utf-8', { fatal: false });
        let lineBuffer = '';

        function pump() {
            reader.read().then(function(result) {
                if (result.done) {
                    // Flush any remaining buffer content
                    if (lineBuffer.trim()) {
                        const token = _parseLine(lineBuffer.trim());
                        if (token) targetMsg.content += token;
                    }
                    _finalizeMessage(targetMsg);
                    return;
                }

                const chunk = decoder.decode(result.value, { stream: true });
                lineBuffer += chunk;

                const lines = lineBuffer.split('\n');
                lineBuffer = lines.pop();   // hold the (possibly incomplete) last fragment

                let updated = false;
                lines.forEach(function(line) {
                    const token = _parseLine(line);
                    if (token !== null) {
                        targetMsg.content += token;
                        updated = true;
                    }
                });

                if (updated) {
                    targetMsg.html = $sce.trustAsHtml(_renderMarkdown(targetMsg.content));
                    _scrollToBottom();
                    $scope.$apply();
                }

                pump();
            });
        }

        pump();
    }

    // Handles both OpenAI SSE and Ollama NDJSON in one function.
    // Swap endpoints via sys_property without changing any code.
    function _parseLine(line) {
        line = line.trim();
        if (!line) return null;

        // ── OpenAI SSE: "data: {...}" or "data: [DONE]" ──────────────────────
        if (line.indexOf('data: ') === 0) {
            const payload = line.slice(6);
            if (payload === '[DONE]') return null;
            try {
                const parsed = JSON.parse(payload);
                const delta  = parsed.choices && parsed.choices[0] && parsed.choices[0].delta;
                return (delta && delta.content) || null;
            } catch (_) {
                return null;
            }
        }

        // ── Ollama NDJSON: "{...}" on a single line ───────────────────────────
        if (line.charAt(0) === '{') {
            try {
                const parsed = JSON.parse(line);
                if (parsed.done) return null;
                return (parsed.message && parsed.message.content) || parsed.response || null;
            } catch (_) {
                return null;
            }
        }

        return null;
    }

    function _finalizeMessage(msg) {
        msg.streaming = false;
        msg.html      = $sce.trustAsHtml(_renderMarkdown(msg.content));
        // Append only {role, content} to history — never html, safeContent, or streaming
        _conversationHistory.push({ role: 'assistant', content: msg.content });
        $scope.$apply(function() {
            c.data.isStreaming = false;
            c.data.isThinking  = false;
        });
        _scrollToBottom();
    }

    function _scrollToBottom() {
        $timeout(function() {
            const el = document.getElementById('llm-scroll-area');
            if (el) el.scrollTop = el.scrollHeight;
        }, 0);
    }

    function _resetTextareaHeight() {
        $timeout(function() {
            const el = document.getElementById('llm-textarea');
            if (el) el.style.height = 'auto';
        }, 0);
    }

    // Minimal safe markdown renderer.
    // Order is critical: code blocks → inline code → bold → italic → lists → line breaks.
    function _renderMarkdown(text) {
        let html = _escapeHtml(text);

        // Code blocks — must come before line-break conversion
        html = html.replace(/```(?:\w+)?\n?([\s\S]*?)```/g, function(_, code) {
            return '<pre class="llm-code"><code>' + code.replace(/^\n|\n$/g, '') + '</code></pre>';
        });

        // Inline code
        html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

        // Bold
        html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');

        // Italic (single asterisk, not adjacent to another)
        html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');

        // Unordered lists
        html = html.replace(/^[*\-] (.+)$/gm, '<li>$1</li>');
        // Wrap consecutive <li> elements in <ul>
        html = html.replace(/(<li>.*?<\/li>\n?)+/g, function(block) {
            return '<ul>' + block + '</ul>';
        });

        // Line breaks — after code blocks so <pre> newlines are preserved
        html = html.replace(/\n/g, '<br>');

        return html;
    }

    function _escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Auto-resize textarea (up to 160px) — set up once after DOM is ready
    $timeout(function() {
        const textarea = document.getElementById('llm-textarea');
        if (!textarea) return;
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 160) + 'px';
        });
    }, 0);
};
