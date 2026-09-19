import { PRIVATE_ROBOTS } from "@/lib/seo/metadata";
export const metadata = {
  title: "Sign in | Localsell",
  robots: PRIVATE_ROBOTS,
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
