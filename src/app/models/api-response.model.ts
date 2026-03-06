export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  voucher_code?: string;
}
