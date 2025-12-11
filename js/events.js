// js/events.js
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, query, where } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { auth, db } from './firebase.js';
import { logAction } from './logger.js';

const eventsCol = collection(db, 'events');

export async function addEvent(userId, eventData) {
  const uid = userId || auth.currentUser?.uid;
  
  // Normalize city and area for consistent storage
  const normalizedEventData = {
    ...eventData,
    city: eventData.city?.trim() || '',
    area: eventData.area?.trim() || '',
    createdBy: uid,
    createdAt: new Date().toISOString()
  };
  
  console.log('Adding event with data:', normalizedEventData);
  
  const docRef = await addDoc(eventsCol, normalizedEventData);
  await logAction(uid, 'add_event', { id: docRef.id, name: eventData.name });
  return docRef.id;
}

export async function updateEvent(eventId, patch) {
  const r = doc(db, 'events', eventId);
  await updateDoc(r, patch);
  await logAction(auth.currentUser?.uid, 'update_event', { id: eventId, patch });
}

export async function deleteEvent(userId, eventId) {
  const r = doc(db, 'events', eventId);
  await deleteDoc(r);
  await logAction(userId, 'delete_event', { id: eventId });
}

export async function getEventsNearby(city, area) {
  try {
    // Normalize input for case-insensitive matching
    const normalizedCity = city.trim().toLowerCase();
    const normalizedArea = area.trim().toLowerCase();
    
    console.log('Searching for events in:', { city: normalizedCity, area: normalizedArea });
    
    // Get all events and filter client-side for case-insensitive matching
    const snap = await getDocs(eventsCol);
    const allEvents = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    console.log('Total events found:', allEvents.length);
    
    // Filter events with case-insensitive matching
    const filteredEvents = allEvents.filter(event => {
      const eventCity = (event.city || '').toLowerCase().trim();
      const eventArea = (event.area || '').toLowerCase().trim();
      
      const cityMatch = eventCity === normalizedCity;
      const areaMatch = eventArea === normalizedArea;
      
      console.log('Event:', event.name, 'City match:', cityMatch, 'Area match:', areaMatch, 
                  'Event city:', eventCity, 'Event area:', eventArea);
      
      return cityMatch && areaMatch;
    });
    
    console.log('Filtered events:', filteredEvents.length);
    return filteredEvents;
    
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
}

export async function getEvent(eventId) {
  const docRef = doc(db, 'events', eventId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// Function to get all events (for admin view)
export async function getAllEvents() {
  try {
    const snap = await getDocs(eventsCol);
    const events = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log('All events in database:', events);
    return events;
  } catch (error) {
    console.error('Error fetching all events:', error);
    throw error;
  }
}

// Function to get unique cities and areas from events
export async function getEventLocations() {
  try {
    const events = await getAllEvents();
    const cities = [...new Set(events.map(e => e.city).filter(Boolean))];
    const areas = [...new Set(events.map(e => e.area).filter(Boolean))];
    
    console.log('Available cities:', cities);
    console.log('Available areas:', areas);
    
    return { cities, areas };
  } catch (error) {
    console.error('Error fetching event locations:', error);
    throw error;
  }
}

// Helper function to find similar locations (for suggestions)
export async function findSimilarLocations(city, area) {
  try {
    const events = await getAllEvents();
    const cities = [...new Set(events.map(e => e.city).filter(Boolean))];
    const areas = [...new Set(events.map(e => e.area).filter(Boolean))];
    
    const normalizedCity = city.toLowerCase().trim();
    const normalizedArea = area.toLowerCase().trim();
    
    // Find similar cities
    const similarCities = cities.filter(c => 
      c.toLowerCase().includes(normalizedCity) || 
      normalizedCity.includes(c.toLowerCase())
    );
    
    // Find similar areas
    const similarAreas = areas.filter(a => 
      a.toLowerCase().includes(normalizedArea) || 
      normalizedArea.includes(a.toLowerCase())
    );
    
    return { similarCities, similarAreas, allCities: cities, allAreas: areas };
  } catch (error) {
    console.error('Error finding similar locations:', error);
    return { similarCities: [], similarAreas: [], allCities: [], allAreas: [] };
  }
}

// Function to get random event suggestions
export async function getRandomEventSuggestions(count = 3) {
  try {
    const allEvents = await getAllEvents();
    
    if (allEvents.length === 0) {
      return [];
    }
    
    // Filter events that have proper data
    const validEvents = allEvents.filter(event => 
      event.name && 
      event.sport && 
      event.city && 
      event.area &&
      event.date
    );
    
    if (validEvents.length === 0) {
      return [];
    }
    
    // Shuffle array and take random events
    const shuffled = validEvents.sort(() => 0.5 - Math.random());
    const suggestions = shuffled.slice(0, Math.min(count, validEvents.length));
    
    console.log('Random event suggestions:', suggestions);
    return suggestions;
    
  } catch (error) {
    console.error('Error fetching random event suggestions:', error);
    return [];
  }
}