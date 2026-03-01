/**
 * Offline Store — IndexedDB-backed queue for offline POS transactions.
 * Stores pending sales, payments, and inventory updates.
 * Auto-syncs when connectivity is restored.
 */

const DB_NAME = "friendly_pos_offline";
const DB_VERSION = 1;

export interface OfflineSale {
  id: string;
  created_at: string;
  business_id: string;
  branch_id: string;
  cashier_id: string;
  receipt_number: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  payment_method: string;
  customer_id: string | null;
  customer_name: string | null;
  items: OfflineSaleItem[];
  payments: OfflinePayment[];
  loyalty_points_earned: number;
  synced: boolean;
  sync_error: string | null;
}

export interface OfflineSaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_amount: number;
  total: number;
  price_override: number | null;
  override_by: string | null;
  item_discount: number;
  item_discount_type: string;
}

export interface OfflinePayment {
  method: string;
  amount: number;
  reference: string | null;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("pending_sales")) {
        const store = db.createObjectStore("pending_sales", { keyPath: "id" });
        store.createIndex("synced", "synced", { unique: false });
        store.createIndex("created_at", "created_at", { unique: false });
      }
      if (!db.objectStoreNames.contains("product_cache")) {
        db.createObjectStore("product_cache", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("category_cache")) {
        db.createObjectStore("category_cache", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePendingSale(sale: OfflineSale): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending_sales", "readwrite");
    tx.objectStore("pending_sales").put(sale);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingSales(): Promise<OfflineSale[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending_sales", "readonly");
    const index = tx.objectStore("pending_sales").index("synced");
    const request = index.getAll(IDBKeyRange.only(0));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function markSaleSynced(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending_sales", "readwrite");
    const store = tx.objectStore("pending_sales");
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (getReq.result) {
        store.put({ ...getReq.result, synced: true });
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function markSaleSyncError(id: string, error: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending_sales", "readwrite");
    const store = tx.objectStore("pending_sales");
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (getReq.result) {
        store.put({ ...getReq.result, sync_error: error });
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearSyncedSales(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending_sales", "readwrite");
    const store = tx.objectStore("pending_sales");
    const index = store.index("synced");
    const request = index.openCursor(IDBKeyRange.only(1));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Product cache for offline use
export async function cacheProducts(products: any[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("product_cache", "readwrite");
    const store = tx.objectStore("product_cache");
    store.clear();
    for (const p of products) {
      store.put(p);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedProducts(): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("product_cache", "readonly");
    const request = tx.objectStore("product_cache").getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheCategories(categories: any[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("category_cache", "readwrite");
    const store = tx.objectStore("category_cache");
    store.clear();
    for (const c of categories) {
      store.put(c);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedCategories(): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("category_cache", "readonly");
    const request = tx.objectStore("category_cache").getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingSaleCount(): Promise<number> {
  const sales = await getPendingSales();
  return sales.length;
}
