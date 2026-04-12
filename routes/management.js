const express = require('express');
const router = express.Router();
const DailySales = require('../models/DailySales');
const PurchaseHeader = require('../models/PurchaseHeader');
const PurchaseLine = require('../models/PurchaseLine');
const OnlineSettlement = require('../models/OnlineSettlement');
const Expense = require('../models/Expense');
const Salary = require('../models/Salary');
const Vendor = require('../models/Vendor');
const MasterValue = require('../models/MasterValue');
const ChecklistLog = require('../models/ChecklistLog');
const User = require('../models/User');
const ManagementInventory = require('../models/ManagementInventory');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Apply admin protection to all management routes
router.use(authenticateToken, requireAdmin);

// --- Daily Sales Routes ---

// Get all daily sales entries
router.get('/daily-sales', async (req, res) => {
  try {
    const sales = await DailySales.find().sort({ date: -1 });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new daily sales entry
router.post('/daily-sales', async (req, res) => {
  try {
    const { date, cash, upi, swiggy, zomato, notes } = req.body;
    
    // Check if entry for this date already exists
    const existingEntry = await DailySales.findOne({ date: new Date(date) });
    if (existingEntry) {
      return res.status(400).json({ message: 'Sales entry for this date already exists' });
    }

    const newEntry = new DailySales({
      date,
      cash,
      upi,
      swiggy,
      zomato,
      notes,
      createdBy: req.user.id
    });

    const savedEntry = await newEntry.save();
    res.status(201).json(savedEntry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update daily sales entry
router.put('/daily-sales/:id', async (req, res) => {
  try {
    const entry = await DailySales.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });

    // Update fields
    const { date, cash, upi, swiggy, zomato, notes } = req.body;
    
    if (date !== undefined) {
      const newDate = new Date(date);
      // Check if another entry for this date already exists
      const existingEntry = await DailySales.findOne({ 
        date: newDate,
        _id: { $ne: req.params.id }
      });
      if (existingEntry) {
        return res.status(400).json({ message: 'Sales entry for this date already exists' });
      }
      entry.date = newDate;
    }

    if (cash !== undefined) entry.cash = cash;
    if (upi !== undefined) entry.upi = upi;
    if (swiggy !== undefined) entry.swiggy = swiggy;
    if (zomato !== undefined) entry.zomato = zomato;
    if (notes !== undefined) entry.notes = notes;

    // .save() will trigger the pre('save') hook to recalculate total
    const savedEntry = await entry.save();
    res.json(savedEntry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete daily sales entry
router.delete('/daily-sales/:id', async (req, res) => {
  try {
    const entry = await DailySales.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- Purchase Header Routes ---

// Get all purchase headers
router.get('/purchase-headers', async (req, res) => {
  try {
    const headers = await PurchaseHeader.find().sort({ date: -1 });
    res.json(headers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new purchase header
router.post('/purchase-headers', async (req, res) => {
  try {
    const newHeader = new PurchaseHeader({
      ...req.body,
      createdBy: req.user.id
    });
    const savedHeader = await newHeader.save();
    res.status(201).json(savedHeader);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update purchase header
router.put('/purchase-headers/:id', async (req, res) => {
  try {
    const updatedHeader = await PurchaseHeader.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );
    if (!updatedHeader) return res.status(404).json({ message: 'Header not found' });
    res.json(updatedHeader);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete purchase header
router.delete('/purchase-headers/:id', async (req, res) => {
  try {
    const header = await PurchaseHeader.findByIdAndDelete(req.params.id);
    if (!header) return res.status(404).json({ message: 'Header not found' });
    
    // Also delete associated purchase lines
    await PurchaseLine.deleteMany({ purchaseHeader: req.params.id });
    
    res.json({ message: 'Header and associated lines deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- Purchase Line Routes ---

// Get all purchase lines
router.get('/purchase-lines', async (req, res) => {
  try {
    const { billNo } = req.query;
    let query = {};
    if (billNo) {
      const header = await PurchaseHeader.findOne({ billNo });
      if (header) query.purchaseHeader = header._id;
    }
    
    const lines = await PurchaseLine.find(query).populate('purchaseHeader', 'billNo vendor');
    res.json(lines);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new purchase line
router.post('/purchase-lines', async (req, res) => {
  try {
    const newLines = Array.isArray(req.body) ? req.body : [req.body];
    const savedLines = [];

    for (const lineData of newLines) {
      const newLine = new PurchaseLine({
        ...lineData,
        createdBy: req.user.id
      });
      const savedLine = await newLine.save();
      savedLines.push(savedLine);
    }

    res.status(201).json(savedLines);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update purchase line
router.put('/purchase-lines/:id', async (req, res) => {
  try {
    const line = await PurchaseLine.findById(req.params.id);
    if (!line) return res.status(404).json({ message: 'Line not found' });

    const { purchaseHeader, item, quantity, rate } = req.body;
    if (purchaseHeader !== undefined) line.purchaseHeader = purchaseHeader;
    if (item !== undefined) line.item = item;
    if (quantity !== undefined) line.quantity = quantity;
    if (rate !== undefined) line.rate = rate;

    const savedLine = await line.save();
    res.json(savedLine);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete purchase line
router.delete('/purchase-lines/:id', async (req, res) => {
  try {
    const line = await PurchaseLine.findByIdAndDelete(req.params.id);
    if (!line) return res.status(404).json({ message: 'Line not found' });
    res.json({ message: 'Line deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- Online Settlement Routes ---

// Get all online settlements
router.get('/online-settlements', async (req, res) => {
  try {
    const settlements = await OnlineSettlement.find().sort({ paymentDate: -1 });
    res.json(settlements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new online settlement
router.post('/online-settlements', async (req, res) => {
  try {
    const newSettlement = new OnlineSettlement({
      ...req.body,
      createdBy: req.user.id
    });
    const savedSettlement = await newSettlement.save();
    res.status(201).json(savedSettlement);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update online settlement
router.put('/online-settlements/:id', async (req, res) => {
  try {
    const settlement = await OnlineSettlement.findById(req.params.id);
    if (!settlement) return res.status(404).json({ message: 'Settlement not found' });

    Object.assign(settlement, req.body);
    const savedSettlement = await settlement.save();
    res.json(savedSettlement);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete online settlement
router.delete('/online-settlements/:id', async (req, res) => {
  try {
    const settlement = await OnlineSettlement.findByIdAndDelete(req.params.id);
    if (!settlement) return res.status(404).json({ message: 'Settlement not found' });
    res.json({ message: 'Settlement deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- Expense Routes ---

// Get all expenses
router.get('/expenses', async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new expense
router.post('/expenses', async (req, res) => {
  try {
    const newExpense = new Expense({
      ...req.body,
      createdBy: req.user.id
    });
    const savedExpense = await newExpense.save();
    res.status(201).json(savedExpense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update expense
router.put('/expenses/:id', async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json(expense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete expense
router.delete('/expenses/:id', async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- Salary Routes ---

// Get all salaries
router.get('/salaries', async (req, res) => {
  try {
    const salaries = await Salary.find()
      .populate('employee', 'username email')
      .sort({ date: -1 });
    res.json(salaries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new salary payment
router.post('/salaries', async (req, res) => {
  try {
    const newSalary = new Salary({
      ...req.body,
      paidBy: req.user.id
    });
    const savedSalary = await newSalary.save();
    res.status(201).json(savedSalary);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update salary payment
router.put('/salaries/:id', async (req, res) => {
  try {
    const salary = await Salary.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );
    if (!salary) return res.status(404).json({ message: 'Salary record not found' });
    res.json(salary);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete salary payment
router.delete('/salaries/:id', async (req, res) => {
  try {
    const salary = await Salary.findByIdAndDelete(req.params.id);
    if (!salary) return res.status(404).json({ message: 'Salary record not found' });
    res.json({ message: 'Salary record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- Master Routes (Vendors) ---

router.get('/vendors', async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ name: 1 });
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/vendors', async (req, res) => {
  try {
    const vendor = new Vendor(req.body);
    await vendor.save();
    res.status(201).json(vendor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put('/vendors/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(vendor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/vendors/:id', async (req, res) => {
  try {
    await Vendor.findByIdAndDelete(req.params.id);
    res.json({ message: 'Vendor deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- Master Values Routes ---

router.get('/master-values', async (req, res) => {
  try {
    const values = await MasterValue.find().sort({ type: 1, value: 1 });
    res.json(values);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/master-values', async (req, res) => {
  try {
    const value = new MasterValue(req.body);
    await value.save();
    res.status(201).json(value);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put('/master-values/:id', async (req, res) => {
  try {
    const value = await MasterValue.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(value);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/master-values/:id', async (req, res) => {
  try {
    await MasterValue.findByIdAndDelete(req.params.id);
    res.json({ message: 'Value deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- Checklist Routes ---

router.get('/checklists', async (req, res) => {
  try {
    const logs = await ChecklistLog.find()
      .populate('user', 'username')
      .sort({ date: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/checklists', async (req, res) => {
  try {
    const log = new ChecklistLog({
      ...req.body,
      user: req.user.id
    });
    await log.save();
    res.status(201).json(log);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/checklists/:id', async (req, res) => {
  try {
    await ChecklistLog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Log deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- Reports Route ---

router.get('/reports', async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    const start = new Date(fromDate);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);

    const dateQuery = { date: { $gte: start, $lte: end } };
    const dateQueryPayment = { paymentDate: { $gte: start, $lte: end } };

    // Aggregate Daily Sales
    const salesData = await DailySales.aggregate([
      { $match: dateQuery },
      { $group: { 
        _id: null, 
        totalSales: { $sum: "$total" },
        cashSales: { $sum: "$cash" },
        upiSales: { $sum: "$upi" },
        swiggySales: { $sum: "$swiggy" },
        zomatoSales: { $sum: "$zomato" }
      }}
    ]);

    // Aggregate Purchases
    const purchaseData = await PurchaseHeader.aggregate([
      { $match: dateQuery },
      { $group: { _id: null, totalPurchases: { $sum: "$totalBillAmount" } }}
    ]);

    // Aggregate Expenses
    const expenseData = await Expense.aggregate([
      { $match: dateQuery },
      { $group: { _id: null, totalExpenses: { $sum: "$amount" } }}
    ]);

    // Aggregate Online Settlements (Charges)
    const settlementData = await OnlineSettlement.aggregate([
      { $match: dateQueryPayment },
      { $group: { 
        _id: null, 
        totalCharges: { $sum: "$charges" },
        totalReceived: { $sum: "$payoutReceived" },
        totalExpected: { $sum: "$payoutExpected" }
      }}
    ]);

    const sales = salesData[0] || { totalSales: 0, cashSales: 0, upiSales: 0, swiggySales: 0, zomatoSales: 0 };
    const purchases = purchaseData[0] || { totalPurchases: 0 };
    const expenses = expenseData[0] || { totalExpenses: 0 };
    const settlements = settlementData[0] || { totalCharges: 0, totalReceived: 0, totalExpected: 0 };

    res.json({
      sales,
      purchases,
      expenses,
      settlements
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- Management Inventory Routes ---

// Get all inventory items
router.get('/inventory', async (req, res) => {
  try {
    const items = await ManagementInventory.find().sort({ category: 1, item: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Save or Update Stock
router.post('/inventory', async (req, res) => {
  try {
    const { item, category, unit, openingStock, usedQty, closingStock } = req.body;
    
    let inventoryItem = await ManagementInventory.findOne({ item });
    
    if (inventoryItem) {
      // Update existing
      if (category) inventoryItem.category = category;
      if (unit) inventoryItem.unit = unit;
      if (openingStock !== undefined) inventoryItem.openingStock = openingStock;
      if (usedQty !== undefined) inventoryItem.usedQty = usedQty;
      if (closingStock !== undefined) {
        inventoryItem.closingStock = closingStock;
      } else {
        // Calculate closing stock if not overridden
        // Closing = Opening + Purchased - Used
        inventoryItem.closingStock = (inventoryItem.openingStock || 0) + (inventoryItem.purchasedQty || 0) - (usedQty || 0);
      }
      await inventoryItem.save();
    } else {
      // Create new
      inventoryItem = new ManagementInventory({
        item,
        category,
        unit,
        openingStock,
        usedQty,
        closingStock: closingStock !== undefined ? closingStock : (openingStock || 0) - (usedQty || 0),
        createdBy: req.user.id
      });
      await inventoryItem.save();
    }
    
    res.status(200).json(inventoryItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update Threshold
router.put('/inventory/threshold', async (req, res) => {
  try {
    const { item, threshold } = req.body;
    const inventoryItem = await ManagementInventory.findOneAndUpdate(
      { item },
      { threshold },
      { new: true, upsert: true }
    );
    res.json(inventoryItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete Inventory Item
router.delete('/inventory/:id', async (req, res) => {
  try {
    await ManagementInventory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
