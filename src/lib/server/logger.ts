import pino from 'pino';

// In development, pretty-print logs to stdout.
// In production, emit newline-delimited JSON (pino default) for log aggregators.
const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
	level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
	...(isDev && {
		transport: {
			target: 'pino/file',
			options: { destination: 1 } // stdout
		}
	})
});
