export interface User {
  id: number;
  username: string;
  name: string;
  surnames: string;
  email: string;
  password: string;
  age: number;
  active: boolean;
  lastLogin: Date | null;
  createdAt: Date;
}

export interface UserInput {
  username: string;
  name: string;
  surnames: string;
  email: string;
  password: string;
  age: number;
  active: boolean;
}
