import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const OrgId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();

  // Intentar obtener orgId del header
  const orgIdFromHeader = request.headers['x-organization-id'];
  if (orgIdFromHeader) {
    return orgIdFromHeader;
  }

  // Intentar obtener orgId del subdominio
  const host = request.headers.host;
  if (host) {
    const subdomain = host.split('.')[0];
    // Por ahora, usar un orgId por defecto basado en el subdominio
    // TODO: Implementar lógica real de mapeo subdominio -> orgId
    if (subdomain && subdomain !== 'localhost' && subdomain !== '127.0.0.1') {
      return subdomain;
    }
  }

  // Por defecto, usar un orgId de desarrollo
  return process.env.DEFAULT_ORG_ID || 'dev-org';
});
