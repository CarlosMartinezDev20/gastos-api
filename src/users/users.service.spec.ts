import { BadRequestException } from '@nestjs/common';
import { AccentColor, ThemeMode } from '@prisma/client';
import { SupabaseAuthClient } from '../auth/supabase-auth.client';
import { PrismaService } from '../prisma/prisma.service';
import { appearance, UsersService } from './users.service';

function setup() {
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: 'u1', email: 'a@b.c' }),
      delete: jest.fn(),
    },
    transaction: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const auth = {
    checkPassword: jest.fn((_email: string, password: string) =>
      Promise.resolve(password === 'actual123'),
    ),
    deleteUser: jest.fn(),
  };
  const service = new UsersService(
    prisma as unknown as PrismaService,
    auth as unknown as SupabaseAuthClient,
  );
  return { prisma, auth, service };
}

describe('UsersService', () => {
  it('refuses a wrong password with 400, not 401, and keeps the data', async () => {
    const { prisma, auth, service } = setup();
    await expect(service.deleteAccount('u1', 'mala')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(auth.checkPassword).toHaveBeenCalledWith('a@b.c', 'mala');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(auth.deleteUser).not.toHaveBeenCalled();
  });

  it('deletes the data, then the Supabase account', async () => {
    const { prisma, auth, service } = setup();
    await service.deleteAccount('u1', 'actual123');
    expect(prisma.transaction.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
    });
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(auth.deleteUser).toHaveBeenCalledWith('u1');
    expect(prisma.$transaction.mock.invocationCallOrder[0]).toBeLessThan(
      auth.deleteUser.mock.invocationCallOrder[0],
    );
  });
});

describe('appearance', () => {
  it('mirrors themeMode into darkMode for older app versions', () => {
    expect(appearance({ themeMode: ThemeMode.DARK })).toEqual({
      themeMode: ThemeMode.DARK,
      darkMode: true,
    });
    expect(appearance({ themeMode: ThemeMode.SYSTEM })).toEqual({
      themeMode: ThemeMode.SYSTEM,
      darkMode: false,
    });
  });

  it("turns an older version's darkMode into themeMode", () => {
    expect(appearance({ darkMode: true })).toEqual({
      darkMode: true,
      themeMode: ThemeMode.DARK,
    });
    expect(appearance({ darkMode: false })).toEqual({
      darkMode: false,
      themeMode: ThemeMode.LIGHT,
    });
  });

  it('lets themeMode win when both come, and passes the accent through', () => {
    expect(
      appearance({
        darkMode: true,
        themeMode: ThemeMode.LIGHT,
        accent: AccentColor.VIOLET,
      }),
    ).toEqual({
      darkMode: false,
      themeMode: ThemeMode.LIGHT,
      accent: AccentColor.VIOLET,
    });
    expect(appearance({ name: 'Ana' })).toEqual({ name: 'Ana' });
  });
});
