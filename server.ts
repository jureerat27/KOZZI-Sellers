import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// API Routes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Check Google Workspace OAuth status
app.get("/api/sheets/status", (_req, res) => {
  const token = process.env.WORKSPACE_ACCESS_TOKEN;
  res.json({
    connected: !!token,
    hasToken: !!token,
    message: token ? "Google Workspace connected" : "Google Workspace not connected",
  });
});

// Sync data to Google Sheets
app.post("/api/sheets/sync", async (req, res) => {
  try {
    const accessToken = process.env.WORKSPACE_ACCESS_TOKEN;
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: "Google Workspace token missing. Please authorize via OAuth settings.",
      });
    }

    const { products = [], customers = [], documents = [], expenses = [], spreadsheetId: existingId } = req.body;

    let spreadsheetId = existingId;
    let spreadsheetUrl = "";

    // 1. Create a new Spreadsheet if not provided
    if (!spreadsheetId) {
      const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: {
            title: `SellersApp_Backup_${new Date().toISOString().split("T")[0]}`,
          },
          sheets: [
            { properties: { title: "Orders & Docs" } },
            { properties: { title: "Products" } },
            { properties: { title: "Customers" } },
            { properties: { title: "Expenses" } },
            { properties: { title: "Monthly P&L Summary" } },
          ],
        }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error("Failed to create spreadsheet:", errText);
        return res.status(createRes.status).json({
          success: false,
          error: `Google Sheets API Error: ${createRes.statusText}`,
          details: errText,
        });
      }

      const createData = await createRes.json();
      spreadsheetId = createData.spreadsheetId;
      spreadsheetUrl = createData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    } else {
      spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    }

    // 2. Format values for each sheet
    // Orders & Docs
    const docRows = [
      ["Doc Number", "Type", "Date", "Customer Name", "Total Amount (THB)", "Status", "Payment Method", "Items Count"],
      ...documents.map((d: any) => [
        d.docNumber || "",
        d.type || "",
        d.date || "",
        d.customerName || "",
        d.grandTotal || 0,
        d.status || "",
        d.paymentMethod || "",
        d.items ? d.items.length : 0,
      ]),
    ];

    // Products
    const productRows = [
      ["SKU", "Product Name", "Category", "Selling Price (THB)", "Cost Price (THB)", "Stock Qty", "Min Stock Alert", "Status"],
      ...products.map((p: any) => [
        p.sku || "",
        p.name || "",
        p.category || "",
        p.price || 0,
        p.costPrice || 0,
        p.stock || 0,
        p.minStock || 0,
        (p.stock || 0) <= (p.minStock || 0) ? "LOW_STOCK" : "OK",
      ]),
    ];

    // Customers
    const customerRows = [
      ["Customer Code", "Name", "Phone", "Address", "Tax ID / ID Card", "Total Spent (THB)"],
      ...customers.map((c: any) => [
        c.code || "",
        c.name || "",
        c.phone || "",
        c.address || "",
        c.taxId || "",
        c.totalSpent || 0,
      ]),
    ];

    // Expenses
    const expenseRows = [
      ["Date", "Category", "Description", "Amount (THB)", "Recipient / Supplier"],
      ...expenses.map((e: any) => [
        e.date || "",
        e.category || "",
        e.description || "",
        e.amount || 0,
        e.recipient || "",
      ]),
    ];

    // Monthly P&L Summary calculation
    const monthlyMap: Record<string, { income: number; expense: number; orders: number }> = {};
    documents.forEach((d: any) => {
      if (d.status === "PAID" || d.status === "APPROVED") {
        const m = (d.date || "").substring(0, 7) || "Unspecified";
        if (!monthlyMap[m]) monthlyMap[m] = { income: 0, expense: 0, orders: 0 };
        monthlyMap[m].income += d.grandTotal || 0;
        monthlyMap[m].orders += 1;
      }
    });
    expenses.forEach((e: any) => {
      const m = (e.date || "").substring(0, 7) || "Unspecified";
      if (!monthlyMap[m]) monthlyMap[m] = { income: 0, expense: 0, orders: 0 };
      monthlyMap[m].expense += e.amount || 0;
    });

    const summaryRows = [
      ["Month (YYYY-MM)", "Total Income (THB)", "Total Expenses (THB)", "Net Profit/Loss (THB)", "Completed Orders"],
      ...Object.keys(monthlyMap)
        .sort()
        .reverse()
        .map((m) => {
          const inc = monthlyMap[m].income;
          const exp = monthlyMap[m].expense;
          return [m, inc, exp, inc - exp, monthlyMap[m].orders];
        }),
    ];

    // Batch update spreadsheet ranges
    const batchData = [
      { range: "'Orders & Docs'!A1", values: docRows },
      { range: "Products!A1", values: productRows },
      { range: "Customers!A1", values: customerRows },
      { range: "Expenses!A1", values: expenseRows },
      { range: "'Monthly P&L Summary'!A1", values: summaryRows },
    ];

    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          valueInputOption: "USER_ENTERED",
          data: batchData,
        }),
      }
    );

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.error("Failed to update Google Sheets values:", errText);
      return res.status(updateRes.status).json({
        success: false,
        error: "Failed to write values to Google Sheet",
        details: errText,
      });
    }

    return res.json({
      success: true,
      spreadsheetId,
      spreadsheetUrl,
      updatedAt: new Date().toISOString(),
      message: "Synced successfully to Google Sheets!",
    });
  } catch (error: any) {
    console.error("Sheets sync error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Internal server error during Google Sheets sync",
    });
  }
});

// LINE Notify API proxy
app.post("/api/line/notify", async (req, res) => {
  try {
    const { token, message } = req.body;
    if (!token || !message) {
      return res.status(400).json({ success: false, error: "Missing token or message" });
    }

    const params = new URLSearchParams();
    params.append("message", message);

    const lineRes = await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${token}`,
      },
      body: params,
    });

    const data = await lineRes.json();
    if (lineRes.ok) {
      return res.json({ success: true, message: "LINE Notification sent successfully", lineResponse: data });
    } else {
      return res.status(lineRes.status).json({ success: false, error: data.message || "Failed to send LINE notification" });
    }
  } catch (err: any) {
    console.error("LINE Notify Proxy error:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error sending LINE notification" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
