api.controller=
function($scope, $timeout, $sce) {

  var c = $scope.c;

  /* ============================================================
     STATE
     ============================================================ */
  c.view             = 'home';   // 'home' | 'thread'
  c.dark             = false;
  c.thinking         = false;
  c.homeInput        = '';
  c.dockInput        = '';
  c.messages         = [];       // array of message objects (see buildReply)
  c.threadTitle      = '';
  c.activeRecentId   = null;
  c.activeNav        = 'chats';
  c.sidebarCollapsed = false;
  c.mobileSidebarOpen = false;

  /* ---- User data from server ---- */
  c.userName    = c.data.userName    || '';
  c.userDept    = c.data.userDept    || '';
  c.userInitials = c.data.userInitials || '';
  // First name only for greeting
  c.firstName   = c.data.firstName   || c.userName;

  /* ---- Recent chats from server (last 5 incidents) ---- */
  c.recentChats = c.data.recentChats || [];

  /* ---- Icon set — exact SVGs from the original Buddy design (ic object) ---- */
  var ic = {
    key:    $sce.trustAsHtml('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="M10.8 12.2 19 4M16 7l3 3M14 9l2 2"/></svg>'),
    ticket: $sce.trustAsHtml('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4 2 2 0 0 0 0-4Z"/><path d="M14 6v12"/></svg>'),
    laptop: $sce.trustAsHtml('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 20h20"/></svg>'),
    people: $sce.trustAsHtml('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.5a3 3 0 0 1 0 5.6M18 20a6 6 0 0 0-3-5.2"/></svg>'),
    list:   $sce.trustAsHtml('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>')
  };

  /* ---- Quick-action chips — exact set from original design with ic SVGs ---- */
  c.chips = [
    { icon: ic.key,    label: 'Reset my password',  prompt: 'How do I reset my network password?'              },
    { icon: ic.ticket, label: 'Raise a ticket',      prompt: 'I need to raise an IT support ticket'            },
    { icon: ic.list,   label: 'My requests',         prompt: 'Show me the status of my open requests'         },
    { icon: ic.people, label: 'HR questions',        prompt: 'How many vacation days do I have left this year?' },
    { icon: ic.laptop, label: 'Request equipment',   prompt: 'I need to request equipment from the catalog'    }
  ];

  /* ---- Restore persisted theme ---- */
  try { if (localStorage.getItem('bdy_dark') === '1') { c.dark = true; } } catch(e) {}

  /* ============================================================
     THEME
     ============================================================ */
  c.toggleTheme = function() {
    c.dark = !c.dark;
    try { localStorage.setItem('bdy_dark', c.dark ? '1' : '0'); } catch(e) {}
  };

  /* ============================================================
     SIDEBAR
     Single toggle works for both desktop (collapse/expand) and
     mobile (drawer open/close).  CSS handles the difference via
     media query — on mobile the sidebar is position:fixed and
     uses transform; on desktop it uses width transition.
     ============================================================ */
  c.toggleSidebar = function() {
    if (window.innerWidth <= 680) {
      c.mobileSidebarOpen = !c.mobileSidebarOpen;
    } else {
      c.sidebarCollapsed = !c.sidebarCollapsed;
    }
  };
  c.closeMobileSidebar = function() {
    c.mobileSidebarOpen = false;
  };

  /* ============================================================
     NAVIGATION
     ============================================================ */
  c.showHome = function() {
    c.view           = 'home';
    c.messages       = [];
    c.threadTitle    = '';
    c.activeRecentId = null;
    c.activeNav      = 'chats';
    c.closeMobileSidebar();
    $timeout(function() {
      var el = document.getElementById('bdy-home-field');
      if (el) { el.focus(); }
    }, 80);
  };

  c.newChat = function() {
    c.showHome();
  };

  c.navigate = function(dest) {
    c.activeNav = dest;
    c.closeMobileSidebar();
    // Start a conversation scoped to the destination
    var prompts = {
      requests: 'Show me the status of my open requests',
      kb:       'Show me useful IT knowledge articles'
    };
    if (prompts[dest]) { c.startConversation(prompts[dest]); }
  };

  /* ============================================================
     RECENT CHATS
     Each chat object has: { id, title, number, state }
     Clicking one opens a fresh thread pre-seeded with the
     incident short_description as the user prompt, then responds.
     ============================================================ */
  c.loadRecentChat = function(chat) {
    if (c.thinking) { return; }
    c.threadTitle    = chat.title;
    c.messages       = [];
    c.view           = 'thread';
    c.activeRecentId = chat.id;
    c.activeNav      = 'chats';
    c.closeMobileSidebar();

    // Show the original incident title as a user message, then respond
    c.messages.push({ role: 'user', text: chat.title });
    c.scrollThread();
    c.respond(chat.title);
  };

  /* ============================================================
     CONVERSATION ENGINE
     ============================================================ */
  c.startConversation = function(text) {
    if (c.thinking) { return; }
    c.threadTitle    = text.length > 48 ? text.slice(0,48) + '…' : text;
    c.messages       = [];
    c.view           = 'thread';
    c.activeRecentId = null;
    c.messages.push({ role: 'user', text: text });
    c.scrollThread();
    c.respond(text);
  };

  c.sendInThread = function(text) {
    if (c.thinking || !text.trim()) { return; }
    c.messages.push({ role: 'user', text: text });
    c.scrollThread();
    c.respond(text);
  };

  c.respond = function(text) {
    c.thinking = true;
    c.scrollThread();

    $timeout(function() {
      var reply = buildReply(text);
      c.messages.push(reply);
      c.thinking = false;
      c.scrollThread();
    }, 1300);

    /* --- Replace the $timeout above with a live server call: ---
    c.server.get({ action: 'chat', text: text }).then(function(r) {
      c.messages.push(r.data.reply);
      c.thinking = false;
      c.scrollThread();
    });
    ------------------------------------------------------------ */
  };

  /* ============================================================
     SCROLL
     ============================================================ */
  c.scrollThread = function() {
    $timeout(function() {
      var el = document.getElementById('bdy-thread');
      if (el) { el.scrollTop = el.scrollHeight; }
    }, 40);
  };

  /* ============================================================
     INPUT HANDLERS
     ============================================================ */
  c.homeKeyDown = function($event) {
    if ($event.key === 'Enter' && !$event.shiftKey) {
      $event.preventDefault();
      c.homeSubmit();
    }
  };
  c.dockKeyDown = function($event) {
    if ($event.key === 'Enter' && !$event.shiftKey) {
      $event.preventDefault();
      c.dockSubmit();
    }
  };
  c.homeSubmit = function() {
    var v = (c.homeInput || '').trim();
    if (!v) { return; }
    c.homeInput = '';
    c.startConversation(v);
  };
  c.dockSubmit = function() {
    var v = (c.dockInput || '').trim();
    if (!v || c.thinking) { return; }
    c.dockInput = '';
    c.sendInThread(v);
  };

  /* ============================================================
     INTENT MATCHING
     Returns a plain data object — NO HTML strings.
     The template (ng-if on msg.type) does all rendering.

     Message shape:
       { role:'bot', type:'text',  html: $sce.trustAsHtml('...') }
       { role:'bot', type:'steps', intro:'...', steps:[], outro:'...' }
       { role:'bot', type:'list',  intro:'...', items:[], outro:'...' }
       { role:'bot', type:'cards', intro:'...', cards:[], outro:'...' }
     ============================================================ */
  function buildReply(text) {
    var t = text.toLowerCase();

    /* Password reset */
    if (has(t, ['password', 'reset password', 'forgot password', 'vpn password', 'locked out'])) {
      return {
        role: 'bot', type: 'steps',
        intro: 'Happy to help you reset your network password. Here\'s the quickest way:',
        steps: [
          'Go to the <strong>Self-Service Portal</strong> and choose <code>Reset Password</code>.',
          'Verify your identity with the code sent to your registered mobile.',
          'Enter a new password (12+ characters, one number, one symbol).',
          'Sign out and back in on all your devices.'
        ],
        outro: 'Want me to open the reset flow for you, or raise a ticket if you\'re locked out?'
      };
    }

    /* Wi-Fi / network connectivity */
    if (has(t, ['wi-fi', 'wifi', 'wireless', 'cannot connect', 'not connecting', 'network issue'])) {
      return {
        role: 'bot', type: 'cards',
        intro: 'Got it — I\'ve drafted an incident for your connectivity issue:',
        cards: [
          { icon: ic.laptop, title: 'Laptop won\'t connect to Wi-Fi', sub: 'Category: Hardware · Priority: Medium', statusKey: 'open', statusText: 'Draft' }
        ],
        outro: 'This will be routed to the End-User Computing team. Typical first response is under 2 hours. Shall I submit it?'
      };
    }

    /* Check open requests / incidents */
    if (has(t, ['status', 'open request', 'my request', 'my ticket', 'my incident', 'check request', 'show me'])) {
      // Populate cards from server data if available, otherwise show empty state
      var incCards = [];
      if (c.data.incidents && c.data.incidents.length > 0) {
        incCards = c.data.incidents.map(function(i) {
          return {
            icon: ic.ticket,
            title: i.number + ' · ' + i.short_desc,
            sub: 'Priority: ' + i.priority + ' · Updated: ' + i.updated,
            statusKey: i.state === 'In Progress' ? 'prog' : (i.state === 'Resolved' ? 'done' : 'open'),
            statusText: i.state
          };
        });
      }
      if (incCards.length === 0) {
        return {
          role: 'bot', type: 'text',
          html: $sce.trustAsHtml('<p>You have no open incidents right now. Would you like to <strong>raise a new ticket</strong>?</p>')
        };
      }
      return {
        role: 'bot', type: 'cards',
        intro: 'Here are your open items:',
        cards: incCards,
        outro: 'Want me to nudge an approver or open any of these in detail?'
      };
    }

    /* Vacation / leave balance */
    if (has(t, ['vacation', 'leave', 'holiday', 'pto', 'time off', 'days remaining', 'days left', 'annual leave'])) {
      var vac = c.data.balance || {};
      var vacDays  = vac.vacation  !== undefined ? vac.vacation  : '—';
      var floatDays = vac.floating !== undefined ? vac.floating  : '—';
      return {
        role: 'bot', type: 'text',
        html: $sce.trustAsHtml(
          '<p>You currently have <strong>' + vacDays + ' vacation day' + (vacDays === 1 ? '' : 's') + '</strong> remaining' +
          (floatDays !== '—' ? ', plus <strong>' + floatDays + ' floating holiday' + (floatDays === 1 ? '' : 's') + '</strong>' : '') + '.</p>' +
          '<p>Would you like me to <strong>start a new time-off request</strong> or show the team calendar?</p>'
        )
      };
    }

    /* Equipment / catalog order */
    if (has(t, ['charger', 'equipment', 'order', 'catalog', 'monitor', 'keyboard', 'mouse', 'headset', 'docking', 'webcam'])) {
      return {
        role: 'bot', type: 'cards',
        intro: 'Sure — I can help you order that. Standard catalog items need no approval:',
        cards: [
          { icon: ic.laptop, title: 'Service Catalog', sub: 'Browse & order hardware, software, and accessories', statusKey: 'open', statusText: 'Ready' }
        ],
        outro: 'Shall I open the catalog for you, or tell me what you need and I\'ll find it?'
      };
    }

    /* Knowledge Base search */
    if (has(t, ['knowledge', 'kb', 'article', 'how to', 'guide', 'tutorial', 'documentation', 'help article'])) {
      var kbIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;width:14px;height:14px;margin-right:5px"><path d="M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M14 3v6h6"/></svg>';
      var kbItems = [];
      if (c.data.articles && c.data.articles.length > 0) {
        kbItems = c.data.articles.map(function(a) {
          return kbIcon + '<strong>' + a.title + '</strong> — ' + a.number;
        });
      } else {
        kbItems = [
          kbIcon + 'Use the search bar above to find KB articles, or describe your issue and I\'ll search for you.'
        ];
      }
      return {
        role: 'bot', type: 'list',
        intro: 'Here are some knowledge articles that may help:',
        items: kbItems.map(function(i) { return $sce.trustAsHtml(i); }),
        outro: 'Want me to search for something more specific?'
      };
    }

    /* New ticket / raise incident */
    if (has(t, ['ticket', 'incident', 'raise', 'log', 'create', 'submit', 'report', 'raise a'])) {
      return {
        role: 'bot', type: 'steps',
        intro: 'I can raise a ticket for you. To get started, could you tell me:',
        steps: [
          'What\'s the issue or request in one sentence?',
          'How urgent is it — Low, Medium, or High?',
          'Which device or system is affected (if any)?'
        ],
        outro: 'Or just describe the problem and I\'ll fill in the details automatically.'
      };
    }

    /* Fallback */
    return {
      role: 'bot', type: 'list',
      intro: 'I can help you with:',
      items: [
        $sce.trustAsHtml('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;width:14px;height:14px;margin-right:6px"><circle cx="8" cy="15" r="4"/><path d="M10.8 12.2 19 4M16 7l3 3M14 9l2 2"/></svg><strong>Password &amp; account resets</strong>'),
        $sce.trustAsHtml('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;width:14px;height:14px;margin-right:6px"><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4 2 2 0 0 0 0-4Z"/><path d="M14 6v12"/></svg><strong>Raising IT support tickets</strong>'),
        $sce.trustAsHtml('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;width:14px;height:14px;margin-right:6px"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg><strong>Checking your open requests</strong>'),
        $sce.trustAsHtml('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;width:14px;height:14px;margin-right:6px"><rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 20h20"/></svg><strong>Ordering from the service catalog</strong>'),
        $sce.trustAsHtml('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;width:14px;height:14px;margin-right:6px"><circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.5a3 3 0 0 1 0 5.6M18 20a6 6 0 0 0-3-5.2"/></svg><strong>HR &amp; vacation questions</strong>'),
        $sce.trustAsHtml('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;width:14px;height:14px;margin-right:6px"><path d="M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M14 3v6h6"/></svg><strong>Searching the Knowledge Base</strong>')
      ],
      outro: 'What would you like to do?'
    };
  }

  /* ---- keyword helper ---- */
  function has(text, terms) {
    return terms.some(function(term) { return text.indexOf(term) > -1; });
  }

}
