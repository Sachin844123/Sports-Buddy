// js/ui.js
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import { auth } from './firebase.js';
import {
  registerUser,
  loginUser,
  logoutUser,
  requestPasswordReset,
  fetchUserProfile
} from './auth.js';
import { addEvent, getEventsNearby, deleteEvent, updateEvent, getEvent, getAllEvents, getEventLocations, findSimilarLocations, getRandomEventSuggestions } from './events.js';
import { listSports } from './admin.js';

const state = {
  user: null,
  profile: null,
  editingEventId: null
};

export function initUI() {
  wireAuthTabs();
  wirePasswordToggles();
  wireForms();
  observeAuthState();
}

function wireAuthTabs() {
  const tabs = document.querySelectorAll('[data-auth-tab]');
  const panels = document.querySelectorAll('[data-auth-panel]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.toggle('active', t === tab));
      panels.forEach(panel => {
        panel.hidden = panel.dataset.authPanel !== tab.dataset.authTab;
      });
    });
  });
}

function wirePasswordToggles() {
  document.querySelectorAll('[data-toggle-password]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.togglePassword;
      const input = document.getElementById(targetId);
      if (!input) return;
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      btn.textContent = isHidden ? 'Hide' : 'Show';
    });
  });
}

function wireForms() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const btnForgot = document.getElementById('btn-forgot-password');
  const btnAddEvent = document.getElementById('btn-add-event');
  const btnRefreshEvents = document.getElementById('btn-refresh-events');
  const btnShowAllEvents = document.getElementById('btn-show-all-events');

  const btnLogout = document.getElementById('btn-logout');
  const cityInput = document.getElementById('ev-city');
  const areaInput = document.getElementById('ev-area');
  const eventsList = document.getElementById('events-list');

  loginForm?.addEventListener('submit', async (evt) => {
    evt.preventDefault();
    const submitBtn = evt.target.querySelector('button[type="submit"]');
    
    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
      }
      
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value.trim();
      
      await loginUser(email, password);
      showMessage('Welcome back! Redirecting...', 'success');
      
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
      
    } catch (err) {
      showMessage(err.message, 'error');
      
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
      }
    }
  });

  registerForm?.addEventListener('submit', async (evt) => {
    evt.preventDefault();
    const submitBtn = evt.target.querySelector('button[type="submit"]');
    
    const password = document.getElementById('register-password').value.trim();
    const confirm = document.getElementById('register-password-confirm').value.trim();
    
    if (password !== confirm) {
      showMessage('Passwords do not match.', 'error');
      return;
    }
    
    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
      }
      
      await registerUser({
        email: document.getElementById('register-email').value.trim(),
        password,
        displayName: document.getElementById('register-name').value.trim(),
        skillLevel: document.getElementById('register-skill').value
      });
      
      showMessage('Account created successfully! Redirecting to login...', 'success');
      
      setTimeout(() => {
        window.location.href = 'login.html?registered=true';
      }, 1500);
      
    } catch (err) {
      showMessage(err.message, 'error');
      
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
      }
    }
  });

  btnForgot?.addEventListener('click', async () => {
    try {
      const email = document.getElementById('login-email').value.trim();
      await requestPasswordReset(email);
      showMessage('Password reset email sent. Please check your inbox.', 'success');
    } catch (err) {
      showMessage(err.message, 'error');
    }
  });

  // LOGOUT BUTTON HANDLER
  btnLogout?.addEventListener('click', async () => {
    try {
      await logoutUser();
      window.location.href = 'login.html';
    } catch (err) {
      console.error('Logout error:', err);
      showMessage('Logout failed. Please try again.', 'error');
    }
  });

  // ADD/UPDATE EVENT BUTTON HANDLER
  btnAddEvent?.addEventListener('click', async () => {
    try {
      const name = document.getElementById('ev-name').value.trim();
      const sport = document.getElementById('ev-sport').value;
      const city = cityInput?.value.trim();
      const area = areaInput?.value.trim();
      const date = document.getElementById('ev-date').value;
      const desc = document.getElementById('ev-desc').value.trim();

      if (!name || !sport || !city || !area || !date) {
        showMessage('Please fill all required fields.', 'error', 'event-feedback');
        return;
      }

      const eventData = { name, sport, city, area, date, desc };

      if (state.editingEventId) {
        // Update existing event
        await updateEvent(state.editingEventId, eventData);
        showMessage('Event updated!', 'success', 'event-feedback');
        state.editingEventId = null;
        btnAddEvent.textContent = 'Add event';
      } else {
        // Create new event
        await addEvent(auth.currentUser.uid, eventData);
        showMessage('Event added!', 'success', 'event-feedback');
      }

      clearEventForm();
      await renderEventsList(eventsList, city, area);
    } catch (err) {
      console.error('Add/Update event error:', err);
      showMessage(err.message, 'error', 'event-feedback');
    }
  });

  // REFRESH EVENTS BUTTON HANDLER
  btnRefreshEvents?.addEventListener('click', async () => {
    try {
      const city = cityInput?.value.trim();
      const area = areaInput?.value.trim();
      if (!city || !area) {
        showMessage('Please enter both city and area to search for events.', 'error', 'event-feedback');
        return;
      }
      
      // Show helpful message about case sensitivity
      showMessage('Searching for events... Note: City and area names must match exactly.', 'info', 'event-feedback');
      await renderEventsList(eventsList, city, area);
      showMessage('Events refreshed.', 'success', 'event-feedback');
    } catch (err) {
      showMessage(err.message, 'error', 'event-feedback');
    }
  });

  // SHOW ALL EVENTS BUTTON HANDLER (for admin)
  btnShowAllEvents?.addEventListener('click', async () => {
    try {
      showMessage('Loading all events...', 'info', 'event-feedback');
      
      const allEvents = await getAllEvents();
      
      if (!allEvents.length) {
        showMessage('No events found in the database.', 'warning', 'event-feedback');
        eventsList.innerHTML = `
          <div style="text-align: center; padding: 40px 20px; color: var(--text-light);">
            <div style="font-size: 3rem; margin-bottom: 16px; color: var(--primary);">
              <i class="fas fa-calendar-times"></i>
            </div>
            <h3 style="margin: 0 0 8px 0; color: var(--text);">No events in database</h3>
            <p style="margin: 0;">Create the first event using the form above.</p>
          </div>
        `;
        return;
      }

      // Clear city and area inputs to show we're not filtering
      if (cityInput) cityInput.value = '';
      if (areaInput) areaInput.value = '';
      
      // Render all events
      await renderAllEventsList(eventsList, allEvents);
      showMessage(`Showing all ${allEvents.length} events from the database (not filtered by location).`, 'success', 'event-feedback');
      
    } catch (err) {
      console.error('Show all events error:', err);
      showMessage('Failed to load all events: ' + err.message, 'error', 'event-feedback');
    }
  });

  eventsList?.addEventListener('click', async (evt) => {
    const btn = evt.target.closest('button');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (!action || !id) return;

    if (action === 'delete-event') {
      if (!confirm('Delete this event?')) return;
      try {
        await deleteEvent(auth.currentUser.uid, id);
        showMessage('Event deleted.', 'success', 'event-feedback');
        await renderEventsList(eventsList, cityInput.value.trim(), areaInput.value.trim());
      } catch (err) {
        showMessage(err.message, 'error', 'event-feedback');
      }
    }

    if (action === 'edit-event') {
      try {
        const ev = await getEvent(id);
        if (!ev) return;

        const nameInput = document.getElementById('ev-name');
        const sportInput = document.getElementById('ev-sport');
        const dateInput = document.getElementById('ev-date');
        const descInput = document.getElementById('ev-desc');

        if (!nameInput || !sportInput || !cityInput || !areaInput || !dateInput || !descInput) {
          console.warn('Event form elements not found, cannot edit.');
          showMessage('Event form not available on this page.', 'error');
          return;
        }

        nameInput.value = ev.name;
        sportInput.value = ev.sport;
        cityInput.value = ev.city;
        areaInput.value = ev.area;
        dateInput.value = ev.date;
        descInput.value = ev.desc || '';

        state.editingEventId = id;
        if (btnAddEvent) btnAddEvent.textContent = 'Update event';

        const eventSection = document.getElementById('event-section');
        if (eventSection) eventSection.scrollIntoView({ behavior: 'smooth' });

        showMessage('Editing event...', 'info', 'event-feedback');
      } catch (err) {
        console.error(err);
        showMessage('Failed to load event for editing.', 'error', 'event-feedback');
      }
    }
  });
}

