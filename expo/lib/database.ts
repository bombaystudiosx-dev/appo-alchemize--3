import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import type {
  Manifestation,
  Goal,
  GoalChecklistItem,
  GoalCompletion,
  Habit,
  HabitCompletion,
  Transaction,
  Meal,
  PlannedMeal,
  Task,
  GratitudeEntry,
  Affirmation,
  Workout,
  UserProfile,
  FinancialIncome,
  FinancialExpense,
  FinancialNote,
  FoodLog,
  SavedFood,
  NutritionGoal,
  BodyMetric,
  Appointment,
  UserNutritionProfile,
  WaterLog,
  MealPrepPlan,
  FitnessGoal,
  WorkoutTemplate,
  WorkoutSession,
  NormalizedMetric,
  FitnessPlan,
  Award,
} from '@/types';

let db: SQLite.SQLiteDatabase | null = null;
let currentUserId: string | null = null;
let dbInitPromise: Promise<SQLite.SQLiteDatabase | null> | null = null;

const webStore: Record<string, any[]> = {};

function getWebTable(name: string): any[] {
  if (!webStore[name]) {
    webStore[name] = [];
  }
  return webStore[name];
}

interface DatabaseAdapter {
  getAllAsync<T>(sql: string, params?: any[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: any[]): Promise<T | null>;
  runAsync(sql: string, params?: any[]): Promise<any>;
  execAsync(sql: string): Promise<void>;
}

const webDb: DatabaseAdapter & { _handleInsert: any; _handleUpdate: any; _handleDelete: any } = {
  async getAllAsync<T>(sql: string, params?: any[]): Promise<T[]> {
    const tableName = extractTableName(sql);
    const table = getWebTable(tableName);
    const whereFilters = extractWhereFilters(sql, params || []);
    let results = table.filter((row: any) => {
      return whereFilters.every(f => {
        if (f.op === '=') return row[f.col] === f.val;
        if (f.op === '>=') return row[f.col] >= f.val;
        if (f.op === '<=') return row[f.col] <= f.val;
        if (f.op === '<') return row[f.col] < f.val;
        if (f.op === '>') return row[f.col] > f.val;
        if (f.op === 'IS NOT NULL') return row[f.col] != null;
        if (f.op === 'IS NULL') return row[f.col] == null;
        if (f.op === '!=') return row[f.col] !== f.val;
        return true;
      });
    });
    const orderBy = extractOrderBy(sql);
    if (orderBy.length > 0) {
      results.sort((a: any, b: any) => {
        for (const o of orderBy) {
          const av = a[o.col] ?? '';
          const bv = b[o.col] ?? '';
          if (av < bv) return o.dir === 'ASC' ? -1 : 1;
          if (av > bv) return o.dir === 'ASC' ? 1 : -1;
        }
        return 0;
      });
    }
    return results as T[];
  },
  async getFirstAsync<T>(sql: string, params?: any[]): Promise<T | null> {
    const results: T[] = await this.getAllAsync(sql, params);
    return results[0] ?? null;
  },
  async runAsync(sql: string, params?: any[]): Promise<any> {
    const sqlUpper = sql.trim().toUpperCase();
    if (sqlUpper.startsWith('INSERT')) {
      return this._handleInsert(sql, params || []);
    } else if (sqlUpper.startsWith('UPDATE')) {
      return this._handleUpdate(sql, params || []);
    } else if (sqlUpper.startsWith('DELETE')) {
      return this._handleDelete(sql, params || []);
    }
    return { changes: 0 };
  },
  async execAsync(_sql: string): Promise<void> {
    const statements = _sql.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      const upper = stmt.toUpperCase();
      if (upper.startsWith('DELETE FROM')) {
        const match = stmt.match(/DELETE\s+FROM\s+(\w+)/i);
        if (match) {
          webStore[match[1]] = [];
        }
      }
    }
  },
  _handleInsert(sql: string, params: any[]) {
    const match = sql.match(/INSERT\s+(?:OR\s+(?:REPLACE|IGNORE)\s+)?INTO\s+(\w+)\s*\(([^)]+)\)/i);
    if (!match) return { changes: 0 };
    const tableName = match[1];
    const columns = match[2].split(',').map(c => c.trim());
    const table = getWebTable(tableName);
    const row: any = {};
    columns.forEach((col, i) => {
      row[col] = params[i] !== undefined ? params[i] : null;
    });
    const isReplace = /OR\s+REPLACE/i.test(sql);
    const isIgnore = /OR\s+IGNORE/i.test(sql);
    const idCol = columns.includes('id') ? 'id' : null;
    if (idCol) {
      const existingIdx = table.findIndex((r: any) => r.id === row.id);
      if (existingIdx >= 0) {
        if (isReplace) {
          table[existingIdx] = row;
          return { changes: 1 };
        } else if (isIgnore) {
          return { changes: 0 };
        }
      }
    }
    table.push(row);
    return { changes: 1 };
  },
  _handleUpdate(sql: string, params: any[]) {
    const tableName = extractTableName(sql);
    const table = getWebTable(tableName);
    const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
    if (!setMatch) {
      const setMatchNoWhere = sql.match(/SET\s+(.+)$/i);
      if (setMatchNoWhere) {
        const setClauses = parseSetClauses(setMatchNoWhere[1]);
        let paramIdx = 0;
        for (const row of table) {
          let localIdx = paramIdx;
          for (const clause of setClauses) {
            if (clause.expr === '?') {
              row[clause.col] = params[localIdx++];
            } else if (clause.expr.includes('+')) {
              const addMatch = clause.expr.match(/(\w+)\s*\+\s*\?/);
              if (addMatch) {
                row[clause.col] = (row[addMatch[1]] || 0) + params[localIdx++];
              }
            }
          }
        }
        return { changes: table.length };
      }
      return { changes: 0 };
    }
    const setClauses = parseSetClauses(setMatch[1]);
    const whereStr = sql.match(/WHERE\s+(.+)$/i)?.[1] || '';
    const whereParts = whereStr.split(/\s+AND\s+/i);
    let _paramIdx = 0;
    const setParamCount = setClauses.filter(c => c.expr.includes('?')).length;
    const setParams = params.slice(0, setParamCount);
    const whereParams = params.slice(setParamCount);
    let changes = 0;
    for (const row of table) {
      let whereParamIdx = 0;
      const matches = whereParts.every(part => {
        const eqMatch = part.match(/(\w+)\s*(=|!=|>=|<=|>|<)\s*\?/);
        if (eqMatch) {
          const col = eqMatch[1];
          const op = eqMatch[2];
          const val = whereParams[whereParamIdx++];
          if (op === '=') return row[col] === val;
          if (op === '!=') return row[col] !== val;
          return true;
        }
        const isNullMatch = part.match(/(\w+)\s+IS\s+NULL/i);
        if (isNullMatch) return row[isNullMatch[1]] == null;
        return true;
      });
      if (matches) {
        let sIdx = 0;
        for (const clause of setClauses) {
          if (clause.expr === '?') {
            row[clause.col] = setParams[sIdx++];
          } else if (clause.expr.includes('+')) {
            const addMatch = clause.expr.match(/(\w+)\s*\+\s*\?/);
            if (addMatch) {
              row[clause.col] = (row[addMatch[1]] || 0) + setParams[sIdx++];
            }
          }
        }
        changes++;
      }
    }
    return { changes };
  },
  _handleDelete(sql: string, params: any[]) {
    const tableName = extractTableName(sql);
    const table = getWebTable(tableName);
    const whereFilters = extractWhereFilters(sql, params);
    const before = table.length;
    webStore[tableName] = table.filter((row: any) => {
      return !whereFilters.every(f => {
        if (f.op === '=') return row[f.col] === f.val;
        if (f.op === '>=') return row[f.col] >= f.val;
        if (f.op === '<=') return row[f.col] <= f.val;
        return true;
      });
    });
    return { changes: before - webStore[tableName].length };
  },
};

function extractTableName(sql: string): string {
  const m = sql.match(/(?:FROM|INTO|UPDATE)\s+(\w+)/i);
  return m ? m[1] : 'unknown';
}

