import SignCallbackClient from "./sign-callback-client";

type CallbackPageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignCallbackPage({ params, searchParams }: CallbackPageProps) {
  const { token } = await params;
  const query = await searchParams;

  return <SignCallbackClient token={token} query={query} />;
}
