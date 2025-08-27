import { Entity } from '@shared/domain/base/entity.base';

export interface CategoryProps {
  name: string;
  parentId?: string;
  description?: string;
}

export class Category extends Entity<CategoryProps> {
  private constructor(props: CategoryProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: CategoryProps, orgId: string): Category {
    return new Category(props, undefined, orgId);
  }

  public static reconstitute(props: CategoryProps, id: string, orgId: string): Category {
    return new Category(props, id, orgId);
  }

  public update(props: Partial<CategoryProps>): void {
    if (props.name !== undefined) this.props.name = props.name;
    if (props.parentId !== undefined) this.props.parentId = props.parentId;
    if (props.description !== undefined) this.props.description = props.description;

    this.updateTimestamp();
  }

  public isRoot(): boolean {
    return !this.props.parentId;
  }

  public isChild(): boolean {
    return !!this.props.parentId;
  }

  // Getters
  get name(): string {
    return this.props.name;
  }

  get parentId(): string | undefined {
    return this.props.parentId;
  }

  get description(): string | undefined {
    return this.props.description;
  }
}
