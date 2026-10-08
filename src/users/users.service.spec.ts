import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

async function setup() {
  const hash = await bcrypt.hash('actual123', 4);
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue({ password: hash }),
      // What Prisma returns after the increment.
      update: jest.fn(() => ({ id: 'u1', email: 'a@b.c', tokenVersion: 3 })),
      delete: jest.fn(),
    },
    transaction: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const auth = { signToken: jest.fn(() => 'nuevo-token') };
  const service = new UsersService(
    prisma as unknown as PrismaService,
    auth as unknown as AuthService,
  );
  return { prisma, auth, service };
}

describe('UsersService', () => {
  it('changes the password, signs out other devices and returns a token', async () => {
    const { prisma, auth, service } = await setup();
    const result = await service.changePassword('u1', {
      currentPassword: 'actual123',
      newPassword: 'nueva4567',
    });
    expect(result).toEqual({ accessToken: 'nuevo-token' });
    const { data } = (prisma.user.update.mock.calls[0] as unknown[])[0] as {
      data: { password: string; tokenVersion: object };
    };
    expect(data.tokenVersion).toEqual({ increment: 1 });
    expect(await bcrypt.compare('nueva4567', data.password)).toBe(true);
    expect(auth.signToken).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'u1', tokenVersion: 3 }),
    );
  });

  it('refuses a wrong current password with 400, not 401', async () => {
    const { prisma, service } = await setup();
    await expect(
      service.changePassword('u1', {
        currentPassword: 'otra',
        newPassword: 'nueva4567',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('refuses a new password equal to the current one', async () => {
    const { service } = await setup();
    await expect(
      service.changePassword('u1', {
        currentPassword: 'actual123',
        newPassword: 'actual123',
      }),
    ).rejects.toThrow('distinta');
  });

  it('deletes the account only with the right password', async () => {
    const { prisma, service } = await setup();
    await expect(service.deleteAccount('u1', 'mala')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();

    await service.deleteAccount('u1', 'actual123');
    expect(prisma.transaction.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
    });
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
