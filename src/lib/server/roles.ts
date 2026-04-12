/**
 * Returns true if the request is from an admin user.
 * Use this helper in server actions and load functions to gate privileged operations.
 */
export function isAdmin(locals: App.Locals): boolean {
	return locals.isAdmin === true;
}