function extractWhereFilters(sql: string, params: any[]): { col: string; op: string; val: any }[] {
  const filters: { col: string; op: string; val: any }[] = [];
  const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|\s+GROUP|$)/i);
  if (!whereMatch) return filters;
  const parts = whereMatch[1].split(/\s+AND\s+/i);
  let paramIdx = 0;
  const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
  if (setMatch) {
    const qCount = (setMatch[1].match(/\?/g) || []).length;
    paramIdx = qCount;
  }
  for (const part of parts) {
    const opMatch = part.match(/(\w+)\s*(>=|<=|!=|=|>|<)\s*\?/);
    if (opMatch) {
      filters.push({ col: opMatch[1], op: opMatch[2], val: params[paramIdx++] });
      continue;
    }
    const isNotNull = part.match(/(\w+)\s+IS\s+NOT\s+NULL/i);
    if (isNotNull) {
      filters.push({ col: isNotNull[1], op: 'IS NOT NULL', val: null });
      continue;
    }
    const isNull = part.match(/(\w+)\s+IS\s+NULL/i);
    if (isNull) {
      filters.push({ col: isNull[1], op: 'IS NULL', val: null });
      continue;
    }
  }
  return filters;
}

function extractOrderBy(sql: string): { col: string; dir: 'ASC' | 'DESC' }[] {
  const m = sql.match(/ORDER\s+BY\s+(.+?)(?:\s+LIMIT|$)/i);
  if (!m) return [];
  return m[1].split(',').map(p => {
    const parts = p.trim().split(/\s+/);
    return { col: parts[0], dir: (parts[1]?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC') as 'ASC' | 'DESC' };
  });
}

function parseSetClauses(setStr: string): { col: string; expr: string }[] {
  const results: { col: string; expr: string }[] = [];
  const parts = setStr.split(',');
  for (const part of parts) {
    const m = part.match(/(\w+)\s*=\s*(.+)/);
    if (m) {
      results.push({ col: m[1].trim(), expr: m[2].trim() });
    }
  }
  return results;
}

export function setCurrentUserId(userId: string | null) {
  currentUserId = userId;
  console.log('[Database] Current user set to:', userId);
}

export function getCurrentUserId(): string | null {
  return currentUserId;
}

export async function initDatabase(): Promise<SQLite.SQLiteDatabase | null> {
  if (db) return db;
  if (dbInitPromise) return dbInitPromise;
  
  if (Platform.OS === 'web') {
    console.log('[Database] Disabled on web - using memory-only mode');
    return null;
  }
  
  dbInitPromise = (async () => {
    try {
      db = await SQLite.openDatabaseAsync('alchemize.db');
    } catch (error) {
      console.error('[Database] Failed to open database:', error);
      dbInitPromise = null;
      throw error;
    }
    return db;
  })();
  await dbInitPromise;
  if (!db) throw new Error('Database failed to open');
  const initializedDb = db as SQLite.SQLiteDatabase;
  
  try {
    await initializedDb.execAsync('PRAGMA journal_mode = WAL;');
    
    await initializedDb.execAsync(`
      CREATE TABLE IF NOT EXISTS user_profile (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      fullName TEXT NOT NULL,
      email TEXT NOT NULL,
      totalXp INTEGER NOT NULL DEFAULT 0,
      totalEnergy INTEGER NOT NULL DEFAULT 0,
      currentStreak INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS manifestations (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      intention TEXT NOT NULL,
      images TEXT NOT NULL,
      isFavorite INTEGER NOT NULL DEFAULT 0,
      orderIndex INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      targetDate INTEGER,
      status TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      streak INTEGER NOT NULL DEFAULT 0,
      bestStreak INTEGER NOT NULL DEFAULT 0,
      lastCompletedDate INTEGER,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS goal_checklist_items (
      id TEXT PRIMARY KEY,
      goalId TEXT NOT NULL,
      text TEXT NOT NULL,
      isDone INTEGER NOT NULL,
      FOREIGN KEY (goalId) REFERENCES goals(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS goal_completions (
      id TEXT PRIMARY KEY,
      goalId TEXT NOT NULL,
      completionDate INTEGER NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      completedAt INTEGER NOT NULL,
      FOREIGN KEY (goalId) REFERENCES goals(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '✨',
      goal INTEGER NOT NULL DEFAULT 1,
      goalUnit TEXT,
      type TEXT NOT NULL DEFAULT 'checkbox',
      frequencyType TEXT NOT NULL,
      customDays TEXT NOT NULL,
      currentProgress INTEGER NOT NULL DEFAULT 0,
      streak INTEGER NOT NULL DEFAULT 0,
      xpReward INTEGER NOT NULL DEFAULT 5,
      energyReward INTEGER NOT NULL DEFAULT 1,
      color TEXT NOT NULL DEFAULT '#6366f1',
      lastCompletedDate TEXT NOT NULL DEFAULT '',
      createdAt INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS habit_completions (
      id TEXT PRIMARY KEY,
      habitId TEXT NOT NULL,
      completionDate INTEGER NOT NULL,
      value INTEGER NOT NULL DEFAULT 1,
      notes TEXT NOT NULL DEFAULT '',
      completedAt INTEGER NOT NULL,
      FOREIGN KEY (habitId) REFERENCES habits(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      date INTEGER NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      note TEXT NOT NULL,
      dayOfWeek INTEGER,
      time TEXT,
      reminderEnabled INTEGER NOT NULL DEFAULT 0,
      reminderTime INTEGER,
      isRecurring INTEGER NOT NULL DEFAULT 0
    );
    
    CREATE TABLE IF NOT EXISTS financial_income (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      incomeGross REAL NOT NULL,
      incomeNet REAL NOT NULL,
      taxAmount REAL NOT NULL DEFAULT 0,
      taxPercentage REAL NOT NULL DEFAULT 0,
      deductions REAL NOT NULL DEFAULT 0,
      incomeCategory TEXT NOT NULL,
      incomeDate INTEGER NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      createdAt INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS financial_expenses (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      expenseName TEXT NOT NULL,
      expenseAmount REAL NOT NULL,
      expenseCategory TEXT NOT NULL,
      expenseDate INTEGER NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      createdAt INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS financial_notes (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      noteLoginInfo TEXT NOT NULL DEFAULT '',
      noteTotalDebt TEXT NOT NULL DEFAULT '',
      debtAmount REAL NOT NULL DEFAULT 0,
      debtDueDate INTEGER,
      savingsAmount REAL NOT NULL DEFAULT 0,
      emergencyFund REAL NOT NULL DEFAULT 0,
      savingsNotes TEXT NOT NULL DEFAULT '',
      updatedAt INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS meals (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      date INTEGER NOT NULL,
      name TEXT NOT NULL,
      calories REAL NOT NULL,
      protein REAL,
      carbs REAL,
      fat REAL,
      notes TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS food_logs (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      foodName TEXT NOT NULL,
      servingDescription TEXT NOT NULL DEFAULT '',
      calories REAL NOT NULL,
      proteinGrams REAL,
      carbGrams REAL,
      fatGrams REAL,
      sugarGrams REAL,
      fiberGrams REAL,
      mealType TEXT NOT NULL,
      sourceType TEXT NOT NULL DEFAULT 'manual',
      loggedAt INTEGER NOT NULL,
      isLocked INTEGER NOT NULL DEFAULT 1,
      calendarEventId TEXT
    );
    
    CREATE TABLE IF NOT EXISTS saved_foods (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      foodName TEXT NOT NULL,
      servingDescription TEXT NOT NULL DEFAULT '',
      calories REAL NOT NULL,
      proteinGrams REAL,
      carbGrams REAL,
      fatGrams REAL,
      sugarGrams REAL,
      fiberGrams REAL,
      tags TEXT NOT NULL DEFAULT '[]',
      createdAt INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS nutrition_goals (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      dailyCalories INTEGER NOT NULL DEFAULT 2000,
      dailyProtein INTEGER NOT NULL DEFAULT 150,
      dailyCarbs INTEGER NOT NULL DEFAULT 250,
      dailyFat INTEGER NOT NULL DEFAULT 65,
      dailySugar INTEGER NOT NULL DEFAULT 50,
      dailyFiber INTEGER NOT NULL DEFAULT 30,
      updatedAt INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS planned_meals (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      date INTEGER NOT NULL,
      slot TEXT NOT NULL,
      name TEXT NOT NULL,
      notes TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT NOT NULL,
      dueDate INTEGER,
      dueTime TEXT,
      isDone INTEGER NOT NULL,
      orderIndex INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      completedDate INTEGER,
      reminderEnabled INTEGER NOT NULL DEFAULT 0,
      reminderTime INTEGER,
      notificationId TEXT,
      priority TEXT
    );
    
    CREATE TABLE IF NOT EXISTS gratitude_entries (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      entryDate INTEGER NOT NULL,
      gratitude1 TEXT NOT NULL,
      gratitude2 TEXT,
      gratitude3 TEXT,
      mood TEXT,
      createdAt INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS affirmations (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      text TEXT NOT NULL,
      category TEXT NOT NULL,
      isFavorite INTEGER NOT NULL,
      createdAt INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      durationMinutes INTEGER NOT NULL,
      caloriesBurned INTEGER,
      notes TEXT NOT NULL,
      date INTEGER NOT NULL,
      createdAt INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS body_metrics (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      date INTEGER NOT NULL,
      weight REAL,
      waist REAL,
      chest REAL,
      hips REAL,
      arms REAL,
      thighs REAL,
      bodyFatPercentage REAL,
      muscleMass REAL,
      notes TEXT NOT NULL DEFAULT '',
      createdAt INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      title TEXT NOT NULL,
      date INTEGER NOT NULL,
      time TEXT NOT NULL,
      category TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      reminder INTEGER NOT NULL DEFAULT 1,
      createdAt INTEGER NOT NULL,
      metadata TEXT
    );
    
    CREATE TABLE IF NOT EXISTS user_nutrition_profiles (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      height REAL NOT NULL,
      heightUnit TEXT NOT NULL DEFAULT 'cm',
      weight REAL NOT NULL,
      weightUnit TEXT NOT NULL DEFAULT 'kg',
      targetWeight REAL NOT NULL,
      age INTEGER NOT NULL,
      gender TEXT NOT NULL,
      activityLevel TEXT NOT NULL,
      goal TEXT NOT NULL,
      weeklyGoal REAL NOT NULL DEFAULT 0.5,
      dailyCalorieTarget INTEGER NOT NULL DEFAULT 2000,
      dailyProteinTarget INTEGER NOT NULL DEFAULT 150,
      dailyCarbsTarget INTEGER NOT NULL DEFAULT 250,
      dailyFatTarget INTEGER NOT NULL DEFAULT 65,
      dailyWaterTarget INTEGER NOT NULL DEFAULT 2000,
      dailyFiberTarget INTEGER NOT NULL DEFAULT 25,
      manualMacros INTEGER NOT NULL DEFAULT 0,
      updatedAt INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS water_logs (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      amount REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT 'ml',
      loggedAt INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS meal_prep_plans (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      weekStartDate INTEGER NOT NULL,
      dayOfWeek INTEGER NOT NULL,
      mealType TEXT NOT NULL,
      foodName TEXT NOT NULL,
      calories REAL NOT NULL,
      protein REAL,
      carbs REAL,
      fat REAL,
      servingSize TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      isCompleted INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS fitness_goals (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      metric TEXT NOT NULL,
      dailyTarget INTEGER NOT NULL,
      createdAt INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS workout_templates (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      durationMinutes INTEGER NOT NULL,
      intensity TEXT NOT NULL,
      equipment TEXT NOT NULL,
      description TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS workout_sessions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      templateId TEXT NOT NULL,
      startedAt INTEGER NOT NULL,
      endedAt INTEGER,
      durationMinutes INTEGER NOT NULL,
      completed INTEGER NOT NULL,
      caloriesEstimate INTEGER,
      source TEXT NOT NULL,
      FOREIGN KEY (templateId) REFERENCES workout_templates(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS normalized_metrics (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      date TEXT NOT NULL,
      activeMinutes INTEGER NOT NULL DEFAULT 0,
      caloriesActive INTEGER NOT NULL DEFAULT 0,
      steps INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL,
      deviceType TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS fitness_plans (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      daysPerWeek INTEGER NOT NULL,
      preferredCategories TEXT NOT NULL,
      durationRangeMin INTEGER NOT NULL,
      durationRangeMax INTEGER NOT NULL,
      intensity TEXT NOT NULL,
      equipment TEXT NOT NULL,
      active INTEGER NOT NULL,
      createdAt INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS awards (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      earnedAt INTEGER
    );
    `);
    
    console.log('[Database] Tables created successfully');
    
    if (db) await runMigrations(db);
  } catch (error) {
    console.error('[Database] Failed to create tables:', error);
    throw error;
  }
  
  console.log('[Database] Initialized successfully');
  return db;
}

async function runMigrations(database: SQLite.SQLiteDatabase) {
  try {
    console.log('[Database] Running migrations...');
    
    const checkColumn = async (table: string, column: string): Promise<boolean> => {
      try {
        const result = await database.getAllAsync(`PRAGMA table_info(${table})`);
        return result.some((col: any) => col.name === column);
      } catch {
        console.log(`[Database] Table ${table} does not exist yet`);
        return false;
      }
    };
    
    const appointmentsHasUserId = await checkColumn('appointments', 'userId');
    const appointmentsHasMetadata = await checkColumn('appointments', 'metadata');
    
    if (!appointmentsHasUserId || !appointmentsHasMetadata) {
      console.log('[Database] Migrating appointments table');
      try {
        await database.execAsync(`DROP TABLE IF EXISTS appointments_new;`);
        await database.execAsync(`
          CREATE TABLE appointments_new (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL DEFAULT '',
            title TEXT NOT NULL,
            date INTEGER NOT NULL,
            time TEXT NOT NULL,
            category TEXT NOT NULL,
            notes TEXT NOT NULL DEFAULT '',
            reminder INTEGER NOT NULL DEFAULT 1,
            createdAt INTEGER NOT NULL,
            metadata TEXT
          );
        `);
        
        try {
          if (appointmentsHasUserId) {
            await database.execAsync(`
              INSERT INTO appointments_new (id, userId, title, date, time, category, notes, reminder, createdAt, metadata)
              SELECT id, userId, title, date, time, category, notes, reminder, createdAt, NULL FROM appointments;
            `);
          } else {
            await database.execAsync(`
              INSERT INTO appointments_new (id, userId, title, date, time, category, notes, reminder, createdAt, metadata)
              SELECT id, '', title, date, time, category, notes, reminder, createdAt, NULL FROM appointments;
            `);
          }
        } catch (insertError) {
          console.log('[Database] No existing appointments to migrate or insert failed:', insertError);
        }
        
        await database.execAsync(`DROP TABLE IF EXISTS appointments;`);
        await database.execAsync(`ALTER TABLE appointments_new RENAME TO appointments;`);
        console.log('[Database] Successfully migrated appointments table');
      } catch (migrationError) {
        console.error('[Database] Failed to migrate appointments:', migrationError);
        try {
          await database.execAsync(`DROP TABLE IF EXISTS appointments_new;`);
          await database.execAsync(`DROP TABLE IF EXISTS appointments;`);
          await database.execAsync(`
            CREATE TABLE appointments (
              id TEXT PRIMARY KEY,
              userId TEXT NOT NULL DEFAULT '',
              title TEXT NOT NULL,
              date INTEGER NOT NULL,
              time TEXT NOT NULL,
              category TEXT NOT NULL,
              notes TEXT NOT NULL DEFAULT '',
              reminder INTEGER NOT NULL DEFAULT 1,
              createdAt INTEGER NOT NULL,
              metadata TEXT
            );
          `);
          console.log('[Database] Created fresh appointments table');
        } catch (recreateError) {
          console.error('[Database] Failed to recreate appointments table:', recreateError);
        }
      }
    }
    
    const gratitudeExists = await checkColumn('gratitude_entries', 'id');
    if (gratitudeExists) {
      const gratitudeHasEntryDate = await checkColumn('gratitude_entries', 'entryDate');
      const hasDateColumn = await checkColumn('gratitude_entries', 'date');
      
      if (!gratitudeHasEntryDate && hasDateColumn) {
        console.log('[Database] Migrating gratitude_entries: date -> entryDate');
        try {
          await database.execAsync('ALTER TABLE gratitude_entries RENAME COLUMN date TO entryDate;');
          console.log('[Database] Successfully renamed date to entryDate');
        } catch (renameError) {
          console.error('[Database] Failed to rename column, attempting workaround:', renameError);
          await database.execAsync(`
            CREATE TABLE gratitude_entries_new (
              id TEXT PRIMARY KEY,
              entryDate INTEGER NOT NULL,
              gratitude1 TEXT NOT NULL,
              gratitude2 TEXT,
              gratitude3 TEXT,
              mood TEXT,
              createdAt INTEGER NOT NULL
            );
            INSERT INTO gratitude_entries_new SELECT id, date as entryDate, gratitude1, gratitude2, gratitude3, mood, createdAt FROM gratitude_entries;
            DROP TABLE gratitude_entries;
            ALTER TABLE gratitude_entries_new RENAME TO gratitude_entries;
          `);
          console.log('[Database] Successfully migrated via table recreation');
        }
      } else if (!gratitudeHasEntryDate && !hasDateColumn) {
        console.log('[Database] gratitude_entries missing entryDate column - rebuilding table');
        await database.execAsync(`
          CREATE TABLE gratitude_entries_new (
            id TEXT PRIMARY KEY,
            entryDate INTEGER NOT NULL,
            gratitude1 TEXT NOT NULL,
            gratitude2 TEXT,
            gratitude3 TEXT,
            mood TEXT,
            createdAt INTEGER NOT NULL
          );
        `);
        
        const hasData = await database.getFirstAsync('SELECT COUNT(*) as count FROM gratitude_entries');
        if (hasData && (hasData as any).count > 0) {
          console.log('[Database] Attempting to preserve existing data');
          try {
            await database.execAsync('INSERT INTO gratitude_entries_new SELECT id, createdAt as entryDate, gratitude1, gratitude2, gratitude3, mood, createdAt FROM gratitude_entries');
          } catch (e) {
            console.error('[Database] Could not preserve data:', e);
          }
        }
        
        await database.execAsync('DROP TABLE gratitude_entries');
        await database.execAsync('ALTER TABLE gratitude_entries_new RENAME TO gratitude_entries');
        console.log('[Database] Table rebuilt with entryDate column');
      }
    }
    
    const nutritionProfileHasFiberTarget = await checkColumn('user_nutrition_profiles', 'dailyFiberTarget');
    if (!nutritionProfileHasFiberTarget) {
      console.log('[Database] Adding dailyFiberTarget column to user_nutrition_profiles');
      try {
        await database.execAsync('ALTER TABLE user_nutrition_profiles ADD COLUMN dailyFiberTarget INTEGER NOT NULL DEFAULT 25');
        console.log('[Database] Successfully added dailyFiberTarget column');
      } catch (e) {
        console.log('[Database] dailyFiberTarget column may already exist:', e);
      }
    }
    
    const nutritionProfileHasManualMacros = await checkColumn('user_nutrition_profiles', 'manualMacros');
    if (!nutritionProfileHasManualMacros) {
      console.log('[Database] Adding manualMacros column to user_nutrition_profiles');
      try {
        await database.execAsync('ALTER TABLE user_nutrition_profiles ADD COLUMN manualMacros INTEGER NOT NULL DEFAULT 0');
        console.log('[Database] Successfully added manualMacros column');
      } catch (e) {
        console.log('[Database] manualMacros column may already exist:', e);
      }
    }
    
    console.log('[Database] Migrations completed');
  } catch (error) {
    console.error('[Database] Migration error:', error);
  }
}

export function getDatabase(): DatabaseAdapter {
  if (Platform.OS === 'web') {
    return webDb;
  }
  if (!db) {
    console.warn('[Database] Database not initialized yet - call initDatabase() first');
    throw new Error('Database not initialized. Please restart the app.');
  }
  return db as unknown as DatabaseAdapter;
}

export async function ensureDatabase(): Promise<DatabaseAdapter> {
  if (Platform.OS === 'web') {
    return webDb;
  }
  if (!db) {
    console.log('[Database] Auto-initializing database...');
    try {
      await initDatabase();
    } catch (error) {
      console.error('[Database] Auto-init failed:', error);
      throw new Error('Failed to initialize database. Please restart the app.');
    }
  }
  if (!db) {
    throw new Error('Database failed to initialize. Please restart the app.');
  }
  return db as unknown as DatabaseAdapter;
}

export async function resetDatabase() {
  if (Platform.OS === 'web') {
    Object.keys(webStore).forEach(key => { webStore[key] = []; });
    console.log('[Database] Web store reset');
    return;
  }
  const database = await ensureDatabase();
  await database.execAsync(`
    DELETE FROM user_profile;
    DELETE FROM manifestations;
    DELETE FROM goals;
    DELETE FROM goal_checklist_items;
    DELETE FROM habits;
    DELETE FROM habit_completions;
    DELETE FROM transactions;
    DELETE FROM financial_income;
    DELETE FROM financial_expenses;
    DELETE FROM financial_notes;
    DELETE FROM meals;
    DELETE FROM food_logs;
    DELETE FROM saved_foods;
    DELETE FROM nutrition_goals;
    DELETE FROM planned_meals;
    DELETE FROM tasks;
    DELETE FROM gratitude_entries;
    DELETE FROM affirmations;
    DELETE FROM workouts;
    DELETE FROM body_metrics;
    DELETE FROM appointments;
    DELETE FROM user_nutrition_profiles;
    DELETE FROM water_logs;
    DELETE FROM meal_prep_plans;
  `);
  console.log('Database reset');
}

export const userProfileDb = {
  async get(): Promise<UserProfile | null> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() || 'default';
    let profile = await database.getFirstAsync<UserProfile>('SELECT * FROM user_profile WHERE userId = ? LIMIT 1', [userId]);
    
    if (!profile) {
      const defaultProfile: UserProfile = {
        id: 'profile_default',
        userId,
        fullName: 'Guest',
        email: '',
        totalXp: 0,
        totalEnergy: 0,
        currentStreak: 0,
        createdAt: Date.now(),
      };
      await database.runAsync(
        `INSERT OR REPLACE INTO user_profile (id, userId, fullName, email, totalXp, totalEnergy, currentStreak, createdAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [defaultProfile.id, defaultProfile.userId, defaultProfile.fullName, defaultProfile.email, defaultProfile.totalXp, defaultProfile.totalEnergy, defaultProfile.currentStreak, defaultProfile.createdAt]
      );
      profile = defaultProfile;
    }
    
    return profile;
  },
  
  async createOrUpdate(profile: UserProfile): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    await database.runAsync(
      `INSERT OR REPLACE INTO user_profile (id, userId, fullName, email, totalXp, totalEnergy, currentStreak, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [profile.id, userId, profile.fullName, profile.email, profile.totalXp, profile.totalEnergy, profile.currentStreak, profile.createdAt]
    );
  },
  
  async updateXpAndEnergy(xp: number, energy: number): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() || 'default';
    
    await this.get();
    
    await database.runAsync(
      'UPDATE user_profile SET totalXp = totalXp + ?, totalEnergy = totalEnergy + ? WHERE userId = ?',
      [xp, energy, userId]
    );
  },
};

export const manifestationsDb = {
  async getAll(): Promise<Manifestation[]> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    const rows = await database.getAllAsync<any>('SELECT * FROM manifestations WHERE userId = ? ORDER BY createdAt DESC', [userId]);
    return rows.map((row) => ({
      ...row,
      images: typeof row.images === 'string' ? JSON.parse(row.images) : Array.isArray(row.images) ? row.images : [],
      isFavorite: Boolean(row.isFavorite),
      order: row.orderIndex ?? row.order ?? 0,
    }));
  },
  
  async getById(id: string): Promise<Manifestation | null> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    const row = await database.getFirstAsync<any>('SELECT * FROM manifestations WHERE id = ? AND userId = ?', [id, userId]);
    if (!row) return null;
    return {
      ...row,
      images: typeof row.images === 'string' ? JSON.parse(row.images) : Array.isArray(row.images) ? row.images : [],
      isFavorite: Boolean(row.isFavorite),
      order: row.orderIndex ?? row.order ?? 0,
    };
  },
  
  async create(manifestation: Manifestation): Promise<void> {
    console.log('[manifestationsDb] create called, ensuring db...');
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    await database.runAsync(
      'INSERT INTO manifestations (id, userId, title, description, category, intention, images, isFavorite, orderIndex, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [manifestation.id, userId, manifestation.title, manifestation.description, manifestation.category, manifestation.intention, JSON.stringify(manifestation.images), manifestation.isFavorite ? 1 : 0, manifestation.order, manifestation.createdAt, manifestation.updatedAt]
    );
  },
  
  async update(manifestation: Manifestation): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    await database.runAsync(
      'UPDATE manifestations SET title = ?, description = ?, category = ?, intention = ?, images = ?, isFavorite = ?, orderIndex = ?, updatedAt = ? WHERE id = ? AND userId = ?',
      [manifestation.title, manifestation.description, manifestation.category, manifestation.intention, JSON.stringify(manifestation.images), manifestation.isFavorite ? 1 : 0, manifestation.order, manifestation.updatedAt, manifestation.id, userId]
    );
  },
  
  async delete(id: string): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    await database.runAsync('DELETE FROM manifestations WHERE id = ? AND userId = ?', [id, userId]);
  },
};

