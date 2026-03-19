import { db } from '../firebase.js';
import { store } from '../store.js';
import { appId } from '../config.js';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { showToast } from '../utils.js';

export function updatePlannerInputs() {
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].forEach(day => {
        const el = document.getElementById(`price-${day}`);
        if (el) el.value = store.WEEKLY_PRICES[day] || 80;
    });
}

export async function updateMealPrices() {
    const prices = {};
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].forEach(day => {
        const val = parseFloat(document.getElementById(`price-${day}`).value);
        prices[day] = isNaN(val) ? 80 : val;
    });

    try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'meal_prices'), {
            prices: prices,
            updatedAt: serverTimestamp(),
            updatedBy: store.currentUser.uid
        }, { merge: true });
        showToast('Weekly Prices Updated', 'success');
    } catch (error) {
        console.error(error);
        showToast('Error updating prices', 'error');
    }
}

// Attach global
window.updateMealPrices = updateMealPrices;