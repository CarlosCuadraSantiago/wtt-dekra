import { TestBed } from '@angular/core/testing';
import type { UserInput } from '../models/user.model';
import { UsersService } from './users.service';

const BASE_INPUT: UserInput = {
  username: 'test.user',
  name: 'Test',
  surnames: 'User Sample',
  email: 'test.user@example.com',
  password: 'P@ssw0rd9',
  age: 30,
  active: true,
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(UsersService);
  });

  afterEach(() => {
    service.reset();
    localStorage.clear();
  });

  it('should list seeded users', async () => {
    const users = await service.list();
    expect(users.length).toBeGreaterThan(0);
  });

  it('should create and retrieve a user', async () => {
    const created = await service.create(BASE_INPUT);
    expect(created.id).toBeDefined();
    expect(created.lastLogin).toBeNull();

    const found = await service.find(created.id);
    expect(found?.username).toBe('test.user');
  });

  it('should update a user', async () => {
    const created = await service.create(BASE_INPUT);
    const updated = await service.update(created.id, { ...BASE_INPUT, name: 'Renamed' });
    expect(updated.name).toBe('Renamed');

    const found = await service.find(created.id);
    expect(found?.name).toBe('Renamed');
  });

  it('should delete a user', async () => {
    const created = await service.create(BASE_INPUT);
    await service.delete(created.id);
    const found = await service.find(created.id);
    expect(found).toBeUndefined();
  });

  it('should persist to localStorage and hydrate', async () => {
    const created = await service.create(BASE_INPUT);
    const raw = localStorage.getItem('wtt-dekra:users');
    expect(raw).toContain('test.user');

    // la nueva instancia debe hidratarse desde el almacenamiento
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const second = TestBed.inject(UsersService);
    const found = await second.find(created.id);
    expect(found?.username).toBe('test.user');
  });

  it('should reset to mock data', async () => {
    await service.create(BASE_INPUT);
    expect((await service.list()).length).toBeGreaterThan(22);
    service.reset();
    expect((await service.list()).length).toBe(22);
    expect(localStorage.getItem('wtt-dekra:users')).toBeNull();
  });
});