export const goalsDb = {
  async getAll(): Promise<Goal[]> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    return database.getAllAsync<Goal>('SELECT * FROM goals WHERE userId = ? ORDER BY createdAt DESC', [userId]);
  },
  
  async getById(id: string): Promise<Goal | null> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    return database.getFirstAsync<Goal>('SELECT * FROM goals WHERE id = ? AND userId = ?', [id, userId]);
  },
  
  async create(goal: Goal): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    await database.runAsync(
      'INSERT INTO goals (id, userId, title, description, targetDate, status, progress, streak, bestStreak, lastCompletedDate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [goal.id, userId, goal.title, goal.description, goal.targetDate, goal.status, goal.progress, goal.streak, goal.bestStreak, goal.lastCompletedDate, goal.createdAt, goal.updatedAt]
    );
  },
  
  async update(goal: Goal): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    await database.runAsync(
      'UPDATE goals SET title = ?, description = ?, targetDate = ?, status = ?, progress = ?, streak = ?, bestStreak = ?, lastCompletedDate = ?, updatedAt = ? WHERE id = ? AND userId = ?',
      [goal.title, goal.description, goal.targetDate, goal.status, goal.progress, goal.streak, goal.bestStreak, goal.lastCompletedDate, goal.updatedAt, goal.id, userId]
    );
  },
  
  async delete(id: string): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    await database.runAsync('DELETE FROM goals WHERE id = ? AND userId = ?', [id, userId]);
  },
};

