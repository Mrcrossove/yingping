import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AuditLogService } from './modules/audit-log/audit-log.service';
import { AuditLogInterceptor } from './common/audit-log.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOrigins = process.env.CORS_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean);
  app.enableCors({
    origin: corsOrigins?.length ? corsOrigins : true,
  });
  app.setGlobalPrefix('api');

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('饮品下单系统 API')
    .setDescription('Beverage Order Management System')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  if (process.env.ENABLE_SWAGGER !== 'false') {
    SwaggerModule.setup('api/docs', app, document);
  }

  // Validation
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  // Audit Log
  const auditLogService = app.get(AuditLogService);
  const auditInterceptor = new AuditLogInterceptor();
  auditInterceptor.setService(auditLogService);
  app.useGlobalInterceptors(auditInterceptor);

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
