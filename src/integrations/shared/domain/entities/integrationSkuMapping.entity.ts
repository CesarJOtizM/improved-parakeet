import { Entity } from '@shared/domain/base/entity.base';

export interface IIntegrationSkuMappingProps {
  connectionId: string;
  externalSku: string;
  productId: string;
  productName?: string;
  productSku?: string;
}

export class IntegrationSkuMapping extends Entity<IIntegrationSkuMappingProps> {
  private constructor(props: IIntegrationSkuMappingProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: IIntegrationSkuMappingProps, orgId: string): IntegrationSkuMapping {
    return new IntegrationSkuMapping(props, undefined, orgId);
  }

  public static reconstitute(
    props: IIntegrationSkuMappingProps,
    id: string,
    orgId: string
  ): IntegrationSkuMapping {
    return new IntegrationSkuMapping(props, id, orgId);
  }

  get connectionId(): string {
    return this.props.connectionId;
  }
  get externalSku(): string {
    return this.props.externalSku;
  }
  get productId(): string {
    return this.props.productId;
  }
  get productName(): string | undefined {
    return this.props.productName;
  }
  get productSku(): string | undefined {
    return this.props.productSku;
  }
}