export const goalChecklistDb = {
  async getByGoalId(goalId: string): Promise<GoalChecklistItem[]> {
    const database = await ensureDatabase();
    return database.getAllAsync<GoalChecklistItem>('SELECT * FROM goal_checklist_items WHERE goalId = ?', [goalId]);
  },
  
  async create(item: GoalChecklistItem): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync(
      'INSERT INTO goal_checklist_items (id, goalId, text, isDone) VALUES (?, ?, ?, ?)',
      [item.id, item.goalId, item.text, item.isDone ? 1 : 0]
    );
  },
  
  async update(item: GoalChecklistItem): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync(
      'UPDATE goal_checklist_items SET text = ?, isDone = ? WHERE id = ?',
      [item.text, item.isDone ? 1 : 0, item.id]
    );
  },
  
  async delete(id: string): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync('DELETE FROM goal_checklist_items WHERE id = ?', [id]);
  },
};

export const goalCompletionsDb = {
  async getByGoalId(goalId: string): Promise<GoalCompletion[]> {
    const database = await ensureDatabase();
    return database.getAllAsync<GoalCompletion>('SELECT * FROM goal_completions WHERE goalId = ? ORDER BY completionDate DESC', [goalId]);
  },
  
  async getByDateRange(goalId: string, startDate: number, endDate: number): Promise<GoalCompletion[]> {
    const database = await ensureDatabase();
    return database.getAllAsync<GoalCompletion>(
      'SELECT * FROM goal_completions WHERE goalId = ? AND completionDate >= ? AND completionDate <= ? ORDER BY completionDate DESC',
      [goalId, startDate, endDate]
    );
  },
  
  async create(completion: GoalCompletion): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync(
      'INSERT INTO goal_completions (id, goalId, completionDate, notes, completedAt) VALUES (?, ?, ?, ?, ?)',
      [completion.id, completion.goalId, completion.completionDate, completion.notes, completion.completedAt]
    );
  },
  
  async delete(id: string): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync('DELETE FROM goal_completions WHERE id = ?', [id]);
  },
};

