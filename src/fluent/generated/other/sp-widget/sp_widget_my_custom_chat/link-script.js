function link(scope, element, attrs, controller) {
	// Inject Google Fonts for Fraunces (serif) and Inter (sans) used by the Buddy design
	if (!document.getElementById('buddy-fonts')) {
		var link = document.createElement('link');
		link.id   = 'buddy-fonts';
		link.rel  = 'stylesheet';
		link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;450;500;600&display=swap';
		document.head.appendChild(link);
	}
}
