import { Injectable } from '@angular/core';
import { MOCK_USERS } from '../data/mock-users.data';
import type { User, UserInput } from '../models/user.model';

const LATENCY_MS = 300;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clone(user: User): User {
  return { ...user, lastLogin: user.lastLogin, createdAt: user.createdAt };
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly storageKey = 'wtt-dekra:users';
  private readonly store: User[] = this.hydrate();
  private nextId = this.store.reduce((max, user) => Math.max(max, user.id), 0) + 1;

  private hydrate(): User[] {
    if (typeof localStorage === 'undefined') {
      return MOCK_USERS.map(clone);
    }
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return MOCK_USERS.map(clone);
      }
      const parsed = JSON.parse(raw) as Array<Omit<User, 'lastLogin' | 'createdAt'> & { lastLogin: string | null; createdAt: string }>;
      return parsed.map((u) => ({
        ...u,
        lastLogin: u.lastLogin ? new Date(u.lastLogin) : null,
        createdAt: new Date(u.createdAt),
      })) as User[];
    } catch {
      return MOCK_USERS.map(clone);
    }
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.store));
    } catch {
      // storage full or unavailable — keep in-memory only
    }
  }

  reset(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
    this.store.splice(0, this.store.length, ...MOCK_USERS.map(clone));
    this.nextId = this.store.reduce((max, user) => Math.max(max, user.id), 0) + 1;
  }

  async list(): Promise<User[]> {
    await delay(LATENCY_MS);
    return this.store.map(clone);
  }

  async find(id: number): Promise<User | undefined> {
    await delay(LATENCY_MS);
    const user = this.store.find((item) => item.id === id);
    return user ? clone(user) : undefined;
  }

  async create(input: UserInput): Promise<User> {
    await delay(LATENCY_MS);
    const user: User = {
      ...input,
      id: this.nextId++,
      password: input.password ?? '',
      lastLogin: null,
      createdAt: new Date(),
    };
    this.store.push(user);
    this.persist();
    return clone(user);
  }

  async update(id: number, input: UserInput): Promise<User> {
    await delay(LATENCY_MS);
    const user = this.store.find((item) => item.id === id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    Object.assign(user, input, {
      password: input.password ? input.password : user.password,
    });
    this.persist();
    return clone(user);
  }

  async delete(id: number): Promise<void> {
    await delay(LATENCY_MS);
    const index = this.store.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.store.splice(index, 1);
      this.persist();
    }
  }
}
