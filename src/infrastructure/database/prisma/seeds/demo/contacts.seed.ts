import { PrismaClient } from '@infrastructure/database/generated/prisma';

export interface ContactRecord {
  id: string;
  name: string;
  identification: string;
  type: string;
}

// Customer contacts - these map 1:1 to the CUSTOMERS array in sales.seed.ts
const CUSTOMER_CONTACTS = [
  { name: 'Grupo Empresarial ABC', nit: '900123456-1' },
  { name: 'Universidad Nacional de Colombia', nit: '899999063-3' },
  { name: 'Cl\u00ednica Medell\u00edn SAS', nit: '890901826-7' },
  { name: 'Startup TechNova', nit: '901234567-2' },
  { name: 'Papeler\u00eda El Punto', nit: '800345678-3' },
  { name: 'Constructora Bol\u00edvar', nit: '860002964-4' },
  { name: 'Colegio San Jos\u00e9', nit: '890905211-5' },
  { name: 'Oficina de Abogados Restrepo & Asociados', nit: '900567890-6' },
  { name: 'Caf\u00e9 Digital Cali', nit: '901678901-7' },
  { name: 'Importadora del Sur', nit: '800789012-8' },
  { name: 'Banco de Occidente - Sede Norte', nit: '890300279-9' },
  { name: 'Almacenes \u00c9xito S.A.', nit: '890900608-0' },
  { name: 'Fundaci\u00f3n Cardioinfantil', nit: '860024026-1' },
  { name: 'Hotel Dann Carlton Bogot\u00e1', nit: '860051954-2' },
  { name: 'Ministerio de Educaci\u00f3n Nacional', nit: '899999001-3' },
  { name: 'Empresa de Energ\u00eda de Bogot\u00e1', nit: '899999062-4' },
  { name: 'Coworking WeWork Bogot\u00e1', nit: '901345678-5' },
  { name: 'Agencia de Publicidad Sancho BBDO', nit: '860035827-6' },
  { name: 'Deloitte Colombia', nit: '860005224-7' },
  { name: 'EPM Medell\u00edn', nit: '890904996-8' },
  { name: 'Comfama', nit: '890900842-9' },
  { name: 'Nutresa S.A.', nit: '890900160-0' },
  { name: 'Grupo Argos', nit: '890100251-1' },
  { name: 'Ecopetrol S.A.', nit: '899999068-2' },
  { name: 'Davivienda - Oficina Principal', nit: '860034313-3' },
  { name: 'ISA Intercolombia', nit: '860016610-4' },
  { name: 'Celsia Energ\u00eda', nit: '890304497-5' },
  { name: 'Carvajal Tecnolog\u00eda y Servicios', nit: '890300406-6' },
  { name: 'Universidad de los Andes', nit: '860007386-7' },
  { name: 'Pontificia Universidad Javeriana', nit: '860013720-8' },
  { name: 'Cl\u00ednica del Country', nit: '860037950-9' },
  { name: 'Hospital Universitario San Ignacio', nit: '860012336-0' },
  { name: 'Fenalco Bogot\u00e1', nit: '860007538-1' },
  { name: 'C\u00e1mara de Comercio de Cali', nit: '890399011-2' },
  { name: 'Compensar', nit: '860066942-3' },
  { name: 'Colsubsidio', nit: '860007336-4' },
  { name: 'Empresa de Acueducto de Bogot\u00e1', nit: '899999094-5' },
  { name: 'Terminal de Transporte Bogot\u00e1', nit: '860058760-6' },
  { name: 'Avianca - Centro Administrativo', nit: '899999143-7' },
  { name: 'Rappi Colombia', nit: '901116109-8' },
  { name: 'MercadoLibre Colombia', nit: '900367610-9' },
  { name: 'Freelancer - Andr\u00e9s Moreno', nit: '1098765432' },
  { name: 'Freelancer - Diana Mu\u00f1oz', nit: '1087654321' },
  { name: 'Freelancer - Santiago R\u00edos', nit: '1076543210' },
  { name: 'Estudio Fotogr\u00e1fico Click', nit: '900456789-0' },
  { name: 'Peluquer\u00eda Arte & Estilo', nit: '900567891-1' },
  { name: 'Restaurante La Le\u00f1a', nit: '900678912-2' },
  { name: 'Farmacia Dromayor', nit: '890903777-3' },
  { name: 'Gimnasio Iron Fit', nit: '901789012-4' },
  { name: 'Consultorio Odontol\u00f3gico Sonr\u00eda', nit: '901890123-5' },
];

// Supplier contacts
const SUPPLIER_CONTACTS = [
  { name: 'Dell Technologies Colombia', nit: '900111222-1' },
  { name: 'HP Inc. Colombia', nit: '900222333-2' },
  { name: 'Lenovo Colombia', nit: '900333444-3' },
  { name: 'Samsung Electronics Colombia', nit: '900444555-4' },
  { name: 'LG Electronics Colombia', nit: '900555666-5' },
  { name: 'Epson Colombia', nit: '900666777-6' },
  { name: 'Logitech Distribuidor', nit: '900777888-7' },
  { name: 'TP-Link Colombia', nit: '900888999-8' },
  { name: 'Ubiquiti Networks Dist.', nit: '900999111-9' },
  { name: 'Kingston Technology', nit: '901111222-0' },
  { name: 'Western Digital Colombia', nit: '901222333-1' },
  { name: 'Papeles Nacionales S.A.', nit: '890801451-2' },
  { name: 'Distribuidora de Cables y Accesorios', nit: '901333444-3' },
  { name: 'Microsoft Colombia', nit: '900100200-4' },
  { name: 'Adobe Systems Dist. Col.', nit: '900200300-5' },
];

export class DemoContactsSeed {
  constructor(private prisma: PrismaClient) {}

  async seed(orgId: string): Promise<ContactRecord[]> {
    const records: ContactRecord[] = [];

    // Seed customer contacts
    for (const customer of CUSTOMER_CONTACTS) {
      const contact = await this.prisma.contact.upsert({
        where: { identification_orgId: { identification: customer.nit, orgId } },
        update: {},
        create: {
          name: customer.name,
          identification: customer.nit,
          type: 'CUSTOMER',
          isActive: true,
          orgId,
        },
      });
      records.push({
        id: contact.id,
        name: contact.name,
        identification: contact.identification,
        type: contact.type,
      });
    }

    // Seed supplier contacts
    for (const supplier of SUPPLIER_CONTACTS) {
      const contact = await this.prisma.contact.upsert({
        where: { identification_orgId: { identification: supplier.nit, orgId } },
        update: {},
        create: {
          name: supplier.name,
          identification: supplier.nit,
          type: 'SUPPLIER',
          isActive: true,
          orgId,
        },
      });
      records.push({
        id: contact.id,
        name: contact.name,
        identification: contact.identification,
        type: contact.type,
      });
    }

    return records;
  }
}
