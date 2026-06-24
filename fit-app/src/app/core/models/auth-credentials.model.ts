export interface AuthCredentials {
  email: string;
  password: string;
  /** Optional fitness goal (Fix 4). Maps to API ^(lose|gain|maintain)$.
   *  "improve_fitness" (display-only label) maps to "maintain" until the API
   *  is extended with a 4th value in a future sprint. */
  goal?: string;
}
