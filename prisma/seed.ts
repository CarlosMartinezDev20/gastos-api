import { PrismaClient, TransactionType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SAVINGS_CATEGORY_NAME = 'Ahorro';

const DEFAULT_CATEGORIES = [
  { name: 'Comida', icon: 'lunch_dining', type: TransactionType.EXPENSE },
  { name: 'Transporte', icon: 'directions_bus', type: TransactionType.EXPENSE },
  { name: 'Fotocopias', icon: 'print', type: TransactionType.EXPENSE },
  { name: 'Salidas', icon: 'celebration', type: TransactionType.EXPENSE },
  { name: 'Residencia', icon: 'home', type: TransactionType.EXPENSE },
  { name: 'Salud', icon: 'medical_services', type: TransactionType.EXPENSE },
  { name: 'Ropa', icon: 'checkroom', type: TransactionType.EXPENSE },
  { name: 'Mesada', icon: 'savings', type: TransactionType.INCOME },
  { name: 'Trabajo', icon: 'work', type: TransactionType.INCOME },
  // Reserved for goal contributions (see SAVINGS_CATEGORY_NAME in the API).
  {
    name: SAVINGS_CATEGORY_NAME,
    icon: 'account_balance_wallet',
    type: TransactionType.EXPENSE,
  },
];

type SeedTransaction = {
  title: string;
  amount: number;
  category: string;
  /** Days before today. */
  daysAgo: number;
};

type SeedGoal = {
  name: string;
  targetAmount: number;
  icon: string;
  /** Amount and days-ago of each contribution. */
  contributions: [number, number][];
};

type SeedUser = {
  name: string;
  email: string;
  password: string;
  darkMode?: boolean;
  transactions: SeedTransaction[];
  goals: SeedGoal[];
};

const USERS: SeedUser[] = [
  {
    name: 'Daniela',
    email: 'daniela@universidad.edu',
    password: 'daniela123',
    transactions: [
      { title: 'Mesada', amount: 300, category: 'Mesada', daysAgo: 40 },
      {
        title: 'Almuerzo facultad',
        amount: 6.5,
        category: 'Comida',
        daysAgo: 38,
      },
      { title: 'Bus semanal', amount: 12, category: 'Transporte', daysAgo: 35 },
      {
        title: 'Libro de cálculo',
        amount: 18,
        category: 'Fotocopias',
        daysAgo: 30,
      },
      { title: 'Mesada', amount: 300, category: 'Mesada', daysAgo: 10 },
      {
        title: 'Tutorías fin de semana',
        amount: 45,
        category: 'Trabajo',
        daysAgo: 8,
      },
      {
        title: 'Almuerzo facultad',
        amount: 8.5,
        category: 'Comida',
        daysAgo: 7,
      },
      { title: 'Bus semanal', amount: 12, category: 'Transporte', daysAgo: 6 },
      {
        title: 'Fotocopias parcial',
        amount: 15.24,
        category: 'Fotocopias',
        daysAgo: 5,
      },
      { title: 'Café con amigas', amount: 5, category: 'Salidas', daysAgo: 3 },
      { title: 'Farmacia', amount: 9.8, category: 'Salud', daysAgo: 2 },
      {
        title: 'Uber nocturno',
        amount: 20,
        category: 'Transporte',
        daysAgo: 1,
      },
    ],
    goals: [
      {
        name: 'Nueva laptop',
        targetAmount: 800,
        icon: 'laptop_mac',
        contributions: [
          [70, 36],
          [50, 9],
        ],
      },
      {
        name: 'Viaje de fin de ciclo',
        targetAmount: 350,
        icon: 'flight',
        contributions: [[85, 9]],
      },
      {
        name: 'Fondo de emergencia',
        targetAmount: 100,
        icon: 'volunteer_activism',
        contributions: [
          [60, 30],
          [40, 4],
        ],
      },
    ],
  },
  {
    name: 'Carlos Martínez',
    email: 'carlos@universidad.edu',
    password: 'carlos123',
    darkMode: true,
    transactions: [
      { title: 'Pago práctica', amount: 420, category: 'Trabajo', daysAgo: 20 },
      {
        title: 'Alquiler residencia',
        amount: 180,
        category: 'Residencia',
        daysAgo: 19,
      },
      { title: 'Supermercado', amount: 42.3, category: 'Comida', daysAgo: 12 },
      { title: 'Zapatillas', amount: 55, category: 'Ropa', daysAgo: 9 },
      { title: 'Cine', amount: 8, category: 'Salidas', daysAgo: 4 },
      {
        title: 'Recarga transporte',
        amount: 15,
        category: 'Transporte',
        daysAgo: 2,
      },
    ],
    goals: [
      {
        name: 'Consola',
        targetAmount: 500,
        icon: 'sports_esports',
        contributions: [[40, 15]],
      },
    ],
  },
  {
    // Empty account to try the first-use experience.
    name: 'Usuario Nuevo',
    email: 'nuevo@universidad.edu',
    password: 'nuevo123',
    transactions: [],
    goals: [],
  },
];

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(12, 0, 0, 0);
  return date;
}

async function seedCategories() {
  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { name: cat.name, isDefault: true, userId: null },
    });
    if (!existing) {
      await prisma.category.create({ data: { ...cat, isDefault: true } });
    }
  }
  const categories = await prisma.category.findMany({
    where: { isDefault: true, userId: null },
  });
  return new Map(categories.map((c) => [c.name, c]));
}

async function seedUser(
  seed: SeedUser,
  categories: Awaited<ReturnType<typeof seedCategories>>,
) {
  const user = await prisma.user.upsert({
    where: { email: seed.email },
    update: {},
    create: {
      name: seed.name,
      email: seed.email,
      password: await bcrypt.hash(seed.password, 10),
      darkMode: seed.darkMode ?? false,
    },
  });

  // Only fill accounts that have no data yet, so re-running keeps your changes.
  const [txCount, goalCount] = await Promise.all([
    prisma.transaction.count({ where: { userId: user.id } }),
    prisma.savingsGoal.count({ where: { userId: user.id } }),
  ]);
  if (txCount > 0 || goalCount > 0) return 'existente';

  for (const tx of seed.transactions) {
    const category = categories.get(tx.category)!;
    await prisma.transaction.create({
      data: {
        userId: user.id,
        categoryId: category.id,
        title: tx.title,
        amount: tx.amount,
        type: category.type,
        date: daysAgo(tx.daysAgo),
      },
    });
  }

  const savings = categories.get(SAVINGS_CATEGORY_NAME)!;
  for (const goal of seed.goals) {
    const savedAmount = goal.contributions.reduce((sum, [a]) => sum + a, 0);
    await prisma.savingsGoal.create({
      data: {
        userId: user.id,
        name: goal.name,
        targetAmount: goal.targetAmount,
        savedAmount,
        icon: goal.icon,
        bgColor: 'bg-rose-500/10',
        iconColor: 'text-rose-500',
        // Each contribution is an expense linked to the goal, like add-funds does.
        contributions: {
          create: goal.contributions.map(([amount, days]) => ({
            userId: user.id,
            categoryId: savings.id,
            title: `Ahorro: ${goal.name}`,
            amount,
            type: TransactionType.EXPENSE,
            date: daysAgo(days),
          })),
        },
      },
    });
  }
  return 'creado';
}

async function main() {
  console.log('🌱 Iniciando seed...');
  const categories = await seedCategories();
  for (const user of USERS) {
    const result = await seedUser(user, categories);
    console.log(`   ${user.email} / ${user.password} (${result})`);
  }
  console.log('✅ Seed completado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