export const habitsDb = {
  async getAll(): Promise<Habit[]> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    const rows = await database.getAllAsync<any>('SELECT * FROM habits WHERE userId = ? ORDER BY createdAt DESC', [userId]);
    return rows.map(row => ({
      ...row,
      customDays: JSON.parse(row.customDays),
    }));
  },
  
  async create(habit: Habit): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    await database.runAsync(
      'INSERT INTO habits (id, userId, name, icon, goal, goalUnit, type, frequencyType, customDays, currentProgress, streak, xpReward, energyReward, color, lastCompletedDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [habit.id, userId, habit.name, habit.icon, habit.goal, habit.goalUnit || null, habit.type, habit.frequencyType, JSON.stringify(habit.customDays), habit.currentProgress, habit.streak, habit.xpReward, habit.energyReward, habit.color, habit.lastCompletedDate, habit.createdAt]
    );
  },
  
  async update(habit: Habit): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    await database.runAsync(
      'UPDATE habits SET name = ?, icon = ?, goal = ?, goalUnit = ?, type = ?, frequencyType = ?, customDays = ?, currentProgress = ?, streak = ?, xpReward = ?, energyReward = ?, color = ?, lastCompletedDate = ? WHERE id = ? AND userId = ?',
      [habit.name, habit.icon, habit.goal, habit.goalUnit || null, habit.type, habit.frequencyType, JSON.stringify(habit.customDays), habit.currentProgress, habit.streak, habit.xpReward, habit.energyReward, habit.color, habit.lastCompletedDate, habit.id, userId]
    );
  },
  
  async delete(id: string): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    await database.runAsync('DELETE FROM habits WHERE id = ? AND userId = ?', [id, userId]);
  },
};

export const habitCompletionsDb = {
  async getByHabitId(habitId: string): Promise<HabitCompletion[]> {
    const database = await ensureDatabase();
    return database.getAllAsync<HabitCompletion>('SELECT * FROM habit_completions WHERE habitId = ? ORDER BY completedAt DESC', [habitId]);
  },
  
  async getAll(): Promise<HabitCompletion[]> {
    const database = await ensureDatabase();
    return database.getAllAsync<HabitCompletion>('SELECT * FROM habit_completions ORDER BY completedAt DESC');
  },
  
  async create(completion: HabitCompletion): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync(
      'INSERT INTO habit_completions (id, habitId, completionDate, value, notes, completedAt) VALUES (?, ?, ?, ?, ?, ?)',
      [completion.id, completion.habitId, completion.completionDate, completion.value, completion.notes, completion.completedAt]
    );
  },
  
  async delete(id: string): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync('DELETE FROM habit_completions WHERE id = ?', [id]);
  },
};

export const transactionsDb = {
  async getAll(): Promise<Transaction[]> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    const rows = await database.getAllAsync<any>('SELECT * FROM transactions WHERE userId = ? ORDER BY date DESC', [userId]);
    return rows.map(row => ({
      ...row,
      reminderEnabled: Boolean(row.reminderEnabled),
      isRecurring: Boolean(row.isRecurring),
    }));
  },
  
  async create(transaction: Transaction): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    await database.runAsync(
      'INSERT INTO transactions (id, userId, date, amount, category, note, dayOfWeek, time, reminderEnabled, reminderTime, isRecurring) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [transaction.id, userId, transaction.date, transaction.amount, transaction.category, transaction.note, transaction.dayOfWeek, transaction.time, transaction.reminderEnabled ? 1 : 0, transaction.reminderTime, transaction.isRecurring ? 1 : 0]
    );
  },
  
  async update(transaction: Transaction): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    await database.runAsync(
      'UPDATE transactions SET date = ?, amount = ?, category = ?, note = ?, dayOfWeek = ?, time = ?, reminderEnabled = ?, reminderTime = ?, isRecurring = ? WHERE id = ? AND userId = ?',
      [transaction.date, transaction.amount, transaction.category, transaction.note, transaction.dayOfWeek, transaction.time, transaction.reminderEnabled ? 1 : 0, transaction.reminderTime, transaction.isRecurring ? 1 : 0, transaction.id, userId]
    );
  },
  
  async delete(id: string): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    await database.runAsync('DELETE FROM transactions WHERE id = ? AND userId = ?', [id, userId]);
  },
};

export const financialIncomeDb = {
  async getAll(): Promise<FinancialIncome[]> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    return database.getAllAsync<FinancialIncome>('SELECT * FROM financial_income WHERE userId = ? ORDER BY incomeDate DESC', [userId]);
  },
  
  async create(income: FinancialIncome): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    await database.runAsync(
      'INSERT INTO financial_income (id, userId, incomeGross, incomeNet, taxAmount, taxPercentage, deductions, incomeCategory, incomeDate, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [income.id, userId, income.incomeGross, income.incomeNet, income.taxAmount, income.taxPercentage, income.deductions, income.incomeCategory, income.incomeDate, income.notes, income.createdAt]
    );
  },
  
  async delete(id: string): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    await database.runAsync('DELETE FROM financial_income WHERE id = ? AND userId = ?', [id, userId]);
  },
};

