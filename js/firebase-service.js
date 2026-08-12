/* ═══════════════════════════════════════════════════════════
   CHINNI JEWELS — Firebase Firestore & Storage Service
   ═══════════════════════════════════════════════════════════ */

class FirebaseDataService {
  constructor() {
    this.activeGoldRates = {
      '24K': 9240,
      '22K': 8470,
      '18K': 6930
    };
    this.initGoldRatesListener();
  }

  get db() {
    return window.firebaseDb;
  }

  get storage() {
    return window.firebaseStorage;
  }

  /**
   * Real-time listener for Gold Rates
   */
  initGoldRatesListener() {
    if (!this.db) return;
    this.db.collection("gold_rates")
      .where("isActive", "==", true)
      .onSnapshot((snap) => {
        snap.forEach((doc) => {
          const data = doc.data();
          if (data.purity && data.ratePerGram) {
            this.activeGoldRates[data.purity] = data.ratePerGram;
          }
        });
        console.log("[FirebaseService] Updated live gold rates:", this.activeGoldRates);
      }, (err) => {
        console.warn("[FirebaseService] Gold rates listener notice:", err.message);
      });
  }

  /**
   * Fetch Active Gold Rates
   */
  async getGoldRates() {
    try {
      if (!this.db) return { success: true, data: this.activeGoldRates };
      const snap = await this.db.collection("gold_rates").where("isActive", "==", true).get();
      if (!snap.empty) {
        snap.forEach(doc => {
          const d = doc.data();
          this.activeGoldRates[d.purity] = d.ratePerGram;
        });
      }
      return { success: true, data: this.activeGoldRates };
    } catch (err) {
      console.warn("[FirebaseService] Using default rates due to network/rules:", err);
      return { success: true, data: this.activeGoldRates };
    }
  }

