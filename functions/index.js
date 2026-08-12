const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Configuration defaults
const WHATSAPP_BUSINESS_NUMBER = process.env.WHATSAPP_BUSINESS_NUMBER || "916304702907";

/**
 * Currency Formatter (Indian Rupee)
 */
function formatCurrency(val) {
  if (val === null || val === undefined) return "₹0";
  const num = Number(val);
  if (isNaN(num)) return "₹0";
  return "₹" + Math.round(num).toLocaleString("en-IN");
}

/**
 * 1. Calculate Product Price (Cloud Function / Callable)
 */
exports.calculateProductPrice = functions.https.onCall(async (data, context) => {
  const { weightGrams, purity, makingCharge = 0, discount = 0, gstPercentage = 3 } = data;

  if (!weightGrams || !purity) {
    throw new functions.https.HttpsError("invalid-argument", "Weight and purity are required.");
  }

  // Fetch active gold rate for given purity
  const ratesSnap = await db.collection("gold_rates")
    .where("purity", "==", purity)
    .where("isActive", "==", true)
    .limit(1)
    .get();

  let ratePerGram = 9240; // Default fallback for 24K
  if (!ratesSnap.empty) {
    ratePerGram = ratesSnap.docs[0].data().ratePerGram;
  }

  const goldValue = ratePerGram * weightGrams;
  const subtotal = goldValue + makingCharge;
  const taxableAmount = Math.max(0, subtotal - discount);
  const gst = Math.round(taxableAmount * (gstPercentage / 100));
  const finalPrice = taxableAmount + gst;

  return {
    goldRate: ratePerGram,
    goldValue,
    makingCharge,
    subtotal,
    discount,
    gst,
    gstPercentage,
    finalPrice
  };
});

/**
 * 2. Generate Unique Order Number: G1G-YYYYMMDD-XXXX
 */