export const financialExpenseDb = {
  async getAll(): Promise<FinancialExpense[]> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    return database.getAllAsync<FinancialExpense>('SELECT * FROM financial_expenses WHERE userId = ? ORDER BY expenseDate DESC', [userId]);
  },
  
  async create(expense: FinancialExpense): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    await database.runAsync(
      'INSERT INTO financial_expenses (id, userId, expenseName, expenseAmount, expenseCategory, expenseDate, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [expense.id, userId, expense.expenseName, expense.expenseAmount, expense.expenseCategory, expense.expenseDate, expense.notes, expense.createdAt]
    );
  },
  
  async delete(id: string): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    await database.runAsync('DELETE FROM financial_expenses WHERE id = ? AND userId = ?', [id, userId]);
  },
};

export const financialNoteDb = {
  async get(): Promise<FinancialNote | null> {
    if (Platform.OS === 'web') {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const userId = getCurrentUserId() ?? 'guest';
      const stored = await AsyncStorage.getItem(`financial_notes_${userId}`);
      return stored ? JSON.parse(stored) : null;
    }
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    return database.getFirstAsync<FinancialNote>('SELECT * FROM financial_notes WHERE userId = ? LIMIT 1', [userId]);
  },
  
  async createOrUpdate(note: FinancialNote): Promise<void> {
    const userId = getCurrentUserId() ?? 'guest';
    if (Platform.OS === 'web') {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem(`financial_notes_${userId}`, JSON.stringify(note));
      return;
    }
    const database = await ensureDatabase();
    await database.runAsync(
      `INSERT OR REPLACE INTO financial_notes (id, userId, noteLoginInfo, noteTotalDebt, debtAmount, debtDueDate, savingsAmount, emergencyFund, savingsNotes, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [note.id, userId, note.noteLoginInfo, note.noteTotalDebt, note.debtAmount, note.debtDueDate, note.savingsAmount, note.emergencyFund, note.savingsNotes || '', note.updatedAt]
    );
  },
};

export const mealsDb = {
  async getAll(): Promise<Meal[]> {
    const database = await ensureDatabase();
    return database.getAllAsync<Meal>('SELECT * FROM meals ORDER BY date DESC');
  },
  
  async create(meal: Meal): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync(
      'INSERT INTO meals (id, date, name, calories, protein, carbs, fat, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [meal.id, meal.date, meal.name, meal.calories, meal.protein, meal.carbs, meal.fat, meal.notes]
    );
  },
  
  async delete(id: string): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync('DELETE FROM meals WHERE id = ?', [id]);
  },
};

export const foodLogsDb = {
  async getAll(): Promise<FoodLog[]> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    const rows = await database.getAllAsync<any>('SELECT * FROM food_logs WHERE userId = ? ORDER BY loggedAt DESC', [userId]);
    return rows.map(row => ({
      ...row,
      isLocked: Boolean(row.isLocked),
    }));
  },
  
  async getByDate(startOfDay: number, endOfDay: number): Promise<FoodLog[]> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    const rows = await database.getAllAsync<any>(
      'SELECT * FROM food_logs WHERE userId = ? AND loggedAt >= ? AND loggedAt < ? ORDER BY loggedAt DESC',
      [userId, startOfDay, endOfDay]
    );
    return rows.map(row => ({
      ...row,
      isLocked: Boolean(row.isLocked),
    }));
  },
  
  async create(log: FoodLog): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync(
      'INSERT INTO food_logs (id, userId, foodName, servingDescription, calories, proteinGrams, carbGrams, fatGrams, sugarGrams, fiberGrams, mealType, sourceType, loggedAt, isLocked, calendarEventId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [log.id, currentUserId || '', log.foodName, log.servingDescription, log.calories, log.proteinGrams, log.carbGrams, log.fatGrams, log.sugarGrams, log.fiberGrams, log.mealType, log.sourceType, log.loggedAt, log.isLocked ? 1 : 0, log.calendarEventId]
    );
  },
  
  async delete(id: string): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync('DELETE FROM food_logs WHERE id = ?', [id]);
  },
};

export const savedFoodsDb = {
  async getAll(): Promise<SavedFood[]> {
    const database = await ensureDatabase();
    const rows = await database.getAllAsync<any>('SELECT * FROM saved_foods ORDER BY foodName');
    return rows.map(row => ({
      ...row,
      tags: JSON.parse(row.tags),
    }));
  },
  
  async create(food: SavedFood): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync(
      'INSERT INTO saved_foods (id, foodName, servingDescription, calories, proteinGrams, carbGrams, fatGrams, sugarGrams, fiberGrams, tags, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [food.id, food.foodName, food.servingDescription, food.calories, food.proteinGrams, food.carbGrams, food.fatGrams, food.sugarGrams, food.fiberGrams, JSON.stringify(food.tags), food.createdAt]
    );
  },
  
  async delete(id: string): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync('DELETE FROM saved_foods WHERE id = ?', [id]);
  },
};

export const nutritionGoalDb = {
  async get(): Promise<NutritionGoal | null> {
    const database = await ensureDatabase();
    return database.getFirstAsync<NutritionGoal>('SELECT * FROM nutrition_goals LIMIT 1');
  },
  
  async createOrUpdate(goal: NutritionGoal): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync(
      `INSERT OR REPLACE INTO nutrition_goals (id, dailyCalories, dailyProtein, dailyCarbs, dailyFat, dailySugar, dailyFiber, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [goal.id, goal.dailyCalories, goal.dailyProtein, goal.dailyCarbs, goal.dailyFat, goal.dailySugar, goal.dailyFiber, goal.updatedAt]
    );
  },
};

export const plannedMealsDb = {
  async getAll(): Promise<PlannedMeal[]> {
    const database = await ensureDatabase();
    return database.getAllAsync<PlannedMeal>('SELECT * FROM planned_meals ORDER BY date, slot');
  },
  
  async create(meal: PlannedMeal): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync(
      'INSERT INTO planned_meals (id, date, slot, name, notes) VALUES (?, ?, ?, ?, ?)',
      [meal.id, meal.date, meal.slot, meal.name, meal.notes]
    );
  },
  
  async delete(id: string): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync('DELETE FROM planned_meals WHERE id = ?', [id]);
  },
};

export const tasksDb = {
  async getAll(): Promise<Task[]> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    const rows = await database.getAllAsync<any>('SELECT * FROM tasks WHERE userId = ? ORDER BY orderIndex, createdAt DESC', [userId]);
    return rows.map(row => ({
      ...row,
      isDone: Boolean(row.isDone),
      reminderEnabled: Boolean(row.reminderEnabled),
      order: row.orderIndex,
    }));
  },
  
  async create(task: Task): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    await database.runAsync(
      'INSERT INTO tasks (id, userId, title, notes, dueDate, dueTime, isDone, orderIndex, createdAt, updatedAt, completedDate, reminderEnabled, reminderTime, notificationId, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [task.id, userId, task.title, task.notes, task.dueDate, task.dueTime, task.isDone ? 1 : 0, task.order, task.createdAt, task.updatedAt, task.completedDate, task.reminderEnabled ? 1 : 0, task.reminderTime, task.notificationId, task.priority]
    );
  },
  
  async update(task: Task): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    await database.runAsync(
      'UPDATE tasks SET title = ?, notes = ?, dueDate = ?, dueTime = ?, isDone = ?, orderIndex = ?, updatedAt = ?, completedDate = ?, reminderEnabled = ?, reminderTime = ?, notificationId = ?, priority = ? WHERE id = ? AND userId = ?',
      [task.title, task.notes, task.dueDate, task.dueTime, task.isDone ? 1 : 0, task.order, task.updatedAt, task.completedDate, task.reminderEnabled ? 1 : 0, task.reminderTime, task.notificationId, task.priority, task.id, userId]
    );
  },
  
  async delete(id: string): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    await database.runAsync('DELETE FROM tasks WHERE id = ? AND userId = ?', [id, userId]);
  },
};

export const gratitudeDb = {
  async getAll(): Promise<GratitudeEntry[]> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    return database.getAllAsync<GratitudeEntry>('SELECT * FROM gratitude_entries WHERE userId = ? ORDER BY entryDate DESC', [userId]);
  },
  
  async getByDate(date: number): Promise<GratitudeEntry | null> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    return database.getFirstAsync<GratitudeEntry>('SELECT * FROM gratitude_entries WHERE entryDate = ? AND userId = ?', [date, userId]);
  },
  
  async create(entry: GratitudeEntry): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    await database.runAsync(
      'INSERT INTO gratitude_entries (id, userId, entryDate, gratitude1, gratitude2, gratitude3, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [entry.id, userId, entry.entryDate, entry.gratitude1, entry.gratitude2, entry.gratitude3, entry.createdAt]
    );
  },
  
  async update(entry: GratitudeEntry): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    await database.runAsync(
      'UPDATE gratitude_entries SET gratitude1 = ?, gratitude2 = ?, gratitude3 = ? WHERE id = ? AND userId = ?',
      [entry.gratitude1, entry.gratitude2, entry.gratitude3, entry.id, userId]
    );
  },
  
  async delete(id: string): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    await database.runAsync('DELETE FROM gratitude_entries WHERE id = ? AND userId = ?', [id, userId]);
  },
};