function observeAuthState() {
  const authSection = document.getElementById('auth-section');
  const eventSection = document.getElementById('event-section');
  const roleBanner = document.getElementById('role-banner');
  const userArea = document.getElementById('user-area');
  const adminLink = document.getElementById('nav-admin-link');
  const roleChip = document.getElementById('role-chip');
  const roleTitle = document.getElementById('role-title');
  const roleCopy = document.getElementById('role-copy');
  const roleAdminLink = document.getElementById('role-admin-link');
  const btnLogout = document.getElementById('btn-logout');

  onAuthStateChanged(auth, async (user) => {
    state.user = user;
    if (user) {
      const profile = await fetchUserProfile(user.uid);
      state.profile = profile;
      if (authSection) authSection.hidden = true;
      if (eventSection) eventSection.hidden = false;
      if (roleBanner) roleBanner.hidden = false;
      if (btnLogout) btnLogout.hidden = false;
      const role = profile?.role || 'user';
      if (userArea) userArea.textContent = profile?.displayName || user.email;
      if (roleChip) roleChip.textContent = role.toUpperCase();
      if (roleTitle) roleTitle.textContent = `Signed in as ${profile?.displayName || user.email}`;
      if (roleCopy) roleCopy.textContent = role === 'admin'
        ? 'You can manage sports, cities, and areas from the admin console.'
        : 'Create events, find local buddies, and keep your calendar active.';
      if (adminLink) adminLink.hidden = role !== 'admin';
      if (roleAdminLink) roleAdminLink.hidden = role !== 'admin';
      await populateSportsDropdown();
      await renderEventsList(
        document.getElementById('events-list'),
        document.getElementById('ev-city')?.value.trim(),
        document.getElementById('ev-area')?.value.trim()
      );
      
      // Load event suggestions
      await loadEventSuggestions();
    } else {
      if (authSection) authSection.hidden = false;
      if (eventSection) eventSection.hidden = true;
      if (roleBanner) roleBanner.hidden = true;
      if (btnLogout) btnLogout.hidden = true;
      if (adminLink) adminLink.hidden = true;
      if (roleAdminLink) roleAdminLink.hidden = true;
      if (userArea) userArea.textContent = '';
      state.profile = null;
    }
  });
}

