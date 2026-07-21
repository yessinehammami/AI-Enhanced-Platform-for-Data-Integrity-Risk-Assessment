// src/types.ts
export interface Site {
  id: number;
  name: string;
  activity_type?: string;
  address?: string;
}

export interface Sys {
  id: number;
  name: string;
  category?: number;
  description?: string;
  critical?: boolean;
  local?: boolean;
  sys_user?: string;
}