export const affirmationsDb = {
  async getAll(): Promise<Affirmation[]> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    console.log('[affirmationsDb] getAll userId:', userId);
    const rows = await database.getAllAsync<any>('SELECT * FROM affirmations WHERE userId = ? ORDER BY createdAt DESC', [userId]);
    return rows.map(row => ({
      ...row,
      isFavorite: Boolean(row.isFavorite),
    }));
  },
  
  async create(affirmation: Affirmation): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    console.log('[affirmationsDb] create userId:', userId, 'affirmation:', affirmation.id);
    await database.runAsync(
      'INSERT INTO affirmations (id, userId, text, category, isFavorite, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [affirmation.id, userId, affirmation.text, affirmation.category, affirmation.isFavorite ? 1 : 0, affirmation.createdAt]
    );
    console.log('[affirmationsDb] create success');
  },
  
  async update(affirmation: Affirmation): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    await database.runAsync(
      'UPDATE affirmations SET text = ?, category = ?, isFavorite = ? WHERE id = ? AND userId = ?',
      [affirmation.text, affirmation.category, affirmation.isFavorite ? 1 : 0, affirmation.id, userId]
    );
  },
  
  async delete(id: string): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    await database.runAsync('DELETE FROM affirmations WHERE id = ? AND userId = ?', [id, userId]);
  },
};

export const workoutsDb = {
  async getAll(): Promise<Workout[]> {
    const database = await ensureDatabase();
    return database.getAllAsync<Workout>('SELECT * FROM workouts ORDER BY date DESC');
  },
  
  async create(workout: Workout): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync(
      'INSERT INTO workouts (id, type, durationMinutes, caloriesBurned, notes, date, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [workout.id, workout.type, workout.durationMinutes, workout.caloriesBurned, workout.notes, workout.date, workout.createdAt]
    );
  },
  
  async delete(id: string): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync('DELETE FROM workouts WHERE id = ?', [id]);
  },
};

export const bodyMetricsDb = {
  async getAll(): Promise<BodyMetric[]> {
    const database = await ensureDatabase();
    return database.getAllAsync<BodyMetric>('SELECT * FROM body_metrics ORDER BY date DESC');
  },
  
  async create(metric: BodyMetric): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync(
      'INSERT INTO body_metrics (id, date, weight, waist, chest, hips, arms, thighs, bodyFatPercentage, muscleMass, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [metric.id, metric.date, metric.weight, metric.waist, metric.chest, metric.hips, metric.arms, metric.thighs, metric.bodyFatPercentage, metric.muscleMass, metric.notes, metric.createdAt]
    );
  },
  
  async delete(id: string): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync('DELETE FROM body_metrics WHERE id = ?', [id]);
  },
};

export const appointmentsDb = {
  async getAll(): Promise<Appointment[]> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    const rows = await database.getAllAsync<any>('SELECT * FROM appointments WHERE userId = ? ORDER BY date, time', [userId]);
    return rows.map(row => ({
      ...row,
      reminder: Boolean(row.reminder),
    }));
  },
  
  async create(appointment: Appointment): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    await database.runAsync(
      'INSERT INTO appointments (id, userId, title, date, time, category, notes, reminder, createdAt, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [appointment.id, userId, appointment.title, appointment.date, appointment.time, appointment.category, appointment.notes, appointment.reminder ? 1 : 0, appointment.createdAt, appointment.metadata || null]
    );
  },
  
  async update(appointment: Appointment): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    await database.runAsync(
      'UPDATE appointments SET title = ?, date = ?, time = ?, category = ?, notes = ?, reminder = ?, metadata = ? WHERE id = ? AND userId = ?',
      [appointment.title, appointment.date, appointment.time, appointment.category, appointment.notes, appointment.reminder ? 1 : 0, appointment.metadata || null, appointment.id, userId]
    );
  },
  
  async delete(id: string): Promise<void> {
    const database = await ensureDatabase();
    const userId = getCurrentUserId() ?? 'guest';
    await database.runAsync('DELETE FROM appointments WHERE id = ? AND userId = ?', [id, userId]);
  },
};