async function populateSportsDropdown() {
  const sel = document.getElementById('ev-sport');
  if (!sel) return;
  sel.innerHTML = '<option value="">Select sport</option>';
  try {
    const arr = await listSports();
    arr.forEach(s => {
      const o = document.createElement('option');
      o.value = s.name;
      o.textContent = s.name;
      sel.appendChild(o);
    });
    if (arr.length === 0) {
      const o = document.createElement('option');
      o.value = 'custom';
      o.textContent = 'Add sport via admin';
      sel.appendChild(o);
    }
  } catch (err) {
    console.error('Failed to load sports', err);
  }
}

async function renderEventsList(container, city, area) {
  if (!container) {
    return;
  }
  
  if (!city || !area) {
    container.innerHTML = '';
    return;
  }

  // Show loading state
  container.innerHTML = '<div class="loading">Loading events...</div>';
  
  try {
    console.log('Searching for events in:', city, area);
    const events = await getEventsNearby(city, area);
    console.log('Events found:', events);
    
    if (!events.length) {
      // Try to find similar locations to suggest
      const { findSimilarLocations } = await import('./events.js');
      const suggestions = await findSimilarLocations(city, area);
      
      let suggestionHtml = '';
      if (suggestions.allCities.length > 0) {
        suggestionHtml = `
          <div style="margin-top: 16px; padding: 16px; background: var(--bg-secondary); border-radius: 8px; text-align: left;">
            <strong>Available locations:</strong><br>
            <strong>Cities:</strong> ${suggestions.allCities.join(', ')}<br>
            <strong>Areas:</strong> ${suggestions.allAreas.join(', ')}
          </div>
        `;
      }
      
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-light);">
          <div style="font-size: 3rem; margin-bottom: 16px; color: var(--primary);">
            <i class="fas fa-running"></i>
          </div>
          <h3 style="margin: 0 0 8px 0; color: var(--text);">No events found</h3>
          <p style="margin: 0;">No events found for "${city}, ${area}"</p>
          <p style="margin: 8px 0 0 0; font-size: 0.9rem; color: var(--text-light);">
            Try checking the spelling or use the debug button to see available locations.
          </p>
          ${suggestionHtml}
        </div>
      `;
      return;
    }

    container.innerHTML = '';

    const currentUser = state.user;
    const userProfile = state.profile;
    const isAdmin = userProfile?.role === 'admin';

    events.forEach(ev => {
      const isOwner = currentUser && currentUser.uid === ev.createdBy;
      const canEdit = isOwner || isAdmin;

      const card = document.createElement('div');
      card.className = 'card';

      const sportIcon = getSportIcon(ev.sport);
      const dateFormatted = formatDate(ev.date);

      let actionsHtml = '';
      if (canEdit) {
        actionsHtml = `
          <div class="event-actions">
            <button class="pill-btn secondary" data-action="edit-event" data-id="${ev.id}">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button class="pill-btn danger" data-action="delete-event" data-id="${ev.id}">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="event-header">
          <h3 class="event-title">${ev.name}</h3>
          <span class="event-sport">
            <i class="${sportIcon}"></i> ${ev.sport}
          </span>
        </div>
        <div class="event-details">
          <div class="event-detail">
            <i class="fas fa-calendar-alt"></i>
            <span>${dateFormatted}</span>
          </div>
          <div class="event-detail">
            <i class="fas fa-map-marker-alt"></i>
            <span>${ev.city}, ${ev.area}</span>
          </div>
        </div>
        ${ev.desc ? `<div class="event-description">${ev.desc}</div>` : ''}
        ${actionsHtml}
      `;
      
      container.appendChild(card);
    });

  } catch (err) {
    container.innerHTML = `
      <div class="status error">
        Failed to load events: ${err.message}
      </div>
    `;
  }
}

function getSportIcon(sport) {
  const sportIcons = {
    'football': 'fas fa-futbol',
    'soccer': 'fas fa-futbol',
    'basketball': 'fas fa-basketball-ball',
    'tennis': 'fas fa-tennis-ball',
    'badminton': 'fas fa-shuttlecock',
    'cricket': 'fas fa-baseball-ball',
    'volleyball': 'fas fa-volleyball-ball',
    'table tennis': 'fas fa-table-tennis',
    'ping pong': 'fas fa-table-tennis',
    'swimming': 'fas fa-swimmer',
    'running': 'fas fa-running',
    'cycling': 'fas fa-biking',
    'gym': 'fas fa-dumbbell',
    'fitness': 'fas fa-dumbbell',
    'yoga': 'fas fa-spa',
    'boxing': 'fas fa-fist-raised',
    'golf': 'fas fa-golf-ball',
    'hockey': 'fas fa-hockey-puck',
    'baseball': 'fas fa-baseball-ball',
    'american football': 'fas fa-football-ball'
  };
  
  const lowerSport = sport.toLowerCase();
  for (const [key, icon] of Object.entries(sportIcons)) {
    if (lowerSport.includes(key)) {
      return icon;
    }
  }
  return 'fas fa-trophy'; // Default sports icon
}

async function renderAllEventsList(container, events) {
  if (!container) {
    return;
  }

  container.innerHTML = '';

  // Add header indicating all events are shown
  const allEventsHeader = document.createElement('div');
  allEventsHeader.className = 'all-events-header';
  allEventsHeader.innerHTML = `
    <div style="background: var(--primary); color: white; padding: 12px 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
      <i class="fas fa-globe"></i> Showing All Events (${events.length} total)
    </div>
  `;
  container.appendChild(allEventsHeader);

  const currentUser = state.user;
  const userProfile = state.profile;
  const isAdmin = userProfile?.role === 'admin';

  // Group events by city for better organization
  const eventsByCity = {};
  events.forEach(ev => {
    const city = ev.city || 'Unknown City';
    if (!eventsByCity[city]) {
      eventsByCity[city] = [];
    }
    eventsByCity[city].push(ev);
  });

  // Render events grouped by city
  Object.keys(eventsByCity).sort().forEach(city => {
    // Add city header
    const cityHeader = document.createElement('div');
    cityHeader.className = 'city-header';
    cityHeader.innerHTML = `
      <h3 style="color: var(--primary); margin: 20px 0 10px 0; font-size: 1.2rem; display: flex; align-items: center; gap: 8px;">
        <i class="fas fa-city"></i> ${city} (${eventsByCity[city].length} events)
      </h3>
    `;
    container.appendChild(cityHeader);

    // Render events for this city
    eventsByCity[city].forEach(ev => {
      const isOwner = currentUser && currentUser.uid === ev.createdBy;
      const canEdit = isOwner || isAdmin;

      const card = document.createElement('div');
      card.className = 'card';
      card.style.marginLeft = '20px'; // Indent under city header

      const sportIcon = getSportIcon(ev.sport);
      const dateFormatted = formatDate(ev.date);

      let actionsHtml = '';
      if (canEdit) {
        actionsHtml = `
          <div class="event-actions">
            <button class="pill-btn secondary" data-action="edit-event" data-id="${ev.id}">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button class="pill-btn danger" data-action="delete-event" data-id="${ev.id}">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="event-header">
          <h3 class="event-title">${ev.name}</h3>
          <span class="event-sport">
            <i class="${sportIcon}"></i> ${ev.sport}
          </span>
        </div>
        <div class="event-details">
          <div class="event-detail">
            <i class="fas fa-calendar-alt"></i>
            <span>${dateFormatted}</span>
          </div>
          <div class="event-detail">
            <i class="fas fa-map-marker-alt"></i>
            <span>${ev.city}, ${ev.area}</span>
          </div>
          <div class="event-detail">
            <i class="fas fa-user"></i>
            <span>Created by: ${ev.createdBy || 'Unknown'}</span>
          </div>
        </div>
        ${ev.desc ? `<div class="event-description">${ev.desc}</div>` : ''}
        ${actionsHtml}
      `;
      
      container.appendChild(card);
    });
  });
}

async function loadEventSuggestions() {
  const suggestionsContainer = document.getElementById('suggestions-list');
  if (!suggestionsContainer) return;

  try {
    const suggestions = await getRandomEventSuggestions(3);
    
    if (suggestions.length === 0) {
      suggestionsContainer.innerHTML = `
        <div class="no-suggestions">
          <div style="text-align: center; padding: 30px 20px; color: var(--text-light);">
            <div style="font-size: 2rem; margin-bottom: 12px; color: var(--primary);">
              <i class="fas fa-calendar-plus"></i>
            </div>
            <p style="margin: 0; font-size: 0.9rem;">No events available yet. Check back later for suggestions!</p>
          </div>
        </div>
      `;
      return;
    }

    suggestionsContainer.innerHTML = '';
    
    suggestions.forEach(event => {
      const suggestionCard = document.createElement('div');
      suggestionCard.className = 'suggestion-card';
      
      const sportIcon = getSportIcon(event.sport);
      const dateFormatted = formatDate(event.date);
      
      suggestionCard.innerHTML = `
        <div class="suggestion-header">
          <div class="suggestion-sport">
            <i class="${sportIcon}"></i>
          </div>
          <div class="suggestion-info">
            <h4 class="suggestion-title">${event.name}</h4>
            <p class="suggestion-sport-name">${event.sport}</p>
          </div>
        </div>
        <div class="suggestion-details">
          <div class="suggestion-detail">
            <i class="fas fa-map-marker-alt"></i>
            <span>${event.city}, ${event.area}</span>
          </div>
          <div class="suggestion-detail">
            <i class="fas fa-calendar-alt"></i>
            <span>${dateFormatted}</span>
          </div>
        </div>
        ${event.desc ? `<div class="suggestion-description">${event.desc}</div>` : ''}
        <div class="suggestion-actions">
          <button class="suggestion-btn" onclick="copySuggestionToSearch('${event.city}', '${event.area}')">
            <i class="fas fa-search"></i> Find Similar
          </button>
        </div>
      `;
      
      suggestionsContainer.appendChild(suggestionCard);
    });
    
  } catch (error) {
    console.error('Error loading suggestions:', error);
    suggestionsContainer.innerHTML = `
      <div class="error-suggestions">
        <p style="color: var(--error); text-align: center; padding: 20px;">
          <i class="fas fa-exclamation-triangle"></i> Failed to load suggestions
        </p>
      </div>
    `;
  }
}

// Function to copy suggestion location to search form
function copySuggestionToSearch(city, area) {
  const cityInput = document.getElementById('ev-city');
  const areaInput = document.getElementById('ev-area');
  
  if (cityInput && areaInput) {
    cityInput.value = city;
    areaInput.value = area;
    
    // Scroll to the search form
    document.querySelector('.location-filters').scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
    
    // Show a helpful message
    showMessage(`Location set to ${city}, ${area}. Click "Find Events" to search!`, 'info', 'event-feedback');
  }
}

// Make the function globally available
window.copySuggestionToSearch = copySuggestionToSearch;

function formatDate(value) {
  if (!value) return 'Date TBD';
  try {
    return new Date(value).toLocaleString();
  } catch (err) {
    return value;
  }
}

function clearEventForm() {
  ['ev-name', 'ev-date', 'ev-desc'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function showMessage(text, type = 'info', targetId = 'message-area') {
  const el = document.getElementById(targetId);
  if (!el) return;
  
  if (!text) {
    el.textContent = '';
    el.className = 'status';
    el.hidden = true;
    return;
  }
  
  el.hidden = false;
  el.textContent = text;
  el.className = `status ${type === 'success' ? 'success' : type === 'error' ? 'error' : type === 'warning' ? 'warning' : ''}`;
  
  // Auto-hide success messages after 3 seconds
  if (type === 'success') {
    setTimeout(() => {
      if (el.textContent === text) {
        el.hidden = true;
      }
    }, 3000);
  }
}

function setButtonLoading(buttonId, loading = true) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  
  if (loading) {
    btn.disabled = true;
    btn.classList.add('loading');
    btn.dataset.originalText = btn.textContent;
  } else {
    btn.disabled = false;
    btn.classList.remove('loading');
    if (btn.dataset.originalText) {
      btn.textContent = btn.dataset.originalText;
    }
  }
}
