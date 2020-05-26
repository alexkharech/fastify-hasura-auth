export interface IStatus {
  status: boolean;
}

export interface IError {
  message: string;
}

export interface IUserToken {
  id: string;
  active: boolean;
  roles: string[];
  token?: string;
  email?: string;
  username?: string;
}
