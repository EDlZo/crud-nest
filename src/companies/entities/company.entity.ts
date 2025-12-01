export class Company {
  id?: string;
  ownerUserId: string;
  ownerEmail?: string;
  name: string;
  address?: string;
  phone?: string;
  fax?: string;
  taxId?: string;
  branchName?: string;
  branchNumber?: string;
  socials?: Record<string, string>;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  updatedByEmail?: string;
}
