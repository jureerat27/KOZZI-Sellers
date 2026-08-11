import {
  collection,
  doc,
  setDoc,
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
};

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
        setDoc(docRef, local).catch(console.error);
        callback(local);
      }
    },
    (error) => {
      console.warn('Firestore seller profile error, fallback to local:', error);
      callback(getLocalSeller());
    }
  );
}

export async function saveSellerProfileCloud(profile: SellerProfile) {
  saveLocalSeller(profile);
  try {
    const docRef = doc(db, COLLECTIONS.SELLER, 'default');
    await setDoc(docRef, profile, { merge: true });
  } catch (err) {
    console.error('Error saving seller profile to Firestore:', err);
  }
}

// 2. PRODUCTS
export function subscribeProducts(callback: (products: Product[]) => void) {
  const colRef = collection(db, COLLECTIONS.PRODUCTS);
  return onSnapshot(
    colRef,
    async (snapshot) => {
      const hasSeeded = localStorage.getItem('firestore_products_seeded');
      if (!snapshot.empty) {
        const productsList: Product[] = snapshot.docs.map((d) => ({
          ...(d.data() as Product),
          id: d.id,
        }));
        saveLocalProducts(productsList);
        localStorage.setItem('firestore_products_seeded', 'true');
        callback(productsList);
      } else if (!hasSeeded) {
        // Seed default products to Firestore if empty for the first time
        const local = getLocalProducts();
        localStorage.setItem('firestore_products_seeded', 'true');
        for (const p of local) {
          await setDoc(doc(db, COLLECTIONS.PRODUCTS, p.id), p).catch(console.error);
        }
        callback(local);
      } else {
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

export async function saveProductCloud(product: Product) {
  try {
    const docRef = doc(db, COLLECTIONS.PRODUCTS, product.id);
    await setDoc(docRef, product, { merge: true });
  } catch (err) {
    console.error('Error saving product to Firestore:', err);
  }
}

export async function saveProductsBatchCloud(products: Product[]) {
  saveLocalProducts(products);
  try {
    for (const p of products) {
      const docRef = doc(db, COLLECTIONS.PRODUCTS, p.id);
      await setDoc(docRef, p, { merge: true });
    }
  } catch (err) {
    console.error('Error batch saving products to Firestore:', err);
  }
}

export async function deleteProductCloud(productId: string) {
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
      const hasSeeded = localStorage.getItem('firestore_customers_seeded');
      if (!snapshot.empty) {
        const list: Customer[] = snapshot.docs.map((d) => ({
          ...(d.data() as Customer),
          id: d.id,
        }));
        saveLocalCustomers(list);
        localStorage.setItem('firestore_customers_seeded', 'true');
        callback(list);
      } else if (!hasSeeded) {
        const local = getLocalCustomers();
        localStorage.setItem('firestore_customers_seeded', 'true');
        for (const c of local) {
          await setDoc(doc(db, COLLECTIONS.CUSTOMERS, c.id), c).catch(console.error);
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

export async function saveCustomerCloud(customer: Customer) {
  try {
    const docRef = doc(db, COLLECTIONS.CUSTOMERS, customer.id);
    await setDoc(docRef, customer, { merge: true });
  } catch (err) {
    console.error('Error saving customer to Firestore:', err);
  }
}

export async function deleteCustomerCloud(customerId: string) {
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
      const hasSeeded = localStorage.getItem('firestore_documents_seeded');
      if (!snapshot.empty) {
        const list: SalesDocument[] = snapshot.docs.map((d) => ({
          ...(d.data() as SalesDocument),
          id: d.id,
        }));
        // Sort documents by createdAt / date descending
        list.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
        saveLocalDocuments(list);
        localStorage.setItem('firestore_documents_seeded', 'true');
        callback(list);
      } else if (!hasSeeded) {
        const local = getLocalDocuments();
        localStorage.setItem('firestore_documents_seeded', 'true');
        for (const d of local) {
          await setDoc(doc(db, COLLECTIONS.DOCUMENTS, d.id), d).catch(console.error);
        }
        callback(local);
      } else {
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

export async function saveDocumentCloud(salesDoc: SalesDocument) {
  try {
    const docRef = doc(db, COLLECTIONS.DOCUMENTS, salesDoc.id);
    await setDoc(docRef, salesDoc, { merge: true });
  } catch (err) {
    console.error('Error saving document to Firestore:', err);
  }
}

export async function deleteDocumentCloud(docId: string) {
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
      const hasSeeded = localStorage.getItem('firestore_expenses_seeded');
      if (!snapshot.empty) {
        const list: Expense[] = snapshot.docs.map((d) => ({
          ...(d.data() as Expense),
          id: d.id,
        }));
        list.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
        saveLocalExpenses(list);
        localStorage.setItem('firestore_expenses_seeded', 'true');
        callback(list);
      } else if (!hasSeeded) {
        const local = getLocalExpenses();
        localStorage.setItem('firestore_expenses_seeded', 'true');
        for (const e of local) {
          await setDoc(doc(db, COLLECTIONS.EXPENSES, e.id), e).catch(console.error);
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

export async function saveExpenseCloud(expense: Expense) {
  try {
    const docRef = doc(db, COLLECTIONS.EXPENSES, expense.id);
    await setDoc(docRef, expense, { merge: true });
  } catch (err) {
    console.error('Error saving expense to Firestore:', err);
  }
}

export async function deleteExpenseCloud(expenseId: string) {
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
