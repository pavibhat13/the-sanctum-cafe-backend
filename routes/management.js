const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
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
        totalGrossSales: { $sum: "$grossSales" }
      }}
    ]);

    const sales = salesData[0] || { totalSales: 0, cashSales: 0, upiSales: 0, swiggySales: 0, zomatoSales: 0 };
    const purchases = purchaseData[0] || { totalPurchases: 0 };
    const expenses = expenseData[0] || { totalExpenses: 0 };
    const settlements = settlementData[0] || { totalCharges: 0, totalReceived: 0, totalGrossSales: 0 };

    res.json({
      sales,
      purchases,
      expenses,
      settlements,
      totalExpectedPayout: settlements.totalGrossSales - settlements.totalCharges
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET Purchase Summary Report
router.get('/reports/purchase-summary', async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ message: 'From and To dates are required' });
    }

    const start = new Date(from);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);

    // 1. Get all individual purchase lines in the date range
    const lines = await PurchaseLine.aggregate([
      {
        $lookup: {
          from: 'purchaseheaders',
          localField: 'purchaseHeader',
          foreignField: '_id',
          as: 'header'
        }
      },
      { $unwind: '$header' },
      {
        $match: {
          'header.date': { $gte: start, $lte: end }
        }
      },
      {
        $project: {
          date: '$header.date',
          item: '$item',
          quantity: '$quantity',
          unitPrice: { $cond: [{ $gt: ['$quantity', 0] }, { $divide: ['$rate', '$quantity'] }, 0] },
          _id: 1
        }
      },
      { $sort: { date: -1, item: 1 } }
    ]);

    // 2. Determine price change per item within this set
    const itemPrices = {};
    lines.forEach(line => {
      if (!itemPrices[line.item]) itemPrices[line.item] = new Set();
      itemPrices[line.item].add(Number(line.unitPrice.toFixed(2)));
    });

    const finalData = lines.map(line => ({
      ...line,
      priceChanged: itemPrices[line.item].size > 1
    }));

    res.json({ success: true, data: finalData });
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

