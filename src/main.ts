import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import bodyParser from 'body-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const config = new DocumentBuilder()
    .setTitle('FetchDB')
    .setDescription('The FetchDB api description')
    .setVersion('1.0')
    .addTag('SQL Interpreter over http')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);
  app.use(bodyParser.text());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
