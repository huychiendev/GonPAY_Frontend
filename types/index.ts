interface PaginationResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface User {
  id: number;
  username: string;
  email: string;
  phone_number: string;
  role: 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'INACTIVE';
  preferences?: {
    language: string;
    notification_enabled: boolean;
  };
  created_at?: string;
  updated_at?: string;
} 