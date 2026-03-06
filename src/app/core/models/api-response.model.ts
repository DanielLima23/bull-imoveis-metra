export interface ApiError {
  code: string;
  message: string;
  detail?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  errors: ApiError[];
  requestId: string;
}
