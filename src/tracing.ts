/**
 * Langfuse OpenTelemetry tracing bootstrap.
 *
 * MUST be imported before anything else in main.ts so that the OTel SDK
 * is registered before any instrumented library (LangChain/LangGraph) loads.
 *
 * dotenv.config() is called here explicitly because this module is imported
 * before NestJS bootstraps (and before @nestjs/config loads the .env file).
 * Without it, LANGFUSE_PUBLIC_KEY / SECRET_KEY would be undefined when
 * LangfuseSpanProcessor initialises.
 */
import * as dotenv from 'dotenv';
dotenv.config(); // ← must run before any Langfuse / OTel import reads env vars

import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseSpanProcessor } from '@langfuse/otel';

const sdk = new NodeSDK({
  spanProcessors: [new LangfuseSpanProcessor()],
});

sdk.start();

// Graceful shutdown – flush all buffered spans before the process exits.
process.on('SIGTERM', async () => {
  await sdk.shutdown();
});
process.on('SIGINT', async () => {
  await sdk.shutdown();
});