// Export to Excel Route
router.get('/export-excel', async (req, res) => {
  try {
    const { type, fromDate, toDate, vendor, platform } = req.query;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(type || 'Export');
    
    let query = {};
    if (fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      
      if (type === 'online-settlements') {
        query.paymentDate = { $gte: start, $lte: end };
      } else if (type !== 'inventory') {
        query.date = { $gte: start, $lte: end };
      }
    }

    if (vendor && type === 'purchase-header') query.vendor = vendor;
    if (platform && type === 'online-settlements') query.platform = platform;

    let data = [];
    let columns = [];

    switch (type) {
      case 'daily-sales':
        data = await DailySales.find(query).sort({ date: -1 });
        columns = [
          { header: 'Date', key: 'date', width: 15 },
          { header: 'Cash', key: 'cash', width: 12 },
          { header: 'UPI', key: 'upi', width: 12 },
          { header: 'Swiggy', key: 'swiggy', width: 12 },
          { header: 'Zomato', key: 'zomato', width: 12 },
          { header: 'Total', key: 'total', width: 12 },
          { header: 'Notes', key: 'notes', width: 30 }
        ];
        break;
      case 'expenses':
        data = await Expense.find(query).sort({ date: -1 });
        columns = [
          { header: 'Date', key: 'date', width: 15 },
          { header: 'Category', key: 'category', width: 20 },
          { header: 'Amount', key: 'amount', width: 12 },
          { header: 'Notes', key: 'notes', width: 30 }
        ];
        break;
      case 'purchase-header':
        data = await PurchaseHeader.find(query).sort({ date: -1 });
        columns = [
          { header: 'Date', key: 'date', width: 15 },
          { header: 'Bill No', key: 'billNo', width: 15 },
          { header: 'Vendor', key: 'vendor', width: 25 },
          { header: 'Total Amount', key: 'totalAmount', width: 15 },
          { header: 'Payment Method', key: 'paymentMethod', width: 20 }
        ];
        break;
      case 'purchase-line':
        data = await PurchaseLine.find(query).populate('purchaseHeader', 'billNo vendor date').sort({ createdAt: -1 });
        columns = [
          { header: 'Date', key: 'headerDate', width: 15 },
          { header: 'Bill No', key: 'billNo', width: 15 },
          { header: 'Vendor', key: 'vendor', width: 25 },
          { header: 'Item', key: 'item', width: 25 },
          { header: 'Quantity', key: 'quantity', width: 12 },
          { header: 'Rate', key: 'rate', width: 12 },
          { header: 'Total', key: 'lineTotal', width: 12 }
        ];
        break;
      case 'online-settlements':
        data = await OnlineSettlement.find(query).sort({ paymentDate: -1 });
        columns = [
          { header: 'Platform', key: 'platform', width: 15 },
          { header: 'From', key: 'fromDate', width: 15 },
          { header: 'To', key: 'toDate', width: 15 },
          { header: 'Payment Date', key: 'paymentDate', width: 15 },
          { header: 'Gross Sales', key: 'grossSales', width: 15 },
          { header: 'Charges', key: 'charges', width: 12 },
          { header: 'Expected (G-C)', key: 'expectedPayout', width: 15 },
          { header: 'Received', key: 'payoutReceived', width: 15 },
          { header: 'Difference', key: 'difference', width: 15 },
          { header: 'Ref', key: 'reference', width: 20 }
        ];
        break;
      case 'inventory':
        data = await ManagementInventory.find().sort({ category: 1, item: 1 });
        columns = [
          { header: 'Item', key: 'item', width: 25 },
          { header: 'Category', key: 'category', width: 20 },
          { header: 'Unit', key: 'unit', width: 10 },
          { header: 'Opening', key: 'openingStock', width: 10 },
          { header: 'Purchased', key: 'purchasedQty', width: 10 },
          { header: 'Used', key: 'usedQty', width: 10 },
          { header: 'Closing', key: 'closingStock', width: 10 },
          { header: 'Threshold', key: 'threshold', width: 10 }
        ];
        break;
      case 'salaries':
        data = await Salary.find(query).populate('employee', 'username role').sort({ date: -1 });
        columns = [
          { header: 'Date', key: 'date', width: 15 },
          { header: 'Employee', key: 'employeeName', width: 20 },
          { header: 'Role', key: 'employeeRole', width: 15 },
          { header: 'Amount', key: 'amount', width: 12 },
          { header: 'Type', key: 'type', width: 15 },
          { header: 'Payment Method', key: 'paymentMethod', width: 15 },
          { header: 'Notes', key: 'notes', width: 30 }
        ];
        break;
      case 'purchase-summary':
        const summaryStart = new Date(fromDate);
        const summaryEnd = new Date(toDate);
        summaryEnd.setHours(23, 59, 59, 999);
        const summaryLines = await PurchaseLine.aggregate([
          {
            $lookup: {
              from: 'purchaseheaders',
              localField: 'purchaseHeader',
              foreignField: '_id',
              as: 'header'
            }
          },
          { $unwind: '$header' },
          {
            $match: {
              'header.date': { $gte: summaryStart, $lte: summaryEnd }
            }
          },
          {
            $project: {
              date: '$header.date',
              item: '$item',
              quantity: '$quantity',
              unitPrice: { $cond: [{ $gt: ['$quantity', 0] }, { $divide: ['$rate', '$quantity'] }, 0] },
              _id: 0
            }
          },
          { $sort: { date: -1, item: 1 } }
        ]);

        const summaryItemPrices = {};
        summaryLines.forEach(line => {
          if (!summaryItemPrices[line.item]) summaryItemPrices[line.item] = new Set();
          summaryItemPrices[line.item].add(Number(line.unitPrice.toFixed(2)));
        });

        data = summaryLines.map(line => ({
          ...line,
          date: new Date(line.date).toLocaleDateString(),
          priceChanged: summaryItemPrices[line.item].size > 1 ? 'Yes' : 'No'
        }));

        columns = [
          { header: 'Date', key: 'date', width: 15 },
          { header: 'Item', key: 'item', width: 25 },
          { header: 'Quantity', key: 'quantity', width: 12 },
          { header: 'Unit Price', key: 'unitPrice', width: 15 },
          { header: 'Price Changed', key: 'priceChanged', width: 15 }
        ];
        break;
      case 'pnl-simple':
      case 'pnl-detailed':
        const start = new Date(fromDate);
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        const dateQuery = { date: { $gte: start, $lte: end } };
        const dateQueryPayment = { paymentDate: { $gte: start, $lte: end } };

        const salesAgg = await DailySales.aggregate([{ $match: dateQuery }, { $group: { _id: null, total: { $sum: "$total" }, cash: { $sum: "$cash" }, upi: { $sum: "$upi" }, swiggy: { $sum: "$swiggy" }, zomato: { $sum: "$zomato" } } }]);
        const purchaseAgg = await PurchaseHeader.aggregate([{ $match: dateQuery }, { $group: { _id: null, total: { $sum: "$totalBillAmount" } } }]);
        const expenseAgg = await Expense.aggregate([{ $match: dateQuery }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
        const settlementAgg = await OnlineSettlement.aggregate([{ $match: dateQueryPayment }, { $group: { _id: null, charges: { $sum: "$charges" } } }]);

        const s = salesAgg[0] || { total: 0, cash: 0, upi: 0, swiggy: 0, zomato: 0 };
        const p = purchaseAgg[0] || { total: 0 };
        const e = expenseAgg[0] || { total: 0 };
        const st = settlementAgg[0] || { charges: 0 };

        columns = [
          { header: 'Metric', key: 'metric', width: 30 },
          { header: 'Amount', key: 'amount', width: 20 }
        ];

        if (type === 'pnl-simple') {
          data = [
            { metric: 'Total Sales', amount: s.total },
            { metric: 'Purchases', amount: p.total },
            { metric: 'Expenses', amount: e.total },
            { metric: 'Simple Profit / Loss', amount: s.total - p.total - e.total }
          ];
        } else {
          data = [
            { metric: 'Offline Sales (Cash + UPI)', amount: s.cash + s.upi },
            { metric: 'Online Sales (Swiggy + Zomato)', amount: s.swiggy + s.zomato },
            { metric: 'Total Gross Sales', amount: s.total },
            { metric: 'Purchases', amount: p.total },
            { metric: 'Expenses', amount: e.total },
            { metric: 'Swiggy/Zomato Charges', amount: st.charges },
            { metric: 'Detailed Profit / Loss', amount: s.total - p.total - e.total - st.charges }
          ];
        }
        break;
      default:
        return res.status(400).json({ message: 'Invalid export type' });
    }

    sheet.columns = columns;
    
    // Add data rows
    if (type.startsWith('pnl-') || type === 'purchase-summary') {
      data.forEach(item => sheet.addRow(item));
    } else {
      data.forEach(item => {
        const row = { ...item.toObject() };
        
        // Flatten employee object for salaries
        if (type === 'salaries' && row.employee) {
          row.employeeName = row.employee.username;
          row.employeeRole = row.employee.role;
        }

        // Flatten purchase header for lines
        if (type === 'purchase-line' && row.purchaseHeader) {
          row.billNo = row.purchaseHeader.billNo;
          row.vendor = row.purchaseHeader.vendor;
          row.headerDate = new Date(row.purchaseHeader.date).toLocaleDateString();
          row.lineTotal = (row.quantity || 0) * (row.rate || 0);
        }

        // Settlement specific flattening
        if (type === 'online-settlements') {
          row.expectedPayout = (row.grossSales || 0) - (row.charges || 0);
          row.difference = row.expectedPayout - (row.payoutReceived || 0);
        }

        ['date', 'paymentDate', 'fromDate', 'toDate'].forEach(key => {
          if (row[key]) row[key] = new Date(row[key]).toLocaleDateString();
        });
        sheet.addRow(row);
      });
    }

    // Style the header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-${new Date().toISOString().split('T')[0]}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Save or Update Stock
router.post('/inventory', async (req, res) => {
  try {
    const { item, category, unit, openingStock, usedQty, closingStock } = req.body;
    
    let inventoryItem = await ManagementInventory.findOne({ item: { $regex: new RegExp(`^${item.trim()}$`, 'i') } });
    
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
        inventoryItem.closingStock = (inventoryItem.openingStock || 0) + (inventoryItem.purchasedQty || 0) - (inventoryItem.usedQty || 0);
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
      { item: { $regex: new RegExp(`^${item.trim()}$`, 'i') } },
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

// Management Dashboard Routes
router.get('/dashboard-stats', async (req, res) => {
  try {
    // 1. Total Sales & Offline Sales
    const salesData = await DailySales.aggregate([
      {
        $group: {
          _id: null,
          totalCash: { $sum: '$cash' },
          totalUpi: { $sum: '$upi' },
          totalSwiggy: { $sum: '$swiggy' },
          totalZomato: { $sum: '$zomato' }
        }
      }
    ]);
    
    const offlineSales = salesData.length > 0 ? (salesData[0].totalCash + salesData[0].totalUpi) : 0;
    const onlineSales = salesData.length > 0 ? (salesData[0].totalSwiggy + salesData[0].totalZomato) : 0;
    const totalSales = offlineSales + onlineSales;

    // 2. Total Purchases
    const purchaseData = await PurchaseHeader.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);
    const totalPurchases = purchaseData.length > 0 ? purchaseData[0].totalAmount : 0;

    // 3. Total Expenses
    const expenseData = await Expense.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    const totalExpenses = expenseData.length > 0 ? expenseData[0].totalAmount : 0;

    // 4. Online Charges
    const settlementData = await OnlineSettlement.aggregate([
      {
        $group: {
          _id: null,
          totalCharges: { $sum: '$charges' }
        }
      }
    ]);
    const onlineCharges = settlementData.length > 0 ? settlementData[0].totalCharges : 0;

    // 5. P&L Calculations
    const simplePnL = totalSales - totalPurchases - totalExpenses;
    const detailedPnL = simplePnL - onlineCharges;

    // 6. Threshold Alerts & Low Stock Items
    const lowStockItems = await ManagementInventory.find({
      $expr: { $lte: ['$closingStock', '$threshold'] }
    });
    const thresholdAlerts = lowStockItems.length;

    // 7. Top Vendors by Bill Total
    const topVendors = await PurchaseHeader.aggregate([
      {
        $group: {
          _id: '$vendor',
          total: { $sum: '$totalAmount' }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
      {
        $project: {
          vendor: '$_id',
          total: 1,
          _id: 0
        }
      }
    ]);

    res.json({
      totalSales,
      totalPurchases,
      totalExpenses,
      simplePnL,
      onlineCharges,
      detailedPnL,
      offlineSales,
      onlineSales,
      thresholdAlerts,
      lowStockItems,
      topVendors
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- Invoice Reading & Automation Routes ---

// Parse Excel invoice from base64 string
router.post('/parse-invoice', async (req, res) => {
  try {
    const { fileData } = req.body; // Expecting base64 string
    if (!fileData) return res.status(400).json({ message: 'No file data provided' });

    const buffer = Buffer.from(fileData.split(',')[1] || fileData, 'base64');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const worksheet = workbook.getWorksheet(1);
    const items = [];

    // Assuming format: Row 1 is header. Col 1: Item, Col 2: Quantity, Col 3: Rate
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        const item = row.getCell(1).value;
        const quantity = Number(row.getCell(2).value);
        const rate = Number(row.getCell(3).value);

        if (item && !isNaN(quantity) && !isNaN(rate)) {
          const totalAmount = rate; // The 'rate' column in Excel is treated as Total Amount
          items.push({
            item: String(item).trim(),
            quantity,
            rate: totalAmount, // Stored as 'rate' in PurchaseLine model
            unitPrice: quantity > 0 ? (totalAmount / quantity) : 0,
            total: totalAmount
          });
        }
      }
    });

    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ message: 'Failed to parse Excel file: ' + error.message });
  }
});

// Normalization function to handle spelling variations (double letters, non-alphanumeric)
const normalizeItemName = (name) => {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/(.)\1+/g, '$1');
};

// Confirm and save invoice items, update inventory
router.post('/confirm-invoice', async (req, res) => {
  try {
    const { purchaseHeaderId, items } = req.body;
    
    if (!purchaseHeaderId || !items || !Array.isArray(items)) {
      return res.status(400).json({ message: 'Invalid confirmation data' });
    }

    const header = await PurchaseHeader.findById(purchaseHeaderId);
    if (!header) throw new Error('Purchase header not found');

    const createdLines = [];
    const allInventory = await ManagementInventory.find({});

    for (const itemData of items) {
      // 1. Create Purchase Line
      const newLine = new PurchaseLine({
        purchaseHeader: purchaseHeaderId,
        item: itemData.item,
        quantity: itemData.quantity,
        rate: itemData.rate,
        createdBy: req.user.id
      });
      await newLine.save();
      createdLines.push(newLine);

      // 2. Update Management Inventory with normalization check
      const normInput = normalizeItemName(itemData.item);
      let inventoryItem = allInventory.find(inv => normalizeItemName(inv.item) === normInput);
      
      if (inventoryItem) {
        // Increment purchasedQty and recalculate closingStock
        inventoryItem.purchasedQty = (inventoryItem.purchasedQty || 0) + itemData.quantity;
        // Closing = Opening + Purchased - Used
        inventoryItem.closingStock = (inventoryItem.openingStock || 0) + inventoryItem.purchasedQty - (inventoryItem.usedQty || 0);
        await inventoryItem.save();
      } else {
        // Optionally create new inventory item if it doesn't exist
        const newInventory = new ManagementInventory({
          item: itemData.item,
          category: 'Other', // Default
          unit: 'Pkt',
          openingStock: 0,
          purchasedQty: itemData.quantity,
          usedQty: 0,
          closingStock: itemData.quantity,
          createdBy: req.user.id
        });
        await newInventory.save();
        allInventory.push(newInventory); // Update local list to avoid duplicates in same batch
      }
    }

    res.json({ success: true, message: `${createdLines.length} items processed successfully`, data: createdLines });
  } catch (error) {
    res.status(500).json({ message: 'Failed to process invoice: ' + error.message });
  }
});

module.exports = router;
