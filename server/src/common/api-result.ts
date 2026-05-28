export class ApiResult<T = any> {
  code: number;
  message: string;
  data: T;

  static success<T>(data: T, message = '操作成功'): ApiResult<T> {
    return { code: 200, message, data };
  }

  static fail(message = '操作失败', code = 400): ApiResult<null> {
    return { code, message, data: null };
  }
}