export const userNutritionProfileDb = {
  async get(): Promise<UserNutritionProfile | null> {
    const database = await ensureDatabase();
    const row = await database.getFirstAsync<any>('SELECT * FROM user_nutrition_profiles LIMIT 1');
    if (!row) return null;
    return {
      ...row,
      dailyFiberTarget: row.dailyFiberTarget ?? 25,
      manualMacros: Boolean(row.manualMacros),
    };
  },
  
  async createOrUpdate(profile: UserNutritionProfile): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync(
      `INSERT OR REPLACE INTO user_nutrition_profiles (id, userId, height, heightUnit, weight, weightUnit, targetWeight, age, gender, activityLevel, goal, weeklyGoal, dailyCalorieTarget, dailyProteinTarget, dailyCarbsTarget, dailyFatTarget, dailyWaterTarget, dailyFiberTarget, manualMacros, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [profile.id, currentUserId || '', profile.height, profile.heightUnit, profile.weight, profile.weightUnit, profile.targetWeight, profile.age, profile.gender, profile.activityLevel, profile.goal, profile.weeklyGoal, profile.dailyCalorieTarget, profile.dailyProteinTarget, profile.dailyCarbsTarget, profile.dailyFatTarget, profile.dailyWaterTarget, profile.dailyFiberTarget ?? 25, profile.manualMacros ? 1 : 0, profile.updatedAt]
    );
  },
};

export const waterLogsDb = {
  async getAll(): Promise<WaterLog[]> {
    const database = await ensureDatabase();
    return database.getAllAsync<WaterLog>('SELECT * FROM water_logs ORDER BY loggedAt DESC');
  },
  
  async getByDate(startOfDay: number, endOfDay: number): Promise<WaterLog[]> {
    const database = await ensureDatabase();
    return database.getAllAsync<WaterLog>(
      'SELECT * FROM water_logs WHERE loggedAt >= ? AND loggedAt < ? ORDER BY loggedAt DESC',
      [startOfDay, endOfDay]
    );
  },
  
  async create(log: WaterLog): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync(
      'INSERT INTO water_logs (id, amount, unit, loggedAt) VALUES (?, ?, ?, ?)',
      [log.id, log.amount, log.unit, log.loggedAt]
    );
  },
  
  async delete(id: string): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync('DELETE FROM water_logs WHERE id = ?', [id]);
  },
};

export const mealPrepPlansDb = {
  async getAll(): Promise<MealPrepPlan[]> {
    const database = await ensureDatabase();
    const rows = await database.getAllAsync<any>('SELECT * FROM meal_prep_plans ORDER BY weekStartDate, dayOfWeek, mealType');
    return rows.map(row => ({
      ...row,
      isCompleted: Boolean(row.isCompleted),
    }));
  },
  
  async getByWeek(weekStartDate: number): Promise<MealPrepPlan[]> {
    const database = await ensureDatabase();
    const rows = await database.getAllAsync<any>(
      'SELECT * FROM meal_prep_plans WHERE weekStartDate = ? ORDER BY dayOfWeek, mealType',
      [weekStartDate]
    );
    return rows.map(row => ({
      ...row,
      isCompleted: Boolean(row.isCompleted),
    }));
  },
  
  async create(plan: MealPrepPlan): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync(
      'INSERT INTO meal_prep_plans (id, weekStartDate, dayOfWeek, mealType, foodName, calories, protein, carbs, fat, servingSize, notes, isCompleted, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [plan.id, plan.weekStartDate, plan.dayOfWeek, plan.mealType, plan.foodName, plan.calories, plan.protein, plan.carbs, plan.fat, plan.servingSize, plan.notes, plan.isCompleted ? 1 : 0, plan.createdAt]
    );
  },
  
  async update(plan: MealPrepPlan): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync(
      'UPDATE meal_prep_plans SET foodName = ?, calories = ?, protein = ?, carbs = ?, fat = ?, servingSize = ?, notes = ?, isCompleted = ? WHERE id = ?',
      [plan.foodName, plan.calories, plan.protein, plan.carbs, plan.fat, plan.servingSize, plan.notes, plan.isCompleted ? 1 : 0, plan.id]
    );
  },
  
  async delete(id: string): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync('DELETE FROM meal_prep_plans WHERE id = ?', [id]);
  },
  
  async deleteByWeek(weekStartDate: number): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync('DELETE FROM meal_prep_plans WHERE weekStartDate = ?', [weekStartDate]);
  },
};

export const fitnessGoalsDb = {
  async getAll(): Promise<FitnessGoal[]> {
    const database = await ensureDatabase();
    return database.getAllAsync<FitnessGoal>('SELECT * FROM fitness_goals ORDER BY createdAt DESC');
  },
  
  async create(goal: FitnessGoal): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync(
      'INSERT INTO fitness_goals (id, metric, dailyTarget, createdAt) VALUES (?, ?, ?, ?)',
      [goal.id, goal.metric, goal.dailyTarget, goal.createdAt]
    );
  },
  
  async update(goal: FitnessGoal): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync(
      'UPDATE fitness_goals SET metric = ?, dailyTarget = ? WHERE id = ?',
      [goal.metric, goal.dailyTarget, goal.id]
    );
  },
  
  async delete(id: string): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync('DELETE FROM fitness_goals WHERE id = ?', [id]);
  },
};

export const workoutTemplatesDb = {
  async getAll(): Promise<WorkoutTemplate[]> {
    const database = await ensureDatabase();
    return database.getAllAsync<WorkoutTemplate>('SELECT * FROM workout_templates');
  },
  
  async getById(id: string): Promise<WorkoutTemplate | null> {
    const database = await ensureDatabase();
    return database.getFirstAsync<WorkoutTemplate>('SELECT * FROM workout_templates WHERE id = ?', [id]);
  },
  
  async create(template: WorkoutTemplate): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync(
      'INSERT INTO workout_templates (id, title, category, durationMinutes, intensity, equipment, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [template.id, template.title, template.category, template.durationMinutes, template.intensity, template.equipment, template.description]
    );
  },
  
  async delete(id: string): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync('DELETE FROM workout_templates WHERE id = ?', [id]);
  },
};

export const workoutSessionsDb = {
  async getAll(): Promise<WorkoutSession[]> {
    const database = await ensureDatabase();
    const rows = await database.getAllAsync<any>('SELECT * FROM workout_sessions ORDER BY startedAt DESC');
    return rows.map(row => ({
      ...row,
      completed: Boolean(row.completed),
    }));
  },
  
  async getById(id: string): Promise<WorkoutSession | null> {
    const database = await ensureDatabase();
    const row = await database.getFirstAsync<any>('SELECT * FROM workout_sessions WHERE id = ?', [id]);
    if (!row) return null;
    return {
      ...row,
      completed: Boolean(row.completed),
    };
  },
  
  async create(session: WorkoutSession): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync(
      'INSERT INTO workout_sessions (id, templateId, startedAt, endedAt, durationMinutes, completed, caloriesEstimate, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [session.id, session.templateId, session.startedAt, session.endedAt, session.durationMinutes, session.completed ? 1 : 0, session.caloriesEstimate, session.source]
    );
  },
  
  async update(session: WorkoutSession): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync(
      'UPDATE workout_sessions SET endedAt = ?, durationMinutes = ?, completed = ?, caloriesEstimate = ? WHERE id = ?',
      [session.endedAt, session.durationMinutes, session.completed ? 1 : 0, session.caloriesEstimate, session.id]
    );
  },
  
  async delete(id: string): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync('DELETE FROM workout_sessions WHERE id = ?', [id]);
  },
};

export const normalizedMetricsDb = {
  async getAll(): Promise<NormalizedMetric[]> {
    const database = await ensureDatabase();
    return database.getAllAsync<NormalizedMetric>('SELECT * FROM normalized_metrics ORDER BY date DESC');
  },
  
  async getByDate(date: string): Promise<NormalizedMetric | null> {
    const database = await ensureDatabase();
    return database.getFirstAsync<NormalizedMetric>('SELECT * FROM normalized_metrics WHERE date = ?', [date]);
  },
  
  async create(metric: NormalizedMetric): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync(
      'INSERT INTO normalized_metrics (id, date, activeMinutes, caloriesActive, steps, source, deviceType) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [metric.id, metric.date, metric.activeMinutes, metric.caloriesActive, metric.steps, metric.source, metric.deviceType]
    );
  },
  
  async update(metric: NormalizedMetric): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync(
      'UPDATE normalized_metrics SET activeMinutes = ?, caloriesActive = ?, steps = ? WHERE date = ?',
      [metric.activeMinutes, metric.caloriesActive, metric.steps, metric.date]
    );
  },
  
  async upsert(metric: NormalizedMetric): Promise<void> {
    const database = await ensureDatabase();
    const existing = await this.getByDate(metric.date);
    if (existing) {
      await database.runAsync(
        'UPDATE normalized_metrics SET activeMinutes = activeMinutes + ?, caloriesActive = caloriesActive + ?, steps = steps + ? WHERE date = ?',
        [metric.activeMinutes, metric.caloriesActive, metric.steps, metric.date]
      );
    } else {
      await this.create(metric);
    }
  },
};

export const fitnessPlansDb = {
  async getAll(): Promise<FitnessPlan[]> {
    const database = await ensureDatabase();
    const rows = await database.getAllAsync<any>('SELECT * FROM fitness_plans ORDER BY createdAt DESC');
    return rows.map(row => ({
      ...row,
      preferredCategories: JSON.parse(row.preferredCategories),
      active: Boolean(row.active),
    }));
  },
  
  async getActive(): Promise<FitnessPlan | null> {
    const database = await ensureDatabase();
    const row = await database.getFirstAsync<any>('SELECT * FROM fitness_plans WHERE active = 1 LIMIT 1');
    if (!row) return null;
    return {
      ...row,
      preferredCategories: JSON.parse(row.preferredCategories),
      active: Boolean(row.active),
    };
  },
  
  async create(plan: FitnessPlan): Promise<void> {
    const database = await ensureDatabase();
    if (plan.active) {
      await database.runAsync('UPDATE fitness_plans SET active = 0');
    }
    await database.runAsync(
      'INSERT INTO fitness_plans (id, name, daysPerWeek, preferredCategories, durationRangeMin, durationRangeMax, intensity, equipment, active, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [plan.id, plan.name, plan.daysPerWeek, JSON.stringify(plan.preferredCategories), plan.durationRangeMin, plan.durationRangeMax, plan.intensity, plan.equipment, plan.active ? 1 : 0, plan.createdAt]
    );
  },
  
  async update(plan: FitnessPlan): Promise<void> {
    const database = await ensureDatabase();
    if (plan.active) {
      await database.runAsync('UPDATE fitness_plans SET active = 0 WHERE id != ?', [plan.id]);
    }
    await database.runAsync(
      'UPDATE fitness_plans SET name = ?, daysPerWeek = ?, preferredCategories = ?, durationRangeMin = ?, durationRangeMax = ?, intensity = ?, equipment = ?, active = ? WHERE id = ?',
      [plan.name, plan.daysPerWeek, JSON.stringify(plan.preferredCategories), plan.durationRangeMin, plan.durationRangeMax, plan.intensity, plan.equipment, plan.active ? 1 : 0, plan.id]
    );
  },
  
  async delete(id: string): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync('DELETE FROM fitness_plans WHERE id = ?', [id]);
  },
};

export const awardsDb = {
  async getAll(): Promise<Award[]> {
    const database = await ensureDatabase();
    return database.getAllAsync<Award>('SELECT * FROM awards ORDER BY earnedAt DESC');
  },
  
  async getEarned(): Promise<Award[]> {
    const database = await ensureDatabase();
    return database.getAllAsync<Award>('SELECT * FROM awards WHERE earnedAt IS NOT NULL ORDER BY earnedAt DESC');
  },
  
  async create(award: Award): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync(
      'INSERT OR IGNORE INTO awards (id, code, title, description, earnedAt) VALUES (?, ?, ?, ?, ?)',
      [award.id, award.code, award.title, award.description, award.earnedAt]
    );
  },
  
  async markEarned(code: string): Promise<void> {
    const database = await ensureDatabase();
    await database.runAsync(
      'UPDATE awards SET earnedAt = ? WHERE code = ? AND earnedAt IS NULL',
      [Date.now(), code]
    );
  },
};
