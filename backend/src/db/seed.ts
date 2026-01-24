import { db } from "./index";
import { users, services, revenues, expenses, madenis, goals, settings } from "./schema";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database...");

  // Create tables first
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      is_active INTEGER DEFAULT 1,
      is_admin INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      icon TEXT DEFAULT 'building',
      color TEXT DEFAULT 'blue',
      is_active INTEGER DEFAULT 1,
      daily_target REAL DEFAULT 0,
      monthly_target REAL DEFAULT 0,
      yearly_target REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS revenues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER REFERENCES services(id),
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      description TEXT,
      payment_method TEXT DEFAULT 'cash',
      reference TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER REFERENCES services(id),
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      vendor TEXT,
      is_recurring INTEGER DEFAULT 0,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS madenis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER REFERENCES services(id),
      debtor_name TEXT NOT NULL,
      debtor_contact TEXT,
      debtor_email TEXT,
      debtor_address TEXT,
      original_amount REAL NOT NULL,
      amount_paid REAL DEFAULT 0,
      balance REAL NOT NULL,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT DEFAULT 'current',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS madeni_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      madeni_id INTEGER REFERENCES madenis(id),
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      reference TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER REFERENCES services(id),
      title TEXT NOT NULL,
      description TEXT,
      goal_type TEXT NOT NULL,
      period TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL DEFAULT 0,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER REFERENCES services(id),
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      description TEXT,
      reference_type TEXT,
      reference_id INTEGER,
      payment_method TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      type TEXT NOT NULL DEFAULT 'string',
      label TEXT,
      description TEXT,
      is_public INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Clear existing data
  await db.delete(goals);
  await db.delete(madenis);
  await db.delete(expenses);
  await db.delete(revenues);
  await db.delete(services);
  await db.delete(users);

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const adminResult = await db
    .insert(users)
    .values({
      email: "admin@meilleur.com",
      username: "admin",
      passwordHash: hashedPassword,
      fullName: "System Admin",
      isAdmin: true,
    })
    .returning();

  const adminUser = adminResult[0];
  console.log("✅ Created admin user:", adminUser.email);

  // Create services
  const serviceData = [
    { name: "Transport", description: "Transportation and logistics services", icon: "truck", color: "blue", dailyTarget: 5000, monthlyTarget: 150000, yearlyTarget: 1800000 },
    { name: "Logistics", description: "Warehousing and supply chain", icon: "package", color: "green", dailyTarget: 4000, monthlyTarget: 120000, yearlyTarget: 1440000 },
    { name: "Real Estate", description: "Property management and rentals", icon: "building", color: "purple", dailyTarget: 3000, monthlyTarget: 90000, yearlyTarget: 1080000 },
    { name: "Agriculture", description: "Farming and agribusiness", icon: "wheat", color: "yellow", dailyTarget: 2500, monthlyTarget: 75000, yearlyTarget: 900000 },
    { name: "Retail", description: "Retail stores and e-commerce", icon: "shopping-cart", color: "orange", dailyTarget: 3500, monthlyTarget: 105000, yearlyTarget: 1260000 },
    { name: "Construction", description: "Building and construction", icon: "hammer", color: "gray", dailyTarget: 6000, monthlyTarget: 180000, yearlyTarget: 2160000 },
  ];

  const createdServices = await db.insert(services).values(serviceData).returning();
  console.log(`✅ Created ${createdServices.length} services`);

  // Generate revenue data for the past 12 months
  const today = new Date();
  const revenueData: any[] = [];
  const expenseData: any[] = [];

  for (const service of createdServices) {
    for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
      const date = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
      const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

      // Generate daily entries for each month
      for (let day = 1; day <= daysInMonth; day++) {
        const entryDate = new Date(date.getFullYear(), date.getMonth(), day);
        if (entryDate > today) break;

        const dateStr = entryDate.toISOString().split("T")[0];
        
        // Random daily revenue (70-130% of daily target)
        const revenueAmount = Math.round(service.dailyTarget! * (0.7 + Math.random() * 0.6));
        revenueData.push({
          serviceId: service.id,
          amount: revenueAmount,
          date: dateStr,
          description: `Daily revenue for ${service.name}`,
          paymentMethod: ["cash", "bank", "mobile"][Math.floor(Math.random() * 3)],
          createdBy: adminUser.id,
        });

        // Random daily expense (20-40% of revenue)
        if (Math.random() > 0.3) {
          const expenseAmount = Math.round(revenueAmount * (0.2 + Math.random() * 0.2));
          expenseData.push({
            serviceId: service.id,
            amount: expenseAmount,
            date: dateStr,
            category: ["fixed", "variable", "operating"][Math.floor(Math.random() * 3)],
            description: `Operating expense for ${service.name}`,
            createdBy: adminUser.id,
          });
        }
      }
    }
  }

  // Insert in batches
  const batchSize = 100;
  for (let i = 0; i < revenueData.length; i += batchSize) {
    const batch = revenueData.slice(i, i + batchSize);
    await db.insert(revenues).values(batch);
  }
  console.log(`✅ Created ${revenueData.length} revenue entries`);

  for (let i = 0; i < expenseData.length; i += batchSize) {
    const batch = expenseData.slice(i, i + batchSize);
    await db.insert(expenses).values(batch);
  }
  console.log(`✅ Created ${expenseData.length} expense entries`);

  // Create madeni (debt) entries
  const madeniData = [
    { serviceId: createdServices[0].id, debtorName: "ABC Corporation", debtorContact: "+255 755 123 456", originalAmount: 4200, amountPaid: 0, balance: 4200, issueDate: "2025-11-01", dueDate: "2025-12-01", status: "overdue" },
    { serviceId: createdServices[1].id, debtorName: "XYZ Holdings Ltd", debtorContact: "+255 755 234 567", originalAmount: 3100, amountPaid: 500, balance: 2600, issueDate: "2025-11-15", dueDate: "2025-12-15", status: "overdue" },
    { serviceId: createdServices[2].id, debtorName: "Prime Industries", debtorContact: "+255 755 345 678", originalAmount: 2800, amountPaid: 0, balance: 2800, issueDate: "2025-12-01", dueDate: "2026-01-01", status: "overdue" },
    { serviceId: createdServices[3].id, debtorName: "Global Trading Co", debtorContact: "+255 755 456 789", originalAmount: 5500, amountPaid: 1000, balance: 4500, issueDate: "2025-12-15", dueDate: "2026-01-15", status: "pending" },
    { serviceId: createdServices[0].id, debtorName: "Metro Services", debtorContact: "+255 755 567 890", originalAmount: 1800, amountPaid: 0, balance: 1800, issueDate: "2026-01-01", dueDate: "2026-01-20", status: "pending" },
    { serviceId: createdServices[4].id, debtorName: "City Builders Inc", debtorContact: "+255 755 678 901", originalAmount: 7200, amountPaid: 0, balance: 7200, issueDate: "2026-01-10", dueDate: "2026-02-10", status: "current" },
    { serviceId: createdServices[5].id, debtorName: "Sunrise Enterprises", debtorContact: "+255 755 789 012", originalAmount: 9500, amountPaid: 2000, balance: 7500, issueDate: "2025-10-01", dueDate: "2025-11-01", status: "overdue" },
    { serviceId: createdServices[1].id, debtorName: "Delta Logistics", debtorContact: "+255 755 890 123", originalAmount: 6300, amountPaid: 6300, balance: 0, issueDate: "2025-09-01", dueDate: "2025-10-01", status: "paid" },
  ];

  await db.insert(madenis).values(madeniData);
  console.log(`✅ Created ${madeniData.length} madeni entries`);

  // Create goals
  const currentMonth = today.toISOString().slice(0, 7);
  const goalsData = [
    { title: "Monthly Revenue Target", goalType: "revenue", period: "monthly", targetAmount: 150000, currentAmount: 125000, startDate: `${currentMonth}-01`, endDate: `${currentMonth}-31`, status: "active" },
    { serviceId: createdServices[0].id, title: "Transport Q1 Target", goalType: "revenue", period: "monthly", targetAmount: 50000, currentAmount: 42000, startDate: `${currentMonth}-01`, endDate: `${currentMonth}-31`, status: "active" },
    { serviceId: createdServices[1].id, title: "Logistics Growth", goalType: "revenue", period: "monthly", targetAmount: 40000, currentAmount: 38000, startDate: `${currentMonth}-01`, endDate: `${currentMonth}-31`, status: "active" },
    { title: "Reduce Expenses", goalType: "expense", period: "monthly", targetAmount: 30000, currentAmount: 28000, startDate: `${currentMonth}-01`, endDate: `${currentMonth}-31`, status: "active" },
    { title: "Debt Collection Target", goalType: "revenue", period: "monthly", targetAmount: 20000, currentAmount: 9800, startDate: `${currentMonth}-01`, endDate: `${currentMonth}-31`, status: "active" },
  ];

  await db.insert(goals).values(goalsData);
  console.log(`✅ Created ${goalsData.length} goals`);

  // Create default settings
  const now = new Date().toISOString();
  const defaultSettings = [
    // General Settings
    { key: "app.name", value: "Meilleur Insights", category: "general", type: "string", label: "Application Name", description: "The name displayed in the application header", isPublic: true },
    { key: "app.tagline", value: "Multi-Service Business Dashboard", category: "general", type: "string", label: "Tagline", description: "Application tagline/subtitle", isPublic: true },
    { key: "app.timezone", value: "Africa/Dar_es_Salaam", category: "general", type: "string", label: "Timezone", description: "Default timezone for the application" },
    { key: "app.dateFormat", value: "DD/MM/YYYY", category: "general", type: "string", label: "Date Format", description: "Default date format (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)" },
    
    // Currency Settings
    { key: "currency.code", value: "TZS", category: "currency", type: "string", label: "Currency Code", description: "ISO 4217 currency code", isPublic: true },
    { key: "currency.symbol", value: "TSh", category: "currency", type: "string", label: "Currency Symbol", description: "Currency symbol to display", isPublic: true },
    { key: "currency.position", value: "before", category: "currency", type: "string", label: "Symbol Position", description: "Position of currency symbol (before/after)" },
    { key: "currency.decimalPlaces", value: "0", category: "currency", type: "number", label: "Decimal Places", description: "Number of decimal places to display" },
    { key: "currency.thousandsSeparator", value: ",", category: "currency", type: "string", label: "Thousands Separator", description: "Character for thousands separator" },
    
    // Appearance Settings
    { key: "appearance.theme", value: "system", category: "appearance", type: "string", label: "Theme", description: "Application theme (light/dark/system)" },
    { key: "appearance.primaryColor", value: "#3b82f6", category: "appearance", type: "string", label: "Primary Color", description: "Primary brand color", isPublic: true },
    { key: "appearance.compactMode", value: "false", category: "appearance", type: "boolean", label: "Compact Mode", description: "Enable compact UI mode" },
    
    // Notification Settings
    { key: "notifications.email", value: "true", category: "notifications", type: "boolean", label: "Email Notifications", description: "Enable email notifications" },
    { key: "notifications.push", value: "true", category: "notifications", type: "boolean", label: "Push Notifications", description: "Enable push notifications" },
    { key: "notifications.debtReminders", value: "true", category: "notifications", type: "boolean", label: "Debt Reminders", description: "Send reminders for upcoming debt due dates" },
    { key: "notifications.goalAlerts", value: "true", category: "notifications", type: "boolean", label: "Goal Alerts", description: "Alert when goals are at risk or achieved" },
    { key: "notifications.weeklyReport", value: "true", category: "notifications", type: "boolean", label: "Weekly Reports", description: "Send weekly summary reports" },
    
    // Reports Settings
    { key: "reports.defaultPeriod", value: "month", category: "reports", type: "string", label: "Default Period", description: "Default time period for reports (week/month/quarter/year)" },
    { key: "reports.includeLogo", value: "true", category: "reports", type: "boolean", label: "Include Logo", description: "Include company logo in generated reports" },
    { key: "reports.companyName", value: "Meilleur Business Services", category: "reports", type: "string", label: "Company Name", description: "Company name for report headers" },
    { key: "reports.companyAddress", value: "Dar es Salaam, Tanzania", category: "reports", type: "string", label: "Company Address", description: "Company address for reports" },
    
    // Business Rules
    { key: "business.debtOverdueDays", value: "30", category: "business", type: "number", label: "Overdue Days", description: "Days after due date to mark debt as overdue" },
    { key: "business.fiscalYearStart", value: "01-01", category: "business", type: "string", label: "Fiscal Year Start", description: "Start of fiscal year (MM-DD)" },
    { key: "business.workingDaysPerWeek", value: "6", category: "business", type: "number", label: "Working Days", description: "Number of working days per week" },
  ];

  // Clear existing settings
  await db.delete(settings);
  
  for (const setting of defaultSettings) {
    await db.insert(settings).values({
      key: setting.key,
      value: setting.value,
      category: setting.category,
      type: setting.type as "string" | "number" | "boolean" | "json",
      label: setting.label,
      description: setting.description,
      isPublic: setting.isPublic ?? false,
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log(`✅ Created ${defaultSettings.length} settings`);

  console.log("\n🎉 Database seeded successfully!");
  console.log("\nLogin credentials:");
  console.log("  Email: admin@meilleur.com");
  console.log("  Password: admin123");
  
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
