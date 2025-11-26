import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const host = url.searchParams.get("host");
  const redirectTo = new URL("/app", url.origin);
  if (host) {
    redirectTo.searchParams.set("host", host);
  }
  return redirect(redirectTo.toString());
}
