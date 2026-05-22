import { PrismaClient, TransactionType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

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
  { name: 'Ahorro', icon: 'account_balance_wallet', type: TransactionType.EXPENSE },
];

async function main() {
  console.log('🌱 Iniciando seed...');

  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { name: cat.name, isDefault: true, userId: null },
    });
    if (!existing) {
      await prisma.category.create({
        data: { ...cat, isDefault: true },
      });
    }
  }

  const hashedPassword = await bcrypt.hash('daniela123', 10);

  const daniela = await prisma.user.upsert({
    where: { email: 'daniela@universidad.edu' },
    update: {},
    create: {
      name: 'Daniela',
      email: 'daniela@universidad.edu',
      password: hashedPassword,
      darkMode: false,
      avatarUrl: null,
    },
  });

  const categories = await prisma.category.findMany({
    where: { OR: [{ isDefault: true }, { userId: daniela.id }] },
  });

  const byName = (name: string) => categories.find((c) => c.name === name)!;

  const existingTx = await prisma.transaction.count({
    where: { userId: daniela.id },
  });

  if (existingTx === 0) {
    const now = new Date();
    const transactions = [
      {
        title: 'Mesada Marzo',
        amount: 150,
        type: TransactionType.INCOME,
        categoryId: byName('Mesada').id,
        date: new Date(now.getFullYear(), now.getMonth(), 1),
      },
      {
        title: 'Almuerzo Facultad',
        amount: 8.5,
        type: TransactionType.EXPENSE,
        categoryId: byName('Comida').id,
        date: new Date(now.getFullYear(), now.getMonth(), 5),
      },
      {
        title: 'Bus semanal',
        amount: 12,
        type: TransactionType.EXPENSE,
        categoryId: byName('Transporte').id,
        date: new Date(now.getFullYear(), now.getMonth(), 7),
      },
      {
        title: 'Fotocopias Parcial',
        amount: 15.24,
        type: TransactionType.EXPENSE,
        categoryId: byName('Fotocopias').id,
        date: new Date(now.getFullYear(), now.getMonth(), 10),
      },
      {
        title: 'Tutorías fin de semana',
        amount: 45,
        type: TransactionType.INCOME,
        categoryId: byName('Trabajo').id,
        date: new Date(now.getFullYear(), now.getMonth(), 12),
      },
      {
        title: 'Café con amigas',
        amount: 5,
        type: TransactionType.EXPENSE,
        categoryId: byName('Salidas').id,
        date: new Date(now.getFullYear(), now.getMonth(), 14),
      },
      {
        title: 'Uber nocturno',
        amount: 20,
        type: TransactionType.EXPENSE,
        categoryId: byName('Transporte').id,
        date: new Date(now.getFullYear(), now.getMonth(), 15),
      },
    ];

    for (const tx of transactions) {
      await prisma.transaction.create({
        data: { ...tx, userId: daniela.id },
      });
    }
  }

  const existingGoals = await prisma.savingsGoal.count({
    where: { userId: daniela.id },
  });

  if (existingGoals === 0) {
    await prisma.savingsGoal.createMany({
      data: [
        {
          userId: daniela.id,
          name: 'Nueva Laptop',
          targetAmount: 800,
          savedAmount: 120,
          icon: 'laptop_mac',
          bgColor: 'bg-rose-500/10',
          iconColor: 'text-rose-500',
        },
        {
          userId: daniela.id,
          name: 'Viaje de Fin de Ciclo',
          targetAmount: 350,
          savedAmount: 85,
          icon: 'flight',
          bgColor: 'bg-sky-500/10',
          iconColor: 'text-sky-500',
        },
      ],
    });
  }

  console.log('✅ Seed completado.');
  console.log('   Usuario: daniela@universidad.edu / daniela123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
