// component is intentionally absent — platform/ cannot import from apps/.
// Next.js page files in src/app/(apps)/ handle component rendering.
export interface AppDefinition {
  id: string;
  name: string;
  route: string;
}
