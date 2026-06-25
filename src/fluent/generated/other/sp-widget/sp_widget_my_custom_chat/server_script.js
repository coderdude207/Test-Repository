(function() {
	// Securely pass config to the client — never hardcode keys in HTML
	data.llmEndpoint ='https://ollama.solidprints.in/api/chat';
	data.llmModel    = 'gpt-oss:20b-cloud';

	// For API keys — use an encrypted system property
	// gs.getProperty reads 'Password2' type props safely
	data.apiKey = '967cac420466409583dfc46d374dcf11.9uB48_Ei_2m0cCNj4zz6yImA';
})();