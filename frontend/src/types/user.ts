export interface User {
  _id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  streamKey: string;
  isLive: boolean;
  followers: string[]; // hoặc User[] nếu populate
  following: string[];
  totalViews: number;
  createdAt?: string;
  updatedAt?: string;
}