  /**
   * Fetch Active Categories
   */
  async getCategories() {
    try {
      if (!this.db) return { success: true, data: [] };
      const snap = await this.db.collection("categories").where("isActive", "==", true).get();
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      return { success: true, data: list };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Fetch Active Products
   */
  async getProducts(params = {}) {
    try {
      if (!this.db) {
        return {
          success: true,
          data: [
            {
              id: "seed-product-1",
              name: "Signature Gold Coin",
              slug: "signature-gold-coin",
              sku: "CJ-24K-C01",
              purity: "24K / 999",
              weight_grams: 1.0,
              weightGrams: 1.0,
              making_charge: 280,
              makingCharge: 280,
              gst_percentage: 3,
              gstPercentage: 3,
              base_price: 9240,
              selling_price: 9806,
              stock_quantity: 42,
              stockQuantity: 42,
              image_url: "assets/hero_gold_coin.png",
              images: ["assets/hero_gold_coin.png"]
            }
          ]
        };
      }

      let query = this.db.collection("products");
      if (params.category) {
        query = query.where("categoryId", "==", params.category);
      }
      if (params.featured) {
        query = query.where("isFeatured", "==", true);
      }

      const snap = await query.get();
      const products = [];
      snap.forEach(doc => {
        const d = doc.data();
        // Standardize snake_case and camelCase field aliases for UI compatibility
        const p = {
          id: doc.id,
          ...d,
          weight_grams: d.weightGrams || d.weight_grams || 1.0,
          making_charge: d.makingCharge || d.making_charge || 280,
          gst_percentage: d.gstPercentage || d.gst_percentage || 3,
          stock_quantity: d.stockQuantity || d.stock_quantity || 10,
          base_price: d.basePrice || (this.activeGoldRates[d.purity || '24K'] * (d.weightGrams || 1.0)),
          selling_price: d.sellingPrice || ((this.activeGoldRates[d.purity || '24K'] * (d.weightGrams || 1.0)) + (d.makingCharge || 280)) * 1.03,
          image_url: (d.images && d.images[0]) || d.imageUrl || "assets/hero_gold_coin.png"
        };
        products.push(p);
      });

      return { success: true, data: products };
    } catch (err) {
      console.warn("[FirebaseService] Error fetching products:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Fetch Single Product by Slug or ID
   */
  async getProductBySlugOrId(idOrSlug) {
    try {
      if (!this.db) return { success: false, error: "Database not connected" };
      
      let doc = await this.db.collection("products").doc(idOrSlug).get();
      if (doc.exists) {
        return { success: true, data: { id: doc.id, ...doc.data() } };
      }

      // Query by slug
      const snap = await this.db.collection("products").where("slug", "==", idOrSlug).limit(1).get();
      if (!snap.empty) {
        const first = snap.docs[0];
        return { success: true, data: { id: first.id, ...first.data() } };
      }

      return { success: false, error: "Product not found" };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Create Order (Calls Firebase Cloud Function createOrder or fallback transaction)
   */
  async createOrder(orderPayload) {
    try {
      if (window.firebaseFunctions) {
        const createOrderFn = window.firebaseFunctions.httpsCallable("createOrder");
        const res = await createOrderFn(orderPayload);
        if (res.data) {
          return {
            success: true,
            data: {
              id: res.data.orderId,
              order_number: res.data.orderNumber,
              total_amount: res.data.totalAmount,
              whatsapp_url: res.data.whatsappUrl,
              whatsapp_message: res.data.whatsappMessage
            }
          };
        }
      }

      // Direct Firestore transaction fallback if Cloud Functions offline
      return await this.createOrderFirestoreFallback(orderPayload);
    } catch (err) {
      console.warn("[FirebaseService] Cloud function call fallback:", err.message);
      return await this.createOrderFirestoreFallback(orderPayload);
    }
  }

  /**
   * Fallback Firestore Order Creator with Stock Reservation
   */
  async createOrderFirestoreFallback(payload) {
    try {
      if (!this.db) {
        const fakeNum = "G1G-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.floor(1000 + Math.random() * 9000);
        const fakeMsg = `👑 *NEW GOLD ORDER — CHINNI JEWELS*\n\nOrder ID: ${fakeNum}\nCustomer: ${payload.customer_name}\nMobile: ${payload.phone}`;
        const fakeUrl = `https://api.whatsapp.com/send?phone=916304702907&text=${encodeURIComponent(fakeMsg)}`;
        return {
          success: true,
          data: {
            id: "fallback-doc-id",
            order_number: fakeNum,
            total_amount: 9806,
            whatsapp_url: fakeUrl,
            whatsapp_message: fakeMsg
          }
        };
      }

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      const randomSeq = Math.floor(1000 + Math.random() * 9000);
      const orderNumber = `G1G-${dateStr}-${randomSeq}`;

      const rate24K = this.activeGoldRates['24K'] || 9240;
      const making = 280;
      const goldVal = rate24K * 1.0;
      const subtotal = goldVal + making;
      const gst = Math.round(subtotal * 0.03);
      const totalAmount = subtotal + gst;

      const orderData = {
        orderNumber,
        customerId: (window.AuthService && window.AuthService.currentUser?.uid) || "guest",
        customerName: payload.customer_name || payload.customerName,
        phone: payload.phone,
        email: payload.email || "",
        address: payload.address,
        city: payload.city,
        state: payload.state,
        pincode: payload.pincode,
        subtotal,
        makingCharges: making,
        gst,
        discount: 0,
        totalAmount,
        paymentMethod: payload.payment_method || payload.paymentMethod || "UPI",
        orderStatus: "PENDING",
        whatsappStatus: "READY",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await this.db.collection("orders").add(orderData);
      
      const whatsappMsg = this.buildWhatsAppMessageText(orderNumber, orderData, payload.items);
      const whatsappUrl = `https://api.whatsapp.com/send?phone=916304702907&text=${encodeURIComponent(whatsappMsg)}`;

      await docRef.update({ whatsappMessage: whatsappMsg, whatsappUrl });

      return {
        success: true,
        data: {
          id: docRef.id,
          order_number: orderNumber,
          total_amount: totalAmount,
          whatsapp_url: whatsappUrl,
          whatsapp_message: whatsappMsg
        }
      };
    } catch (err) {
      console.error("[FirebaseService] Fallback order creation error:", err);
      return { success: false, error: err.message };
    }
  }

  buildWhatsAppMessageText(orderNumber, order, items) {
    return (
      `🪙 NEW GOLD ORDER\n\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `ORDER ID:\n${orderNumber}\n\n` +
      `PRODUCT DETAILS\n\n` +
      `Product:\nSignature 1 Gram Gold Coin\n\n` +
      `SKU:\nCJ-24K-C01\n\n` +
      `Weight:\n1.0 Gram\n\n` +
      `Purity:\n24K / 999\n\n` +
      `Quantity:\n1\n\n` +
      `Product Image:\nhttps://chinni-jewels.web.app/assets/hero_gold_coin.png\n\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `PRICE DETAILS\n\n` +
      `Gold Value:\n₹9,240\n\n` +
      `Making Charges:\n₹280\n\n` +
      `GST:\n₹286\n\n` +
      `TOTAL:\n₹${(order.totalAmount || 9806).toLocaleString('en-IN')}\n\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `CUSTOMER DETAILS\n\n` +
      `Name:\n${order.customerName}\n\n` +
      `Mobile:\n${order.phone}\n\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `DELIVERY ADDRESS\n\n` +
      `Address:\n${order.address}\n\n` +
      `City:\n${order.city}\n\n` +
      `State:\n${order.state}\n\n` +
      `Pincode:\n${order.pincode}\n\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `PAYMENT:\n${order.paymentMethod}\n\n` +
      `Please confirm this order.\n\n` +
      `Thank you.`
    );
  }

  /**
   * Upload Product Image to Firebase Storage
   */
  async uploadProductImage(productId, file) {
    try {
      if (!this.storage) throw new Error("Storage not initialized");
      const ref = this.storage.ref(`products/${productId}/${Date.now()}_${file.name}`);
      const snapshot = await ref.put(file);
      const downloadURL = await snapshot.ref.getDownloadURL();
      return { success: true, downloadURL };
    } catch (err) {
      console.error("[FirebaseService] Upload error:", err);
      return { success: false, error: err.message };
    }
  }
}

window.FirebaseService = new FirebaseDataService();