async function generateOrderNumber(transaction) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  
  const counterRef = db.collection("settings").doc(`order_counter_${dateStr}`);
  const counterDoc = await transaction.get(counterRef);
  
  let count = 1;
  if (counterDoc.exists) {
    count = (counterDoc.data().lastCount || 0) + 1;
  }
  
  transaction.set(counterRef, { lastCount: count, date: dateStr, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  
  const sequenceStr = String(count).padStart(4, "0");
  return `G1G-${dateStr}-${sequenceStr}`;
}

/**
 * 3. Generate WhatsApp Message Text
 */
function generateOrderWhatsAppMessage(order) {
  const orderNumber = order.orderNumber || order.id || "N/A";
  const items = order.items || [];

  let productDetailsBlocks = [];
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const pName = item.productName || "1 Gram Gold Product";
    const pSku = item.sku || "N/A";
    const pWeight = `${item.weightGrams || 1.0} Gram`;
    const pPurity = item.purity || "24K / 999";
    const pQty = item.quantity || 1;
    const imgUrl = item.productImageUrl || "https://chinni-jewels.web.app/assets/hero_gold_coin.png";

    if (items.length === 1) {
      productDetailsBlocks.push(
        `PRODUCT:\n${pName}\n\nSKU:\n${pSku}\n\nWEIGHT:\n${pWeight}\n\nPURITY:\n${pPurity}\n\nQUANTITY:\n${pQty}\n\nPRODUCT IMAGE:\n${imgUrl}`
      );
    } else {
      productDetailsBlocks.push(
        `Item #${idx + 1}:\nPRODUCT: ${pName}\nSKU: ${pSku}\nWEIGHT: ${pWeight}\nPURITY: ${pPurity}\nQUANTITY: ${pQty}\nIMAGE: ${imgUrl}`
      );
    }
  }

  const productDetailsStr = productDetailsBlocks.join("\n\n") || "Product Details Not Specified";

  const goldRateStr = order.items && order.items[0] && order.items[0].goldRate
    ? `\n\nGold Rate:\n${formatCurrency(order.items[0].goldRate)} / Gram`
    : "";

  const msg = (
    `🪙 NEW GOLD ORDER\n\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `ORDER ID:\n${orderNumber}\n\n` +
    `${productDetailsStr}\n\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `PRICE DETAILS${goldRateStr}\n\n` +
    `Subtotal:\n${formatCurrency(order.subtotal || 0)}\n\n` +
    `Making Charges:\n${formatCurrency(order.makingCharges || 0)}\n\n` +
    `GST:\n${formatCurrency(order.gst || 0)}\n\n` +
    `TOTAL:\n${formatCurrency(order.totalAmount || 0)}\n\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `CUSTOMER DETAILS\n\n` +
    `Name:\n${order.customerName || "Customer"}\n\n` +
    `Mobile:\n${order.phone || "N/A"}\n\n` +
    `Email:\n${order.email || "N/A"}\n\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `DELIVERY ADDRESS\n\n` +
    `Address:\n${order.address || ""}\n\n` +
    `City:\n${order.city || ""}\n\n` +
    `State:\n${order.state || ""}\n\n` +
    `Pincode:\n${order.pincode || ""}\n\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `PAYMENT:\n${order.paymentMethod || "UPI"}\n\n` +
    `Please confirm this order.\n\n` +
    `Thank you.`
  );

  return msg;
}

/**
 * 4. Create Order (Atomic Firestore Transaction)
 */
exports.createOrder = functions.https.onCall(async (data, context) => {
  const {
    customerName,
    phone,
    email,
    address,
    city,
    state,
    pincode,
    items = [],
    paymentMethod = "UPI",
    notes = ""
  } = data;

  if (!customerName || !phone || !address || !items || items.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required order fields.");
  }

  const customerId = context.auth ? context.auth.uid : "guest";

  return await db.runTransaction(async (transaction) => {
    // 1. Fetch active 24K gold rate
    const ratesSnap = await transaction.get(
      db.collection("gold_rates").where("purity", "==", "24K").where("isActive", "==", true).limit(1)
    );
    let activeGoldRate = 9240;
    if (!ratesSnap.empty) {
      activeGoldRate = ratesSnap.docs[0].data().ratePerGram;
    }

    let calculatedSubtotal = 0;
    let calculatedMakingCharges = 0;
    let calculatedGst = 0;
    let calculatedTotal = 0;
    let processedItems = [];

    // 2. Read products & verify inventory stock
    for (const item of items) {
      const prodId = item.productId || "seed-product-1";
      const qty = item.quantity || 1;

      const prodRef = db.collection("products").doc(prodId);
      const prodDoc = await transaction.get(prodRef);

      const invRef = db.collection("inventory").doc(prodId);
      const invDoc = await transaction.get(invRef);

      let pData = {
        name: "Signature 1 Gram 24K Gold Coin",
        sku: "CJ-24K-C01",
        purity: "24K / 999",
        weightGrams: 1.0,
        makingCharge: 280,
        gstPercentage: 3,
        imageUrl: "https://chinni-jewels.web.app/assets/hero_gold_coin.png"
      };

      if (prodDoc.exists) {
        pData = prodDoc.data();
      }

      let invData = {
        totalQuantity: 50,
        availableQuantity: 50,
        reservedQuantity: 0,
        soldQuantity: 0,
        damagedQuantity: 0
      };

      if (invDoc.exists) {
        invData = invDoc.data();
      }

      if (invData.availableQuantity < qty) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `Insufficient stock available for product ${pData.name}. Requested: ${qty}, Available: ${invData.availableQuantity}`
        );
      }

      // Calculate snapshot pricing
      const itemGoldRate = activeGoldRate;
      const itemGoldValue = itemGoldRate * (pData.weightGrams || 1.0) * qty;
      const itemMaking = (pData.makingCharge || 0) * qty;
      const itemSubtotal = itemGoldValue + itemMaking;
      const itemGst = Math.round(itemSubtotal * ((pData.gstPercentage || 3) / 100));
      const itemTotal = itemSubtotal + itemGst;

      calculatedSubtotal += itemGoldValue;
      calculatedMakingCharges += itemMaking;
      calculatedGst += itemGst;
      calculatedTotal += itemTotal;

      processedItems.push({
        productId: prodId,
        productName: pData.name,
        productImageUrl: pData.images && pData.images[0] ? pData.images[0] : (pData.imageUrl || "assets/hero_gold_coin.png"),
        sku: pData.sku || "CJ-24K-C01",
        weightGrams: pData.weightGrams || 1.0,
        purity: pData.purity || "24K / 999",
        quantity: qty,
        goldRate: itemGoldRate,
        goldValue: itemGoldValue,
        makingCharge: itemMaking,
        gst: itemGst,
        discount: 0,
        unitPrice: itemTotal / qty,
        totalPrice: itemTotal,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update Inventory Stock (AVAILABLE -> RESERVED)
      transaction.set(invRef, {
        productId: prodId,
        availableQuantity: invData.availableQuantity - qty,
        reservedQuantity: invData.reservedQuantity + qty,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Create Inventory Transaction Record
      const invTransRef = db.collection("inventory_transactions").doc();
      transaction.set(invTransRef, {
        id: invTransRef.id,
        productId: prodId,
        transactionType: "RESERVATION",
        quantity: qty,
        previousStock: invData.availableQuantity,
        newStock: invData.availableQuantity - qty,
        referenceType: "ORDER",
        reason: "Stock reserved for new customer order",
        createdBy: customerId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // 3. Generate Order Number
    const orderNumber = await generateOrderNumber(transaction);

    // 4. Create Order Doc
    const orderRef = db.collection("orders").doc();
    const orderId = orderRef.id;

    const orderData = {
      id: orderId,
      orderNumber,
      customerId,
      customerName,
      phone,
      email: email || "",
      address,
      city,
      state,
      pincode,
      subtotal: calculatedSubtotal,
      makingCharges: calculatedMakingCharges,
      gst: calculatedGst,
      discount: 0,
      totalAmount: calculatedTotal,
      paymentMethod,
      paymentStatus: "PENDING",
      orderStatus: "PENDING",
      whatsappStatus: "READY",
      items: processedItems,
      notes,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    transaction.set(orderRef, orderData);

    // Write subcollection order items
    for (const item of processedItems) {
      const itemRef = orderRef.collection("items").doc();
      transaction.set(itemRef, item);
    }

    // Write Audit Log
    const auditRef = db.collection("audit_logs").doc();
    transaction.set(auditRef, {
      userId: customerId,
      action: "CREATE_ORDER",
      entityType: "ORDER",
      entityId: orderId,
      newData: { orderNumber, totalAmount: calculatedTotal },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // 5. Build WhatsApp Message & Link
    const whatsappMessage = generateOrderWhatsAppMessage(orderData);
    const encodedMsg = encodeURIComponent(whatsappMessage);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${WHATSAPP_BUSINESS_NUMBER}&text=${encodedMsg}`;

    transaction.update(orderRef, { whatsappMessage, whatsappUrl });

    return {
      orderId,
      orderNumber,
      totalAmount: calculatedTotal,
      whatsappUrl,
      whatsappMessage
    };
  });
});

