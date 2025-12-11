// js/admin.js
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { auth, db } from './firebase.js';
import { logAction } from './logger.js';
import { fetchUserProfile } from './auth.js';

const sportsCol = collection(db, 'sports');
const citiesCol = collection(db, 'cities');
const areasCol = collection(db, 'areas');

export async function addSport(adminUid, name) {
  const docRef = await addDoc(sportsCol, { name });
  await logAction(adminUid, 'add_sport', { id: docRef.id, name });
  return docRef.id;
}

export async function deleteSport(adminUid, id) {
  await deleteDoc(doc(db, 'sports', id));
  await logAction(adminUid, 'delete_sport', { id });
}

export async function addCity(adminUid, name) {
  const docRef = await addDoc(citiesCol, { name });
  await logAction(adminUid, 'add_city', { id: docRef.id, name });
  return docRef.id;
}

export async function addArea(adminUid, cityId, name) {
  const docRef = await addDoc(areasCol, { cityId, name });
  await logAction(adminUid, 'add_area', { id: docRef.id, cityId, name });
  return docRef.id;
}

export async function listSports() {
  const snap = await getDocs(sportsCol);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function attachAdminHandlers() {
  // Security check
  const user = auth.currentUser;
  if (!user) {
    // Allow time for auth to initialize if needed, but usually onAuthStateChanged handles this in UI.
    // Here we are in a separate page. We might need to wait for auth.
    // However, auth state persists.
    // Let's wait a bit or check if we can hook into onAuthStateChanged.
    // Better: wrap in onAuthStateChanged.
  }

  // Actually, let's just check inside the function, assuming auth is ready or we wait.
  // Since this is called from a script tag module, auth might not be ready immediately.
  // We should probably use onAuthStateChanged here too.

  onAuthStateChanged(auth, async (u) => {
    if (!u) {
      window.location.href = 'index.html';
      return;
    }
    const p = await fetchUserProfile(u.uid);
    if (p?.role !== 'admin') {
      window.location.href = 'index.html';
      return;
    }
    // If admin, proceed to attach handlers
    proceedWithAdminHandlers();
  });
}

function proceedWithAdminHandlers() {
  const btnAddSport = document.getElementById('btn-add-sport');
  const sportInput = document.getElementById('sport-name');
  const sportsList = document.getElementById('sports-list');
  const btnAddCity = document.getElementById('btn-add-city');
  const cityInput = document.getElementById('city-name');
  const btnAddArea = document.getElementById('btn-add-area');
  const areaInput = document.getElementById('area-name');
  const citySelect = document.getElementById('select-city-for-area');
  const citiesList = document.getElementById('cities-list');
  const areasList = document.getElementById('areas-list');

  if (btnAddSport) {
    btnAddSport.onclick = async () => {
      const name = sportInput.value.trim();
      if (!name) return alert('Enter sport name');
      await addSport(currentAdminUid(), name);
      sportInput.value = '';
      await refreshSportsList(sportsList);
    };
  }

  if (btnAddCity) {
    btnAddCity.onclick = async () => {
      const name = cityInput.value.trim();
      if (!name) return alert('Enter city name');
      await addCity(currentAdminUid(), name);
      cityInput.value = '';
      await populateCitiesDropdown(citySelect);
    };
  }

  if (btnAddArea) {
    btnAddArea.onclick = async () => {
      const name = areaInput.value.trim();
      const cityId = citySelect.value;
      if (!cityId) return alert('Pick a city');
      if (!name) return alert('Enter area name');
      await addArea(currentAdminUid(), cityId, name);
      areaInput.value = '';
      alert('Area added');
      await renderAreasList(areasList, cityId);
    };
  }

  if (sportsList) {
    sportsList.onclick = async (evt) => {
      const id = evt.target?.dataset?.id;
      if (evt.target?.matches('[data-action="delete-sport"]') && id) {
        await deleteSport(currentAdminUid(), id);
        await refreshSportsList(sportsList);
      }
      if (evt.target?.matches('[data-action="rename-sport"]') && id) {
        const currentName = evt.target.dataset.name || '';
        const next = prompt('Rename sport', currentName);
        if (next && next.trim()) {
          await updateDoc(doc(db, 'sports', id), { name: next.trim() });
          await logAction(currentAdminUid(), 'rename_sport', { id, name: next.trim() });
          await refreshSportsList(sportsList);
        }
      }
    };
    refreshSportsList(sportsList);
  }

  if (citiesList) {
    citiesList.onclick = async (evt) => {
      const id = evt.target?.dataset?.id;
      if (evt.target?.matches('[data-action="delete-city"]') && id) {
        await deleteDoc(doc(db, 'cities', id));
        await logAction(currentAdminUid(), 'delete_city', { id });
        await populateCitiesDropdown(citySelect, citiesList);
      }
      if (evt.target?.matches('[data-action="rename-city"]') && id) {
        const next = prompt('Rename city', evt.target.dataset.name || '');
        if (next && next.trim()) {
          await updateDoc(doc(db, 'cities', id), { name: next.trim() });
          await logAction(currentAdminUid(), 'rename_city', { id, name: next.trim() });
          await populateCitiesDropdown(citySelect, citiesList);
        }
      }
    };
  }

  if (areasList) {
    areasList.onclick = async (evt) => {
      const id = evt.target?.dataset?.id;
      if (evt.target?.matches('[data-action="delete-area"]') && id) {
        await deleteDoc(doc(db, 'areas', id));
        await logAction(currentAdminUid(), 'delete_area', { id });
        await renderAreasList(areasList, citySelect.value);
      }
    };
  }

  citySelect?.addEventListener('change', () => {
    renderAreasList(areasList, citySelect.value);
  });

  populateCitiesDropdown(citySelect, citiesList, areasList);
}

function currentAdminUid() {
  return auth.currentUser?.uid || 'admin-placeholder';
}

async function refreshSportsList(container) {
  if (!container) return;
  const sports = await listSports();
  container.innerHTML = '';
  sports.forEach(s => {
    const div = document.createElement('div');
    div.className = 'item-card';
    div.innerHTML = `
      <div>
        <strong>${s.name}</strong>
      </div>
      <div class="actions">
        <button class="pill-btn secondary" data-action="rename-sport" data-id="${s.id}" data-name="${s.name}">Rename</button>
        <button class="pill-btn danger" data-action="delete-sport" data-id="${s.id}">Delete</button>
      </div>
    `;
    container.appendChild(div);
  });
}

async function populateCitiesDropdown(selectEl, listEl, areasList) {
  if (selectEl) {
    selectEl.innerHTML = '<option value="">Select city</option>';
  }
  const cities = await listCities();
  if (selectEl) {
    cities.forEach(city => {
      const opt = document.createElement('option');
      opt.value = city.id;
      opt.textContent = city.name;
      selectEl.appendChild(opt);
    });
  }
  if (listEl) {
    renderCitiesList(listEl, cities);
  }
  if (areasList) {
    const firstCity = selectEl?.value || '';
    renderAreasList(areasList, firstCity);
  }
}

async function listCities() {
  const snap = await getDocs(citiesCol);
  return snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
}

async function renderCitiesList(container, cities) {
  container.innerHTML = '';
  cities.forEach(city => {
    const div = document.createElement('div');
    div.className = 'item-card';
    div.innerHTML = `
      <div>
        <strong>${city.name}</strong>
      </div>
      <div class="actions">
        <button class="pill-btn secondary" data-action="rename-city" data-id="${city.id}" data-name="${city.name}">Rename</button>
        <button class="pill-btn danger" data-action="delete-city" data-id="${city.id}">Delete</button>
      </div>
    `;
    container.appendChild(div);
  });
}

async function renderAreasList(container, cityId) {
  if (!container) {
    return;
  }
  if (!cityId) {
    container.innerHTML = '<p class="muted">Select a city to view areas.</p>';
    return;
  }
  const q = query(areasCol, where('cityId', '==', cityId));
  const snap = await getDocs(q);
  if (snap.empty) {
    container.innerHTML = '<p class="muted">No areas for this city yet.</p>';
    return;
  }
  container.innerHTML = '';
  snap.docs.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement('div');
    div.className = 'item-card';
    div.innerHTML = `
      <div>
        <strong>${data.name}</strong>
      </div>
      <div class="actions">
        <button class="pill-btn danger" data-action="delete-area" data-id="${docSnap.id}">Delete</button>
      </div>
    `;
    container.appendChild(div);
  });
}

