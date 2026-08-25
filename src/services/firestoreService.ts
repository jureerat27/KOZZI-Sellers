import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Customer,
  Expense,
  Product,
  SalesDocument,
  SellerProfile,
} from '../types';
import {
  getCustomers as getLocalCustomers,
  getDocuments as getLocalDocuments,
  getExpenses as getLocalExpenses,
  getProducts as getLocalProducts,
  getSellerProfile as getLocalSeller,
  saveCustomers as saveLocalCustomers,
  saveDocuments as saveLocalDocuments,
  saveExpenses as saveLocalExpenses,
  saveProducts as saveLocalProducts,
  saveSellerProfile as saveLocalSeller,
} from '../utils/storage';

const COLLECTIONS = {
  SELLER: 'seller_profile',
  PRODUCTS: 'products',
  CUSTOMERS: 'customers',
  DOCUMENTS: 'documents',
  EXPENSES: 'expenses',
  METADATA: 'app_metadata',
};

/**
 * Deeply removes any `undefined` properties from an object or array.
 * Firestore will throw fatal errors if any object key has an `undefined` value.
 */
export function cleanForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => cleanForFirestore(item)) as unknown as T;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned;
  }
  return obj;
}

async function isAppInitializedInCloud(): Promise<boolean> {
  if (localStorage.getItem('firestore_app_initialized') === 'true') {
    return true;
  }
  try {
    const metaRef = doc(db, COLLECTIONS.METADATA, 'status');
    const snapshot = await getDoc(metaRef);
    if (snapshot.exists()) {
      localStorage.setItem('firestore_app_initialized', 'true');
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function markAppInitializedInCloud() {
  localStorage.setItem('firestore_app_initialized', 'true');
  localStorage.setItem('sellersapp_has_initialized', 'true');
  try {
    const metaRef = doc(db, COLLECTIONS.METADATA, 'status');
    await setDoc(metaRef, { initialized: true, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error('Error marking app initialized:', err);
  }
}

// 1. SELLER PROFILE
export function subscribeSellerProfile(callback: (seller: SellerProfile) => void) {
  const docRef = doc(db, COLLECTIONS.SELLER, 'default');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as SellerProfile;
        saveLocalSeller(data);
        callback(data);
      } else {
        // If not present in Firestore, seed with current local/default
        const local = getLocalSeller();
        const payload = cleanForFirestore(local);
        setDoc(docRef, payload).catch(console.error);
        callback(local);
      }
    },
    (error) => {
      console.warn('Firestore seller profile error, fallback to local:', error);
      callback(getLocalSeller());
    }
  );
}

export async function saveSellerProfileCloud(profile: SellerProfile): Promise<SellerProfile> {
  saveLocalSeller(profile);
  markAppInitializedInCloud();
  try {
    const docRef = doc(db, COLLECTIONS.SELLER, 'default');
    const payload = cleanForFirestore(profile);
    await setDoc(docRef, payload, { merge: true });
    return profile;
  } catch (err) {
    console.error('Error saving seller profile to Firestore:', err);
    return profile;
  }
}

// 2. PRODUCTS
export function subscribeProducts(callback: (products: Product[]) => void) {
  const colRef = collection(db, COLLECTIONS.PRODUCTS);
  return onSnapshot(
    colRef,
    async (snapshot) => {
      const initialized = await isAppInitializedInCloud();
      if (!snapshot.empty) {
        const productsList: Product[] = snapshot.docs.map((d) => ({
          ...(d.data() as Product),
          id: d.id,
        }));
        saveLocalProducts(productsList);
        markAppInitializedInCloud();
        callback(productsList);
      } else if (!initialized) {
        // First run ever, seed initial defaults once
        const local = getLocalProducts();
        markAppInitializedInCloud();
        for (const p of local) {
          const payload = cleanForFirestore(p);
          await setDoc(doc(db, COLLECTIONS.PRODUCTS, p.id), payload).catch(console.error);
        }
        callback(local);
      } else {
        // User deleted all products or has no products
        saveLocalProducts([]);
        callback([]);
      }
    },
    (error) => {
      console.warn('Firestore products error, fallback to local:', error);
      callback(getLocalProducts());
    }
  );
}

export async function saveProductCloud(product: Product): Promise<Product> {
  markAppInitializedInCloud();
  const currentProds = getLocalProducts();
  const existingIdx = currentProds.findIndex((p) => p.id === product.id);
  const updatedProds =
    existingIdx >= 0
      ? currentProds.map((p, i) => (i === existingIdx ? product : p))
      : [product, ...currentProds];
  saveLocalProducts(updatedProds);

  try {
    const docRef = doc(db, COLLECTIONS.PRODUCTS, product.id);
    const payload = cleanForFirestore(product);
    await setDoc(docRef, payload, { merge: true });
    return product;
  } catch (err) {
    console.error('Error saving product to Firestore:', err);
    return product;
  }
}

export async function saveProductsBatchCloud(products: Product[]): Promise<Product[]> {
  markAppInitializedInCloud();
  saveLocalProducts(products);
  try {
    for (const p of products) {
      const docRef = doc(db, COLLECTIONS.PRODUCTS, p.id);
      const payload = cleanForFirestore(p);
      await setDoc(docRef, payload, { merge: true });
    }
    return products;
  } catch (err) {
    console.error('Error batch saving products to Firestore:', err);
    return products;
  }
}

export async function deleteProductCloud(productId: string): Promise<void> {
  markAppInitializedInCloud();
  const currentProds = getLocalProducts().filter((p) => p.id !== productId);
  saveLocalProducts(currentProds);
  try {
    const docRef = doc(db, COLLECTIONS.PRODUCTS, productId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting product from Firestore:', err);
  }
}

// 3. CUSTOMERS
export function subscribeCustomers(callback: (customers: Customer[]) => void) {
  const colRef = collection(db, COLLECTIONS.CUSTOMERS);
  return onSnapshot(
    colRef,
    async (snapshot) => {
      const initialized = await isAppInitializedInCloud();
      if (!snapshot.empty) {
        const list: Customer[] = snapshot.docs.map((d) => ({
          ...(d.data() as Customer),
          id: d.id,
        }));
        saveLocalCustomers(list);
        markAppInitializedInCloud();
        callback(list);
      } else if (!initialized) {
        const local = getLocalCustomers();
        markAppInitializedInCloud();
        for (const c of local) {
          const payload = cleanForFirestore(c);
          await setDoc(doc(db, COLLECTIONS.CUSTOMERS, c.id), payload).catch(console.error);
        }
        callback(local);
      } else {
        saveLocalCustomers([]);
        callback([]);
      }
    },
    (error) => {
      console.warn('Firestore customers error, fallback to local:', error);
      callback(getLocalCustomers());
    }
  );
}

export async function saveCustomerCloud(customer: Customer): Promise<Customer> {
  markAppInitializedInCloud();
  const currentCusts = getLocalCustomers();
  const existingIdx = currentCusts.findIndex((c) => c.id === customer.id);
  const updatedCusts =
    existingIdx >= 0
      ? currentCusts.map((c, i) => (i === existingIdx ? customer : c))
      : [customer, ...currentCusts];
  saveLocalCustomers(updatedCusts);

  try {
    const docRef = doc(db, COLLECTIONS.CUSTOMERS, customer.id);
    const payload = cleanForFirestore(customer);
    await setDoc(docRef, payload, { merge: true });
    return customer;
  } catch (err) {
    console.error('Error saving customer to Firestore:', err);
    return customer;
  }
}

export async function deleteCustomerCloud(customerId: string): Promise<void> {
  markAppInitializedInCloud();
  const currentCusts = getLocalCustomers().filter((c) => c.id !== customerId);
  saveLocalCustomers(currentCusts);
  try {
    const docRef = doc(db, COLLECTIONS.CUSTOMERS, customerId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting customer from Firestore:', err);
  }
}

// 4. DOCUMENTS
export function subscribeDocuments(callback: (docs: SalesDocument[]) => void) {
  const colRef = collection(db, COLLECTIONS.DOCUMENTS);
  return onSnapshot(
    colRef,
    async (snapshot) => {
      const initialized = await isAppInitializedInCloud();
      if (!snapshot.empty) {
        const list: SalesDocument[] = snapshot.docs.map((d) => ({
          ...(d.data() as SalesDocument),
          id: d.id,
        }));
        // Sort documents by createdAt / date descending
        list.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
        saveLocalDocuments(list);
        markAppInitializedInCloud();
        callback(list);
      } else if (!initialized) {
        const local = getLocalDocuments();
        markAppInitializedInCloud();
        for (const d of local) {
          const payload = cleanForFirestore(d);
          await setDoc(doc(db, COLLECTIONS.DOCUMENTS, d.id), payload).catch(console.error);
        }
        callback(local);
      } else {
        // User deleted all documents
        saveLocalDocuments([]);
        callback([]);
      }
    },
    (error) => {
      console.warn('Firestore documents error, fallback to local:', error);
      callback(getLocalDocuments());
    }
  );
}

export async function saveDocumentCloud(salesDoc: SalesDocument): Promise<SalesDocument> {
  markAppInitializedInCloud();
  
  // 1. Immediately persist locally so document is never lost
  const currentDocs = getLocalDocuments();
  const existingIdx = currentDocs.findIndex((d) => d.id === salesDoc.id);
  const updatedDocs =
    existingIdx >= 0
      ? currentDocs.map((d, i) => (i === existingIdx ? salesDoc : d))
      : [salesDoc, ...currentDocs];
  saveLocalDocuments(updatedDocs);

  // 2. Clean payload to avoid any Firestore unsupported undefined field values
  const payload = cleanForFirestore(salesDoc);

  // 3. Persist to Firestore
  try {
    const docRef = doc(db, COLLECTIONS.DOCUMENTS, salesDoc.id);
    await setDoc(docRef, payload, { merge: true });
    return salesDoc;
  } catch (err) {
    console.error('Error saving document to Firestore:', err);
    // Return salesDoc even if network/offline since local is already updated
    return salesDoc;
  }
}

export async function deleteDocumentCloud(docId: string): Promise<void> {
  markAppInitializedInCloud();
  const currentDocs = getLocalDocuments().filter((d) => d.id !== docId);
  saveLocalDocuments(currentDocs);
  try {
    const docRef = doc(db, COLLECTIONS.DOCUMENTS, docId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting document from Firestore:', err);
  }
}

// 5. EXPENSES
export function subscribeExpenses(callback: (expenses: Expense[]) => void) {
  const colRef = collection(db, COLLECTIONS.EXPENSES);
  return onSnapshot(
    colRef,
    async (snapshot) => {
      const initialized = await isAppInitializedInCloud();
      if (!snapshot.empty) {
        const list: Expense[] = snapshot.docs.map((d) => ({
          ...(d.data() as Expense),
          id: d.id,
        }));
        list.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
        saveLocalExpenses(list);
        markAppInitializedInCloud();
        callback(list);
      } else if (!initialized) {
        const local = getLocalExpenses();
        markAppInitializedInCloud();
        for (const e of local) {
          const payload = cleanForFirestore(e);
          await setDoc(doc(db, COLLECTIONS.EXPENSES, e.id), payload).catch(console.error);
        }
        callback(local);
      } else {
        saveLocalExpenses([]);
        callback([]);
      }
    },
    (error) => {
      console.warn('Firestore expenses error, fallback to local:', error);
      callback(getLocalExpenses());
    }
  );
}

export async function saveExpenseCloud(expense: Expense): Promise<Expense> {
  markAppInitializedInCloud();
  const currentExps = getLocalExpenses();
  const existingIdx = currentExps.findIndex((e) => e.id === expense.id);
  const updatedExps =
    existingIdx >= 0
      ? currentExps.map((e, i) => (i === existingIdx ? expense : e))
      : [expense, ...currentExps];
  saveLocalExpenses(updatedExps);

  try {
    const docRef = doc(db, COLLECTIONS.EXPENSES, expense.id);
    const payload = cleanForFirestore(expense);
    await setDoc(docRef, payload, { merge: true });
    return expense;
  } catch (err) {
    console.error('Error saving expense to Firestore:', err);
    return expense;
  }
}

export async function deleteExpenseCloud(expenseId: string): Promise<void> {
  markAppInitializedInCloud();
  const currentExps = getLocalExpenses().filter((e) => e.id !== expenseId);
  saveLocalExpenses(currentExps);
  try {
    const docRef = doc(db, COLLECTIONS.EXPENSES, expenseId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting expense from Firestore:', err);
  }
}

// Full import backup to cloud
export async function importBackupToCloud(data: {
  seller?: SellerProfile;
  products?: Product[];
  customers?: Customer[];
  documents?: SalesDocument[];
  expenses?: Expense[];
}) {
  if (data.seller) await saveSellerProfileCloud(data.seller);
  if (data.products) {
    for (const p of data.products) await saveProductCloud(p);
  }
  if (data.customers) {
    for (const c of data.customers) await saveCustomerCloud(c);
  }
  if (data.documents) {
    for (const d of data.documents) await saveDocumentCloud(d);
  }
  if (data.expenses) {
    for (const e of data.expenses) await saveExpenseCloud(e);
  }
}
