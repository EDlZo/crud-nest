export class CreateDealDto {
  title!: string;
  stage?: string;
  amount?: number;
  probability?: number;
  expectedClose?: string;
  assignedTo?: string;
}
