export class CreateActivityDto {
  type?: string;
  title!: string;
  description?: string;
  relatedTo?: string;
  relatedId?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  assignedTo?: string;
}
