// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: {
				id: string;
				email: string;
				name: string;
				role: 'STUDENT' | 'TRAINER' | 'PLACEMENT_COORDINATOR';
				registerNumber?: string;
				department?: string;
				batch?: string;
				customId?: string;
			} | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