/**
 * 5. Update Order Status (Confirm, Cancel, Ship)
 */
exports.updateOrderStatus = functions.https.onCall(async (data, context) => {
  const { orderId, newStatus } = data;

  if (!orderId || !newStatus) {
    throw new functions.https.HttpsError("invalid-argument", "orderId and newStatus are required.");
  }

  const userId = context.auth ? context.auth.uid : "system";

  return await db.runTransaction(async (transaction) => {
    const orderRef = db.collection("orders").doc(orderId);
    const orderDoc = await transaction.get(orderRef);

    if (!orderDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Order not found.");
    }

    const order = orderDoc.data();
    const currentStatus = order.orderStatus;

    if (currentStatus === newStatus) {
      return { success: true, message: "Order status is already up to date." };
    }

    // Handle Stock Transitions
    if (newStatus === "CONFIRMED" && currentStatus === "PENDING") {
      // RESERVED -> SOLD
      for (const item of order.items || []) {
        const invRef = db.collection("inventory").doc(item.productId);
        const invDoc = await transaction.get(invRef);
        if (invDoc.exists) {
          const inv = invDoc.data();
          transaction.update(invRef, {
            reservedQuantity: Math.max(0, inv.reservedQuantity - item.quantity),
            soldQuantity: (inv.soldQuantity || 0) + item.quantity,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
    } else if (newStatus === "CANCELLED" && (currentStatus === "PENDING" || currentStatus === "CONFIRMED")) {
      // RESERVED/SOLD -> AVAILABLE
      for (const item of order.items || []) {
        const invRef = db.collection("inventory").doc(item.productId);
        const invDoc = await transaction.get(invRef);
        if (invDoc.exists) {
          const inv = invDoc.data();
          const revertFromReserved = currentStatus === "PENDING";
          transaction.update(invRef, {
            reservedQuantity: revertFromReserved ? Math.max(0, inv.reservedQuantity - item.quantity) : inv.reservedQuantity,
            soldQuantity: !revertFromReserved ? Math.max(0, inv.soldQuantity - item.quantity) : inv.soldQuantity,
            availableQuantity: inv.availableQuantity + item.quantity,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          const transRef = db.collection("inventory_transactions").doc();
          transaction.set(transRef, {
            id: transRef.id,
            productId: item.productId,
            transactionType: "RELEASE",
            quantity: item.quantity,
            previousStock: inv.availableQuantity,
            newStock: inv.availableQuantity + item.quantity,
            referenceType: "ORDER_CANCEL",
            referenceId: orderId,
            reason: `Stock released due to order cancellation (${order.orderNumber})`,
            createdBy: userId,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
    }

    transaction.update(orderRef, {
      orderStatus: newStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const auditRef = db.collection("audit_logs").doc();
    transaction.set(auditRef, {
      userId,
      action: "UPDATE_ORDER_STATUS",
      entityType: "ORDER",
      entityId: orderId,
      oldData: { status: currentStatus },
      newData: { status: newStatus },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, orderId, previousStatus: currentStatus, newStatus };
  });
});
