(function() {

  /* =============================================================
     INITIAL DATA  (runs on every page load)
     ============================================================= */

  // ---- Current user ----
  var gr = new GlideRecord('sys_user');
  gr.get('sys_id', gs.getUserID());

  var firstName = gr.isValidRecord() ? (gr.getValue('first_name') || '') : '';
  var lastName  = gr.isValidRecord() ? (gr.getValue('last_name')  || '') : '';
  var fullName  = (firstName + ' ' + lastName).trim() || gs.getUserName();
var email=gr.getValue('email');
  data.userName     = fullName;
  data.firstName    = firstName || fullName;   // used in greeting: "Hey there, [firstName]"
  data.userInitials = ((firstName ? firstName.charAt(0) : '') + (lastName ? lastName.charAt(0) : '')).toUpperCase() || fullName.charAt(0).toUpperCase();
  data.userDept     = gr.isValidRecord() ? (gr.getDisplayValue('department') || 'Employee') : 'Employee';
  data.userEmail    = email;

  // ---- Recent chats (last 5 incidents opened/updated by user) ----
  data.recentChats = [];
  var recentINC = new GlideRecord('incident');
  recentINC.addQuery('caller_id', gs.getUserID());
  recentINC.orderByDesc('sys_updated_on');
  recentINC.setLimit(5);
  recentINC.query();
  while (recentINC.next()) {
    data.recentChats.push({
      id:    recentINC.getUniqueValue(),
      title: recentINC.getValue('short_description') || 'Incident ' + recentINC.getDisplayValue('number'),
      number: recentINC.getDisplayValue('number'),
      state:  recentINC.getDisplayValue('state')
    });
  }

  /* =============================================================
     AJAX ACTIONS  (called from client via c.server.get())
     ============================================================= */

  if (input && input.action) {

    // ------------------------------------------------------------------
    // action: 'getIncidents'
    // Returns open incidents for the current user
    // ------------------------------------------------------------------
    if (input.action === 'getIncidents') {
      data.incidents = [];
      var inc = new GlideRecord('incident');
      inc.addQuery('caller_id', gs.getUserID());
      inc.addQuery('state', 'IN', '1,2,3');       // New, In Progress, On Hold
      inc.orderByDesc('sys_updated_on');
      inc.setLimit(10);
      inc.query();
      while (inc.next()) {
        data.incidents.push({
          number:      inc.getDisplayValue('number'),
          short_desc:  inc.getValue('short_description'),
          state:       inc.getDisplayValue('state'),
          priority:    inc.getDisplayValue('priority'),
          updated:     inc.getDisplayValue('sys_updated_on'),
          sys_id:      inc.getUniqueValue()
        });
      }
    }

    // ------------------------------------------------------------------
    // action: 'getRequests'
    // Returns open requests/catalog items for the current user
    // ------------------------------------------------------------------
    else if (input.action === 'getRequests') {
      data.requests = [];
      var req = new GlideRecord('sc_request');
      req.addQuery('requested_for', gs.getUserID());
      req.addQuery('state', 'IN', '1,2,3');
      req.orderByDesc('sys_updated_on');
      req.setLimit(10);
      req.query();
      while (req.next()) {
        data.requests.push({
          number:     req.getDisplayValue('number'),
          short_desc: req.getValue('short_description'),
          state:      req.getDisplayValue('request_state'),
          updated:    req.getDisplayValue('sys_updated_on'),
          sys_id:     req.getUniqueValue()
        });
      }
    }

    // ------------------------------------------------------------------
    // action: 'searchKB'
    // Full-text search of knowledge articles
    // ------------------------------------------------------------------
    else if (input.action === 'searchKB') {
      data.articles = [];
      var query = input.query || '';
      var kb = new GlideRecord('kb_knowledge');
      kb.addQuery('short_description', 'CONTAINS', query);
      kb.addQuery('workflow_state', 'published');
      kb.setLimit(5);
      kb.query();
      while (kb.next()) {
        data.articles.push({
          title:   kb.getValue('short_description'),
          number:  kb.getDisplayValue('number'),
          sys_id:  kb.getUniqueValue()
        });
      }
    }

    // ------------------------------------------------------------------
    // action: 'createIncident'
    // Creates a new incident on behalf of the user
    // ------------------------------------------------------------------
    else if (input.action === 'createIncident') {
      var newInc = new GlideRecord('incident');
      newInc.initialize();
      newInc.setValue('caller_id',         gs.getUserID());
      newInc.setValue('short_description', input.short_desc || 'Incident from Buddy widget');
      newInc.setValue('description',       input.description || '');
      newInc.setValue('priority',          input.priority   || '3');  // 3 = Moderate
      newInc.setValue('category',          input.category   || 'software');
      newInc.setValue('contact_type',      'self-service');
      var sysId = newInc.insert();
      data.created = {
        success: !!sysId,
        sys_id:  sysId,
        number:  sysId ? newInc.getDisplayValue('number') : null
      };
    }

    // ------------------------------------------------------------------
    // action: 'getVacationBalance'
    // Fetches leave balance (adjust table/field names for your HR setup)
    // ------------------------------------------------------------------
    else if (input.action === 'getVacationBalance') {
      // Example: reading from hr_leave_request or a custom table
      // Adjust field names to match your instance's HR module
      data.balance = {
        vacation:  14,   // Replace with GlideRecord lookup
        floating:  3,
        sick:      5
      };
      // Real example (uncomment & adapt):
      // var hrBalance = new GlideRecord('hr_leave_balance');
      // hrBalance.addQuery('employee', gs.getUserID());
      // hrBalance.query();
      // if (hrBalance.next()) {
      //   data.balance.vacation = hrBalance.getValue('vacation_remaining');
      // }
    }

    // ------------------------------------------------------------------
    // action: 'getUserProfile'
    // Returns enriched user profile data
    // ------------------------------------------------------------------
    else if (input.action === 'getUserProfile') {
      var gu = new GlideRecord('sys_user');
      gu.get('sys_id', gs.getUserID());
      data.profile = gu.isValidRecord() ? {
        name:       gu.getDisplayValue('name'),
        email:      gu.getValue('email'),
        department: gu.getDisplayValue('department'),
        manager:    gu.getDisplayValue('manager'),
        location:   gu.getDisplayValue('location'),
        phone:      gu.getValue('phone')
      } : {};
    }
  }

})();