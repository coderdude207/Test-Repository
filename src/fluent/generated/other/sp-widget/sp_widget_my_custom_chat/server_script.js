(function() {
	var LLM_ENDPOINT = 'https://ollama.solidprints.in/api/chat';
	var LLM_MODEL    = 'gpt-oss:20b-cloud';
	var API_KEY      = '967cac420466409583dfc46d374dcf11.9uB48_Ei_2m0cCNj4zz6yImA';

	if (input && input.serverAction) {
		// Client-triggered server action
		data.llmEndpoint = LLM_ENDPOINT;
		data.llmModel    = LLM_MODEL;
		data.apiKey      = API_KEY;

		var payload = {};
		if (input.actionPayload) {
			try { payload = JSON.parse(input.actionPayload); } catch (e) {}
		}

		if (input.serverAction === 'createConversation') {
			var convGr = new GlideRecord('x_643482_my_cust_0_conversations');
			convGr.setValue('title', payload.title || 'New conversation');
			data.newConversationSysId = convGr.insert();

		} else if (input.serverAction === 'createMessage') {
			var msgGr = new GlideRecord('x_643482_my_cust_0_conversations_messages');
			msgGr.setValue('conversation', payload.conversationSysId);
			msgGr.setValue('role', payload.role);
			msgGr.setValue('content', payload.content);
			msgGr.insert();

		} else if (input.serverAction === 'loadMessages') {
			var loadGr = new GlideRecord('x_643482_my_cust_0_conversations_messages');
			loadGr.addQuery('conversation', payload.conversationSysId);
			loadGr.orderBy('sys_created_on');
			loadGr.query();
			var msgs = [];
			while (loadGr.next()) {
				msgs.push({
					role:    loadGr.getValue('role'),
					content: loadGr.getValue('content'),
					sysId:   loadGr.getUniqueValue()
				});
			}
			data.loadedMessages = msgs;
		}

	} else {
		// Initial widget load — return config and recent conversations
		data.llmEndpoint = LLM_ENDPOINT;
		data.llmModel    = LLM_MODEL;
		data.apiKey      = API_KEY;

		var conversations = [];
		var recentsGr = new GlideRecord('x_643482_my_cust_0_conversations');
		recentsGr.orderByDesc('sys_created_on');
		recentsGr.setLimit(30);
		recentsGr.query();
		while (recentsGr.next()) {
			conversations.push({
				sysId:  recentsGr.getUniqueValue(),
				title:  recentsGr.getValue('title')
			});
		}
		data.conversations = conversations;
	}
})();
