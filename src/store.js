import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "jahizyie-v1";

export const emptyDB = { categories: [], subs: [], items: [] };

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export async function loadDB() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...emptyDB };
    const db = JSON.parse(raw);
    return {
      categories: db.categories || [],
      subs: db.subs || [],
      items: db.items || [],
    };
  } catch {
    return { ...emptyDB };
  }
}

export async function saveDB(db) {
  await AsyncStorage.setItem(KEY, JSON.stringify(db));
}

export { uid, KEY };
